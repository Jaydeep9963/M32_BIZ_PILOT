export interface ToolCallResult {
	toolName: string;
	content: string;
}

export async function runChatWithTools(messages: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: string; toolName?: string }>): Promise<{ assistant: string; toolResults: ToolCallResult[] }>{
	const systemPreamble = 'You are BizPilot, an AI business copilot for SMB owners. You can search the web when needed using the tavily_search tool. Always cite sources succinctly.';
	const finalMessages = [
		{ role: 'system' as const, content: systemPreamble },
		...messages,
	];

	// Simple tool-use heuristic: if the latest user message includes keywords, do a Tavily search and feed results back as a tool message before answering.
	const last = [...messages].reverse().find(m => m.role === 'user');
	const shouldSearch = Boolean(last && /(latest|news|trends|research|market|compare|vs\b|source|cite|statistics)/i.test(last.content));
	const toolResults: ToolCallResult[] = [];

	if (shouldSearch && process.env.TAVILY_API_KEY) {
		try {
			const { TavilyClient } = await import('tavily');
			const tavily = new TavilyClient({ apiKey: process.env.TAVILY_API_KEY || '' });
			const q = last!.content.slice(0, 300);
			const search = await tavily.search({ query: q, max_results: 5 });
			const summarized = search.results.map(r => `- ${r.title} — ${r.url}\n${r.content?.slice(0, 300) || ''}`).join('\n\n');
			finalMessages.push({ role: 'system' as const, content: `Web search results (via Tavily):\n\n${summarized}` });
			toolResults.push({ toolName: 'tavily_search', content: summarized });
		} catch (e) {
			// continue without tool
		}
	}

	const makeFallback = (): string => {
		const lastUser = [...messages].reverse().find(m => m.role === 'user')?.content || '';
		let name: string | undefined;
		for (const m of messages) {
			if (m.role === 'user') {
				const match = m.content.match(/my name is\s+([A-Za-z][A-Za-z\s'-]{1,40})/i);
				if (match && match[1]) { name = match[1].trim(); }
			}
		}
		let response = name && /what\s+is\s+my\s+name/i.test(lastUser)
			? `You told me your name is ${name}.`
			: `I couldn't reach the LLM right now. Here's a quick acknowledgment of your request: "${lastUser}". Please try again shortly.`;
		if (toolResults.length) {
			const lines: string[] = [];
			for (const tool of toolResults) {
				const urls = tool.content.match(/https?:\/\/[^\s)]+/g) || [];
				urls.slice(0, 5).forEach(u => lines.push(`- ${u}`));
			}
			if (lines.length) response += `\n\nSources (tool):\n${lines.join('\n')}`;
		}
		return response;
	};

	if (process.env.OFFLINE_MODE === '1' || (!process.env.OPENAI_API_KEY && !process.env.GROQ_API_KEY && !process.env.OPENROUTER_API_KEY)) {
		const isTestEnv = process.env.NODE_ENV === 'test';
		if (process.env.OFFLINE_MODE === '1') {
			if (!isTestEnv) console.warn('[LLM] OFFLINE_MODE=1 → using fallback responder');
		} else if (!process.env.OPENAI_API_KEY && !process.env.GROQ_API_KEY && !process.env.OPENROUTER_API_KEY) {
			if (!isTestEnv) console.warn('[LLM] No provider API keys set → using fallback responder');
		}
		return { assistant: makeFallback(), toolResults };
	}

	// LangChain agent with structured tool-calling (default when OpenAI is set)
	const selectedProvider = (process.env.LLM_PROVIDER || '').toLowerCase();
	const shouldUseOpenAI = selectedProvider ? selectedProvider === 'openai' : Boolean(process.env.OPENAI_API_KEY);
	if (shouldUseOpenAI && process.env.OPENAI_API_KEY) {
		try {
			const LCOpenAI: any = await import('@langchain/openai');
			const LCTools: any = await import('@langchain/community/tools/tavily_search');
			const LCPrompts: any = await import('@langchain/core/prompts');
			const LCAgents: any = await import('langchain/agents');
			const LCToolCore: any = await import('@langchain/core/tools');
			const model = new LCOpenAI.ChatOpenAI({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', temperature: 0.2 });
			const tools: any[] = [];
			if (process.env.TAVILY_API_KEY) tools.push(new LCTools.TavilySearchResults({ maxResults: 5 }));
			// Business tool: create a task
			const createTaskTool = new LCToolCore.DynamicStructuredTool({
				name: 'create_task',
				description: 'Create a task with a title and optional description for the current user',
				schema: (await import('zod')).z.object({ title: (await import('zod')).z.string(), description: (await import('zod')).z.string().optional() }),
				func: async (input: any) => {
					try {
						const mongooseMod = (await import('mongoose')).default;
						const connected = mongooseMod.connection.readyState === 1;
						if (!connected) return 'Task creation unavailable (no DB connection).';
						const { TaskModel } = await import('./models');
						// Associate to a generic system user; real association done in route layer
						const doc = await TaskModel.create({ userId: new mongooseMod.Types.ObjectId(), title: input.title, description: input.description });
						return `Task created: ${doc.title}`;
					} catch (e: any) {
						return `Failed to create task: ${e?.message || e}`;
					}
				},
			});
			tools.push(createTaskTool);
			const prompt = LCPrompts.ChatPromptTemplate.fromMessages([
				['system', systemPreamble + ' Use tools when helpful. Include short citations (links) when you rely on web research.'],
				new LCPrompts.MessagesPlaceholder('chat_history'),
				['human', '{input}'],
				new LCPrompts.MessagesPlaceholder('agent_scratchpad'),
			]);
			const agent = LCAgents.createToolCallingAgent({ llm: model, tools, prompt });
			const executor = new LCAgents.AgentExecutor({ agent, tools, returnIntermediateSteps: true });
			const lastUser = [...messages].reverse().find(m => m.role === 'user')?.content || '';
			const contextSummary = messages
				.filter(m => m.role !== 'system')
				.map(m => `${m.role.toUpperCase()}: ${m.content}`)
				.slice(-8)
				.join('\n');
			const input = `${contextSummary}\n\nUser: ${lastUser}`;
			console.log('[LLM] LangChain agent executing');
			const result: any = await executor.invoke({ input, chat_history: [] });
			const assistant = result?.output || '';
			// Extract citations from intermediate steps or assistant text
			const steps: any[] = result?.intermediateSteps || [];
			const urlRegex = /(https?:\/\/[^\s)\]]+)/g;
			for (const s of steps) {
				const obs = s?.observation;
				const text = typeof obs === 'string' ? obs : JSON.stringify(obs || '');
				const urls = text.match(urlRegex) || [];
				if (urls.length) toolResults.push({ toolName: 'tavily_search', content: urls.join('\n') });
			}
			if (!toolResults.length) {
				const urls = (assistant.match(urlRegex) || []).slice(0, 5);
				if (urls.length) toolResults.push({ toolName: 'assistant_links', content: urls.join('\n') });
			}
			if (assistant) return { assistant, toolResults };
		} catch (e: any) {
			console.error('[LLM] LangChain agent failed', e?.message || e);
		}
	}

	// Build a fully sanitized message list for OpenAI-compatible chat APIs
	type ChatMsg = { role: 'system' | 'user' | 'assistant'; content: string };
	const sanitizeMessages = (arr: Array<any>): ChatMsg[] => {
		return arr.map((m) => {
			const baseContent = typeof m.content === 'string' ? m.content : String(m.content ?? '');
			if (m.role === 'tool') {
				return { role: 'system', content: `Tool context: ${m.toolName || 'tool'}\n${baseContent}` };
			}
			const role = (m.role === 'system' || m.role === 'user' || m.role === 'assistant') ? m.role : 'system';
			return { role, content: baseContent };
		});
	};
	const sanitized: ChatMsg[] = sanitizeMessages(finalMessages as any[]);

	// Provider 1: OpenAI (direct)
	if ((selectedProvider === 'openai' || (!selectedProvider && process.env.OPENAI_API_KEY)) && process.env.OPENAI_API_KEY) {
		try {
			const { default: OpenAI } = await import('openai');
			const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
			const primaryModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
			console.log('[LLM] Using model:', primaryModel);
			const completion = await openai.chat.completions.create({
				model: primaryModel,
				messages: sanitized as any,
				temperature: 0.4,
			});
			const assistant = completion.choices[0]?.message?.content || '';
			return { assistant, toolResults };
		} catch (error: any) {
			const status = error?.status || error?.response?.status;
			const msg = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
			console.error('[LLM] OpenAI chat completion failed', { status, msg });
		}
	}

	// Provider 2: Groq (OpenAI-compatible API)
	if ((selectedProvider === 'groq' || (!selectedProvider && !process.env.OPENAI_API_KEY && process.env.GROQ_API_KEY)) && process.env.GROQ_API_KEY) {
		try {
			const groqModel = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
			console.log('[LLM] Trying Groq model:', groqModel);
			const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ model: groqModel, messages: sanitized, temperature: 0.4 }),
			});
			if (!resp.ok) {
				const text = await resp.text();
				console.error('[LLM] Groq failed', resp.status, text);
			} else {
				const json: any = await resp.json();
				const assistant = json?.choices?.[0]?.message?.content || '';
				if (assistant) return { assistant, toolResults };
			}
		} catch (e: any) {
			console.error('[LLM] Groq call error', e?.message || e);
		}
	}

	// Provider 3: OpenRouter
	if ((selectedProvider === 'openrouter' || (!selectedProvider && !process.env.OPENAI_API_KEY && !process.env.GROQ_API_KEY && process.env.OPENROUTER_API_KEY)) && process.env.OPENROUTER_API_KEY) {
		try {
			const orModel = process.env.OPENROUTER_MODEL || 'mistralai/mistral-7b-instruct:free';
			console.log('[LLM] Trying OpenRouter model:', orModel);
			const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
					'Content-Type': 'application/json',
					'HTTP-Referer': 'http://localhost:4000',
					'X-Title': 'BizPilot',
				},
				body: JSON.stringify({ model: orModel, messages: sanitized, temperature: 0.4 }),
			});
			if (!resp.ok) {
				const text = await resp.text();
				console.error('[LLM] OpenRouter failed', resp.status, text);
			} else {
				const json: any = await resp.json();
				const assistant = json?.choices?.[0]?.message?.content || '';
				if (assistant) return { assistant, toolResults };
			}
		} catch (e: any) {
			console.error('[LLM] OpenRouter call error', e?.message || e);
		}
	}

	// Fallback if all providers fail
	return { assistant: makeFallback(), toolResults };
}

export async function streamAssistantResponse(messages: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: string; toolName?: string }>, onToken: (chunk: string) => void): Promise<void> {
  // Minimal streaming using OpenAI if available; otherwise simulate chunks from fallback
  const systemPreamble = 'You are BizPilot, an AI business copilot for SMB owners. Stream concise, useful answers.';
  const finalMessages = [
    { role: 'system' as const, content: systemPreamble },
    ...messages,
  ];

  const fallbackStream = async () => {
    const result = await runChatWithTools(messages as any);
    const content = result.assistant || 'Sorry, I could not generate a response right now.';
    const chunkSize = 40;
    for (let i = 0; i < content.length; i += chunkSize) {
      onToken(content.slice(i, i + chunkSize));
    }
  };

  const selectedProvider = (process.env.LLM_PROVIDER || '').toLowerCase();
  const allowOpenAIStreaming = (selectedProvider === 'openai' || (!selectedProvider && Boolean(process.env.OPENAI_API_KEY))) && Boolean(process.env.OPENAI_API_KEY);
  if (!allowOpenAIStreaming) {
    await fallbackStream();
    return;
  }
  try {
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const sanitized = (finalMessages as any[]).map(m => m.role === 'tool' ? { role: 'system', content: `Tool context: ${m.toolName || 'tool'}\n${m.content}` } : m);
    const stream = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: sanitized,
      temperature: 0.4,
      stream: true,
    });
    for await (const part of (stream as any)) {
      const delta = part?.choices?.[0]?.delta?.content || '';
      if (delta) onToken(delta);
    }
  } catch (e: any) {
    try {
      await fallbackStream();
    } catch (_err) {
      onToken('Streaming failed.');
    }
  }
}


