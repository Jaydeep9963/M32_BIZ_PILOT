import { Router, Request, Response } from 'express';
import multer from 'multer';
import passport from 'passport';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { ChatModel, UserModel, TaskModel } from './models';
import { requireAuth, signJwt } from './auth';
import { runChatWithTools, streamAssistantResponse } from './llm';

export const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const signupSchema = z.object({
	name: z.string().min(2),
	email: z.string().email(),
	password: z.string().min(6),
});

router.post('/auth/signup', async (req: Request, res: Response) => {
	const parsed = signupSchema.safeParse(req.body);
	if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
	const { name, email, password } = parsed.data;
	const mongoConnected = mongoose.connection.readyState === 1;
	if (!mongoConnected) {
		// In-memory users for tests/offline
		// @ts-ignore
		if (!global.__MEM_USERS__) global.__MEM_USERS__ = new Map();
		// @ts-ignore
		const users: Map<string, any> = global.__MEM_USERS__;
		if (users.has(email)) return res.status(409).json({ error: 'Email already registered' });
		const passwordHash = await bcrypt.hash(password, 10);
		const user = { _id: Math.random().toString(36).slice(2), name, email, passwordHash, createdAt: new Date() };
		users.set(email, user);
		const token = signJwt({ id: String(user._id), email });
		return res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
	}
	const existing = await UserModel.findOne({ email });
	if (existing) return res.status(409).json({ error: 'Email already registered' });
	const passwordHash = await bcrypt.hash(password, 10);
	const user = await UserModel.create({ name, email, passwordHash });
	const token = signJwt({ id: String(user._id), email });
	return res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
});

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });
router.post('/auth/login', async (req: Request, res: Response) => {
	const parsed = loginSchema.safeParse(req.body);
	if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
	const { email, password } = parsed.data;
	const mongoConnected = mongoose.connection.readyState === 1;
	if (!mongoConnected) {
		// @ts-ignore
		const users: Map<string, any> = global.__MEM_USERS__ || new Map();
		// @ts-ignore
		global.__MEM_USERS__ = users;
		const user = users.get(email);
		if (!user) return res.status(401).json({ error: 'Invalid credentials' });
		const ok = await bcrypt.compare(password, user.passwordHash);
		if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
		const token = signJwt({ id: String(user._id), email });
		return res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
	}
	const user = await UserModel.findOne({ email });
	if (!user) return res.status(401).json({ error: 'Invalid credentials' });
	const ok = await bcrypt.compare(password, user.passwordHash);
	if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
	const token = signJwt({ id: String(user._id), email });
	return res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
});

router.get('/me', requireAuth, async (req: Request, res: Response) => {
	// @ts-ignore
	const authUser = req.user as { id: string; email: string };
	const mongoConnected = mongoose.connection.readyState === 1;
	if (!mongoConnected) {
		// @ts-ignore
		const users: Map<string, any> = global.__MEM_USERS__ || new Map();
		const found = Array.from(users.values()).find((u: any) => String(u._id) === authUser.id || u.email === authUser.email);
		return res.json({ user: found ? { _id: found._id, name: found.name, email: found.email, createdAt: found.createdAt } : null });
	}
	const user = await UserModel.findById(authUser.id).select('_id name email createdAt');
	return res.json({ user });
});

// Google OAuth
router.get('/auth/google', (req, res, next) => {
  // If strategy not configured, return a helpful error
  // @ts-ignore
  if (!passport._strategy || !passport._strategy('google')) {
    console.warn('[OAuth] /auth/google requested but Google strategy is not configured');
    return res.status(503).json({ error: 'Google OAuth not configured. Set GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET.' });
  }
  console.log('[OAuth] Starting Google auth flow');
  // @ts-ignore
  return passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});

router.get('/auth/google/callback', (req: Request, res: Response, next) => {
  // @ts-ignore
  if (!passport._strategy || !passport._strategy('google')) {
    console.warn('[OAuth] Callback hit but Google strategy is not configured');
    return res.status(503).json({ error: 'Google OAuth not configured. Set GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET.' });
  }
  console.log('[OAuth] Handling Google callback (custom)');
  // Use custom callback to control redirects
  // @ts-ignore
  passport.authenticate('google', { session: false }, (err: any, user: any, _info: any) => {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    if (err || !user) {
      console.warn('[OAuth] Authentication failed:', err || 'no user');
      return res.redirect(`${clientUrl}/login?oauth=failed`);
    }
    const token = user?.token;
    console.log('[OAuth] Callback complete. User:', { id: user?.id, email: user?.email, hasToken: Boolean(token) });
    if (!token) {
      return res.redirect(`${clientUrl}/login?oauth=failed`);
    }
    const redirect = `${clientUrl}/oauth-callback?token=${encodeURIComponent(token)}&name=${encodeURIComponent(user?.name || '')}&email=${encodeURIComponent(user?.email || '')}`;
    console.log('[OAuth] Redirecting to:', redirect);
    return res.redirect(redirect);
  })(req, res, next);
});

// Chat routes
const upsertChatSchema = z.object({
	chatId: z.string().nullable().optional(),
	message: z.string().min(1),
});

router.post('/chat', requireAuth, async (req: Request, res: Response) => {
	const parsed = upsertChatSchema.safeParse(req.body);
	if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
	const { chatId, message } = parsed.data;
	const chatIdValue = chatId ?? undefined;
	// @ts-ignore
	const authUser = req.user as { id: string };

	// If Mongo is connected use DB, otherwise fall back to in-memory session store
	const mongoConnected = mongoose.connection.readyState === 1;
	if (!mongoConnected) {
		// Minimal ephemeral store scoped to process lifetime
		// @ts-ignore
		if (!global.__MEM_CHATS__) {
			// @ts-ignore
			global.__MEM_CHATS__ = new Map(); // Map<userId, Map<chatId, { _id, title, messages }>>
		}
		// @ts-ignore
		const userChats: Map<string, any> = global.__MEM_CHATS__.get(authUser.id) || new Map();
		// @ts-ignore
		global.__MEM_CHATS__.set(authUser.id, userChats);

		let mem = chatIdValue ? userChats.get(chatIdValue) : null;
		if (!mem) {
			const newId = Math.random().toString(36).slice(2);
			mem = { _id: newId, title: message.slice(0, 60), messages: [] as any[], updatedAt: new Date() };
			userChats.set(newId, mem);
		}
		mem.messages.push({ role: 'user', content: message, createdAt: new Date() });
		const { assistant, toolResults } = await runChatWithTools(mem.messages as any);
		mem.messages.push({ role: 'assistant', content: assistant, createdAt: new Date() });
		mem.updatedAt = new Date();
		return res.json({ chatId: mem._id, messages: mem.messages, toolResults });
	}

	let chat = chatIdValue ? await ChatModel.findOne({ _id: chatIdValue, userId: authUser.id }) : null;
	if (!chat) {
		chat = await ChatModel.create({ userId: authUser.id, title: message.slice(0, 60), messages: [] });
	}
	chat.messages.push({ role: 'user', content: message, createdAt: new Date() });
	const { assistant, toolResults } = await runChatWithTools(chat.messages as any);
	chat.messages.push({ role: 'assistant', content: assistant, createdAt: new Date() });
	await chat.save();
	return res.json({ chatId: chat._id, messages: chat.messages, toolResults });
});

router.post('/chat/stream', requireAuth, async (req: Request, res: Response) => {
  const parsed = upsertChatSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { chatId, message } = parsed.data;
  const chatIdValue = chatId ?? undefined;
  // @ts-ignore
  const authUser = req.user as { id: string };

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const send = (data: any) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    // Load or create chat
    const mongooseMod = (await import('mongoose')).default;
    const mongoConnected = mongooseMod.connection.readyState === 1;
    let history: any[] = [];
    let chatDoc: any = null;
    if (mongoConnected) {
      const { ChatModel } = await import('./models');
      chatDoc = chatIdValue ? await ChatModel.findOne({ _id: chatIdValue, userId: authUser.id }) : null;
      if (!chatDoc) {
        chatDoc = await ChatModel.create({ userId: authUser.id, title: message.slice(0,60), messages: [] });
      }
      history = chatDoc.messages as any[];
    } else {
      // in-memory
      // @ts-ignore
      if (!global.__MEM_CHATS__) global.__MEM_CHATS__ = new Map();
      // @ts-ignore
      const userChats: Map<string, any> = global.__MEM_CHATS__.get(authUser.id) || new Map();
      // @ts-ignore
      global.__MEM_CHATS__.set(authUser.id, userChats);
      if (chatIdValue && userChats.has(chatIdValue)) {
        chatDoc = userChats.get(chatIdValue);
      } else {
        const newId = Math.random().toString(36).slice(2);
        chatDoc = { _id: newId, userId: authUser.id, title: message.slice(0,60), messages: [], updatedAt: new Date() };
        userChats.set(newId, chatDoc);
      }
      history = chatDoc.messages as any[];
    }

    // Append user message and stream assistant
    history.push({ role: 'user', content: message, createdAt: new Date() });
    let assistantFull = '';
    await streamAssistantResponse(history as any, (chunk) => {
      assistantFull += chunk;
      send({ type: 'delta', chunk });
    });

    // Persist assistant message
    history.push({ role: 'assistant', content: assistantFull, createdAt: new Date() });
    if (mongoConnected && chatDoc?.save) {
      await chatDoc.save();
    } else if (chatDoc) {
      chatDoc.updatedAt = new Date();
    }

    send({ type: 'done', chatId: String(chatDoc?._id || chatIdValue || '') });
    res.end();
  } catch (e: any) {
    send({ type: 'error', error: e?.message || 'stream failed' });
    res.end();
  }
});

router.get('/chats', requireAuth, async (req: Request, res: Response) => {
	// @ts-ignore
	const authUser = req.user as { id: string };
	const mongoConnected = mongoose.connection.readyState === 1;
	if (!mongoConnected) {
		// @ts-ignore
		const userChats: Map<string, any> | undefined = global.__MEM_CHATS__?.get(authUser.id);
		const chats = userChats ? Array.from(userChats.values()).map(c => ({ _id: c._id, title: c.title, updatedAt: c.updatedAt })) : [];
		return res.json({ chats });
	}
	const chats = await ChatModel.find({ userId: authUser.id }).select('_id title updatedAt').sort({ updatedAt: -1 });
	return res.json({ chats });
});

router.get('/chats/:id', requireAuth, async (req: Request, res: Response) => {
	// @ts-ignore
	const authUser = req.user as { id: string };
	const mongoConnected = mongoose.connection.readyState === 1;
	if (!mongoConnected) {
		// @ts-ignore
		const chat = global.__MEM_CHATS__?.get(authUser.id)?.get(req.params.id);
		if (!chat) return res.status(404).json({ error: 'Not found' });
		return res.json({ chat });
	}
	const chat = await ChatModel.findOne({ _id: req.params.id, userId: authUser.id });
	if (!chat) return res.status(404).json({ error: 'Not found' });
	return res.json({ chat });
});

// Rename chat
router.patch('/chats/:id', requireAuth, async (req: Request, res: Response) => {
	// @ts-ignore
	const authUser = req.user as { id: string };
	const title = String((req.body?.title as string | undefined) || '').trim();
	if (!title) return res.status(400).json({ error: 'Title is required' });
	const mongoConnected = mongoose.connection.readyState === 1;
	if (!mongoConnected) {
		// @ts-ignore
		const userChats: Map<string, any> | undefined = global.__MEM_CHATS__?.get(authUser.id);
		const mem = userChats?.get(String(req.params.id));
		if (!mem) return res.status(404).json({ error: 'Not found' });
		mem.title = title;
		mem.updatedAt = new Date();
		return res.json({ ok: true });
	}
	const chat = await ChatModel.findOne({ _id: req.params.id, userId: authUser.id });
	if (!chat) return res.status(404).json({ error: 'Not found' });
	chat.title = title;
	await chat.save();
	return res.json({ ok: true });
});

// Delete chat
router.delete('/chats/:id', requireAuth, async (req: Request, res: Response) => {
	// @ts-ignore
	const authUser = req.user as { id: string };
	const mongoConnected = mongoose.connection.readyState === 1;
	if (!mongoConnected) {
		// @ts-ignore
		const userChats: Map<string, any> | undefined = global.__MEM_CHATS__?.get(authUser.id);
		if (!userChats || !userChats.has(String(req.params.id))) return res.status(404).json({ error: 'Not found' });
		userChats.delete(String(req.params.id));
		return res.json({ ok: true });
	}
	const chat = await ChatModel.findOne({ _id: req.params.id, userId: authUser.id });
	if (!chat) return res.status(404).json({ error: 'Not found' });
	await chat.deleteOne();
	return res.json({ ok: true });
});

// Simple business workflow: tasks
const taskSchema = z.object({ title: z.string().min(2), description: z.string().optional() })
router.post('/tasks', requireAuth, async (req: Request, res: Response) => {
  const parsed = taskSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  // @ts-ignore
  const authUser = req.user as { id: string }
  const task = await TaskModel.create({ userId: authUser.id, title: parsed.data.title, description: parsed.data.description })
  return res.json({ task })
})
router.get('/tasks', requireAuth, async (req: Request, res: Response) => {
  // @ts-ignore
  const authUser = req.user as { id: string }
  const tasks = await TaskModel.find({ userId: authUser.id }).sort({ createdAt: -1 })
  return res.json({ tasks })
})

// Upload documents (PDF/DOCX) and attach extracted text as a tool message
router.post('/upload', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const authUser = req.user as { id: string }
    const file = (req as any).file as Express.Multer.File | undefined
    if (!file) return res.status(400).json({ error: 'No file uploaded' })
    const chatId = (req.body?.chatId as string | undefined) || undefined
    const userMessage = String((req.body?.message as string | undefined) || '').trim()
    const buf = file.buffer
    const mime = file.mimetype
    let extracted = ''
    if (/pdf$/i.test(file.originalname) || mime === 'application/pdf') {
      try {
        const pdfParse = (await import('pdf-parse')).default
        const parsed = await pdfParse(buf as any)
        extracted = parsed.text || ''
      } catch (_e) {
        // Fallback to pdfjs-dist parsing for edge-case PDFs
        try {
          const pdfjsLib: any = await import('pdfjs-dist')
          const { getDocument } = (pdfjsLib as any)
          const loadingTask = getDocument({ data: new Uint8Array(buf) })
          const pdf = await loadingTask.promise
          let full = ''
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum)
            const content = await page.getTextContent()
            const strings: string[] = content.items.map((it: any) => (it.str || ''))
            full += strings.join(' ') + '\n'
          }
          extracted = full
        } catch (e2: any) {
          return res.status(400).json({ error: `Failed to parse PDF: ${e2?.message || 'unknown'}` })
        }
      }
    } else if (/docx$/i.test(file.originalname) || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const mammoth = await import('mammoth')
      const result: any = await (mammoth as any).extractRawText({ buffer: buf })
      extracted = result?.value || ''
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Use PDF or DOCX.' })
    }
    extracted = extracted.trim().slice(0, 15000)

    const mongooseMod = (await import('mongoose')).default
    const mongoConnected = mongooseMod.connection.readyState === 1
    // Analyze switch (default on). Client can send analyze=0 to skip and stream separately
    const analyzeRaw = String((req.body?.analyze as any) ?? '1')
    const shouldAnalyze = !/^(0|false|no)$/i.test(analyzeRaw)

    if (mongoConnected) {
      const { ChatModel } = await import('./models')
      let chatDoc = chatId ? await ChatModel.findOne({ _id: chatId, userId: authUser.id }) : null
      if (!chatDoc) chatDoc = await ChatModel.create({ userId: authUser.id, title: file.originalname, messages: [] })
      chatDoc.messages.push({ role: 'tool', toolName: 'file_upload', content: `Document: ${file.originalname}\n\n${extracted}`, createdAt: new Date() })
      if (!shouldAnalyze) {
        await chatDoc.save()
        return res.json({ ok: true, chatId: String(chatDoc._id), filename: file.originalname, bytes: buf.length, chars: extracted.length })
      }
      // Analyze now
      const prompt = userMessage || 'Summarize the attached document with key points and action items.'
      chatDoc.messages.push({ role: 'user', content: prompt, createdAt: new Date() })
      const { assistant, toolResults } = await runChatWithTools(chatDoc.messages as any)
      chatDoc.messages.push({ role: 'assistant', content: assistant, createdAt: new Date() })
      await chatDoc.save()
      return res.json({ chatId: String(chatDoc._id), messages: chatDoc.messages, toolResults })
    }
    // in-memory fallback
    // @ts-ignore
    if (!global.__MEM_CHATS__) global.__MEM_CHATS__ = new Map()
    // @ts-ignore
    const userChats: Map<string, any> = global.__MEM_CHATS__.get(authUser.id) || new Map()
    // @ts-ignore
    global.__MEM_CHATS__.set(authUser.id, userChats)
    let mem = chatId ? userChats.get(chatId) : null
    if (!mem) {
      const newId = Math.random().toString(36).slice(2)
      mem = { _id: newId, userId: authUser.id, title: file.originalname, messages: [], updatedAt: new Date() }
      userChats.set(newId, mem)
    }
    mem.messages.push({ role: 'tool', toolName: 'file_upload', content: `Document: ${file.originalname}\n\n${extracted}`, createdAt: new Date() })
    mem.updatedAt = new Date()
    if (!shouldAnalyze) {
      return res.json({ ok: true, chatId: mem._id, filename: file.originalname, bytes: buf.length, chars: extracted.length })
    }
    const prompt = userMessage || 'Summarize the attached document with key points and action items.'
    mem.messages.push({ role: 'user', content: prompt, createdAt: new Date() })
    const { assistant, toolResults } = await runChatWithTools(mem.messages as any)
    mem.messages.push({ role: 'assistant', content: assistant, createdAt: new Date() })
    return res.json({ chatId: mem._id, messages: mem.messages, toolResults })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Upload failed' })
  }
})


