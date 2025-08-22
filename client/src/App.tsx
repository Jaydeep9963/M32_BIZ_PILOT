import { useEffect, useMemo, useState, useRef } from 'react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import './App.css'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

type User = { id: string; name: string; email: string }

function useAuth() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  })
  const isAuthed = !!token
  const headers = useMemo(() => ({ 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' }), [token])

  const login = (t: string, u: User) => {
    setToken(t); setUser(u); localStorage.setItem('token', t); localStorage.setItem('user', JSON.stringify(u))
  }
  const logout = () => { setToken(null); setUser(null); localStorage.removeItem('token'); localStorage.removeItem('user') }
  return { isAuthed, user, headers, login, logout }
}

function Signup() {
  const nav = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState<{name?: string; email?: string; password?: string}>({})
  const { login } = useAuth()
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const nextErr: any = {}
    if (!form.name.trim() || form.name.trim().length < 2) nextErr.name = 'Name must be at least 2 characters'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) nextErr.email = 'Enter a valid email address'
    if (form.password.length < 6) nextErr.password = 'Password must be at least 6 characters'
    setErrors(nextErr)
    if (Object.keys(nextErr).length) return
    const res = await fetch(`${API_BASE}/auth/signup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (res.ok) { login(data.token, data.user); nav('/chat') } else alert(data.error?.message || 'Signup failed')
  }
  return (
    <div className="min-h-screen flex items-center justify-center hero">
      <div className="w-full max-w-lg p-8 hero-card">
        <h2 className="text-3xl font-semibold mb-4" style={{color:'var(--text-primary)'}}>Create account</h2>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <input className={`input-base ${errors.name? 'input-error':''}`} placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
          {errors.name && <div className="error-text">{errors.name}</div>}
          <input className={`input-base ${errors.email? 'input-error':''}`} placeholder="Email" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
          {errors.email && <div className="error-text">{errors.email}</div>}
          <input className={`input-base ${errors.password? 'input-error':''}`} placeholder="Password" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} />
          {errors.password && <div className="error-text">{errors.password}</div>}
          <button className="px-4 py-2 rounded btn-primary" type="submit">Sign up</button>
        </form>
        <div className="mt-3">
          <a href={`${API_BASE}/auth/google`}>
            <button className="w-full px-4 py-2 rounded border" style={{borderColor:'var(--panel-border)', color:'var(--text-primary)'}}>Continue with Google</button>
          </a>
        </div>
        <p className="mt-3 text-sm opacity-80" style={{color:'var(--text-primary)'}}>Already have an account? <Link className="text-blue-700 hover:text-blue-600" to="/login">Log in</Link></p>
      </div>
    </div>
  )
}

function Login() {
  const nav = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<{email?: string; password?: string}>({})
  const { login } = useAuth()
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const nextErr: any = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) nextErr.email = 'Enter a valid email address'
    if (!form.password) nextErr.password = 'Password is required'
    setErrors(nextErr)
    if (Object.keys(nextErr).length) return
    const res = await fetch(`${API_BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (res.ok) { login(data.token, data.user); nav('/chat') } else alert(data.error?.message || 'Login failed')
  }
  return (
    <div className="min-h-screen flex items-center justify-center hero">
      <div className="w-full max-w-lg p-8 hero-card">
        <h2 className="text-3xl font-semibold mb-4" style={{color:'var(--text-primary)'}}>Log in</h2>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <input className={`input-base ${errors.email? 'input-error':''}`} placeholder="Email" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
          {errors.email && <div className="error-text">{errors.email}</div>}
          <input className={`input-base ${errors.password? 'input-error':''}`} placeholder="Password" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} />
          {errors.password && <div className="error-text">{errors.password}</div>}
          <button className="px-4 py-2 rounded btn-primary" type="submit">Log in</button>
        </form>
        <div className="mt-3">
          <a href={`${API_BASE}/auth/google`}>
            <button className="w-full px-4 py-2 rounded border" style={{borderColor:'var(--panel-border)', color:'var(--text-primary)'}}>Continue with Google</button>
          </a>
        </div>
        <p className="mt-3 text-sm opacity-80" style={{color:'var(--text-primary)'}}>No account? <Link className="text-blue-700 hover:text-blue-600" to="/signup">Sign up</Link></p>
      </div>
    </div>
  )
}

type Message = { role: 'user' | 'assistant' | 'system' | 'tool', content: string, toolName?: string, createdAt?: string | Date }

function MessageCitations({ content }: { content: string }) {
  const urlRegex = /(https?:\/\/[^\s)\]]+)/g
  const urls = Array.from(new Set(content.match(urlRegex) || [])).slice(0, 5)
  if (!urls.length) return null
  return (
    <div className="mt-2 flex flex-wrap gap-2 text-xs">
      {urls.map((u) => (
        <a key={u} href={u} target="_blank" rel="noreferrer" className="underline text-blue-700 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300">
          Source
        </a>
      ))}
    </div>
  )
}

function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [chatId, setChatId] = useState<string | null>(null)
  const [chats, setChats] = useState<Array<{ _id: string; title: string; updatedAt?: string }>>([])
  const [isThinking, setIsThinking] = useState(false)
  const { headers, logout, isAuthed } = useAuth()
  const nav = useNavigate()
  const [isDarkLocal, setIsDarkLocal] = useState<boolean>(() =>
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : true
  )
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)
  const [stickToBottom, setStickToBottom] = useState(true)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const toggleThemeLocal = () => {
    const root = document.documentElement
    const next = !root.classList.contains('dark')
    if (next) {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
    setIsDarkLocal(next)
  }

  useEffect(() => {
    if (!isAuthed) nav('/login')
  }, [])
  
  useEffect(() => {
    if (!isAuthed) nav('/login')
  }, [isAuthed])

  useEffect(() => {
    // load chat list
    ;(async () => {
      const res = await fetch(`${API_BASE}/chats`, { headers })
      const data = await res.json()
      if (res.ok) setChats(data.chats)
    })()
  }, [])

  const openChat = async (id: string) => {
    setChatId(id)
    const res = await fetch(`${API_BASE}/chats/${id}`, { headers })
    const data = await res.json()
    if (res.ok) setMessages(data.chat.messages)
  }

  const refreshChats = async () => {
    const res = await fetch(`${API_BASE}/chats`, { headers })
    const data = await res.json()
    if (res.ok) setChats(data.chats)
  }

  const createNewChat = async () => {
    // Start a brand-new thread: clear current context first
    const initial = 'New chat started'
    setChatId(null)
    const optimistic: Message[] = [{ role: 'user' as const, content: initial }]
    setMessages(optimistic)
    setIsThinking(true)
    try {
      const res = await fetch(`${API_BASE}/chat/stream`, { method: 'POST', headers, body: JSON.stringify({ chatId: null, message: initial }) })
      if (!res.ok || !res.body) {
        const res2 = await fetch(`${API_BASE}/chat`, { method: 'POST', headers, body: JSON.stringify({ chatId: null, message: initial }) })
        const data2 = await res2.json()
        if (!res2.ok) { setIsThinking(false); return }
        setChatId(data2.chatId)
        setMessages(data2.messages)
        await refreshChats()
        setIsThinking(false)
        return
      }
      const reader = res.body.getReader()
      let assistantBuf = ''
      setMessages(prev => [...prev, { role: 'assistant' as const, content: '' }])
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const text = new TextDecoder().decode(value)
        for (const line of text.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = JSON.parse(line.slice(6))
          if (data.type === 'delta') {
            assistantBuf += data.chunk
            setMessages(prev => {
              const clone = [...prev]
              clone[clone.length-1] = { role: 'assistant', content: assistantBuf }
              return clone
            })
          } else if (data.type === 'done' && data.chatId) {
            setChatId(String(data.chatId))
            await refreshChats()
          }
        }
      }
      setIsThinking(false)
    } catch {
      setIsThinking(false)
    }
  }

  const deleteChat = async (id: string) => {
    const ok = confirm('Delete this conversation?')
    if (!ok) return
    const res = await fetch(`${API_BASE}/chats/${id}`, { method: 'DELETE', headers })
    if (res.ok) {
      if (chatId === id) { setChatId(null); setMessages([]) }
      await refreshChats()
    }
  }

  const send = async () => {
    if (!input.trim()) return
    // Optimistic append of user message
    const optimistic: Message[] = [...messages, { role: 'user' as const, content: input }]
    setMessages(optimistic)
    setInput('')
    setIsThinking(true)
    try {
      const controller = new AbortController()
      const res = await fetch(`${API_BASE}/chat/stream`, { method: 'POST', headers, body: JSON.stringify({ chatId, message: input }), signal: controller.signal })
      if (!res.ok || !res.body) {
        // Fallback to non-stream if stream endpoint fails
        const res2 = await fetch(`${API_BASE}/chat`, { method: 'POST', headers, body: JSON.stringify({ chatId, message: input }) })
        const data2 = await res2.json()
        if (!res2.ok) { if (res2.status===401) logout(); alert(data2.error || 'Error'); return }
        setChatId(data2.chatId)
        setMessages(data2.messages)
        setIsThinking(false)
        return
      }
      const reader = res.body.getReader()
      let assistantBuf = ''
      const newMsgs: Message[] = [...optimistic]
      newMsgs.push({ role: 'assistant' as const, content: '' })
      setMessages(newMsgs)
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const text = new TextDecoder().decode(value)
        for (const line of text.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = JSON.parse(line.slice(6))
          if (data.type === 'delta') {
            assistantBuf += data.chunk
            setMessages(prev => {
              const clone = [...prev]
              clone[clone.length-1] = { role: 'assistant', content: assistantBuf }
              return clone
            })
          }
        }
      }
      setIsThinking(false)
    } catch (e) {
      alert('Stream failed')
      setIsThinking(false)
    }
  }

  const renderToolMessage = (m: Message) => {
    // Expect format: "Document: <filename>\n\n<extracted text>"
    const firstLine = (m.content || '').split('\n', 1)[0]
    const match = firstLine.match(/^Document:\s*(.+)$/)
    const filename = match ? match[1] : 'Attachment'
    const lower = filename.toLowerCase()
    const isPdf = lower.endsWith('.pdf')
    const isDoc = lower.endsWith('.docx') || lower.endsWith('.doc')
    const icon = isPdf ? '📕' : isDoc ? '📘' : '📎'
    return (
      <div className="badge">
        <span aria-hidden>{icon}</span>
        <span className="font-medium">{filename}</span>
        <span className="opacity-70">attached</span>
      </div>
    )
  }

  const attachFile = async (file: File, message?: string) => {
    try {
      const form = new FormData()
      form.append('file', file)
      if (chatId) form.append('chatId', chatId)
      const msg = (message || '').trim()
      if (msg) form.append('message', msg)
      // Defer analysis if the message is empty, so UI can show tool row immediately, then we send a second request to stream
      if (!msg) form.append('analyze', '0')
      const authHeader = headers.Authorization ? { Authorization: headers.Authorization } : {}
      const res = await fetch(`${API_BASE}/upload`, { method: 'POST', headers: authHeader as any, body: form })
      const data = await res.json()
      if (!res.ok) { if (res.status===401) logout(); alert(data.error || 'Upload failed'); return }
      setChatId(data.chatId)
      if (data.messages) {
        setMessages(data.messages)
      } else {
        // Refresh messages to include the tool message
        const resChat = await fetch(`${API_BASE}/chats/${data.chatId}`, { headers })
        const dataChat = await resChat.json()
        if (resChat.ok) setMessages(dataChat.chat.messages)
        // Kick off analysis as a follow-up message for better UX (separate from upload)
        const prompt = 'Summarize the attached document with key points and action items.'
        const res2 = await fetch(`${API_BASE}/chat/stream`, { method: 'POST', headers, body: JSON.stringify({ chatId: data.chatId, message: prompt }) })
        if (res2.ok && res2.body) {
          const reader = res2.body.getReader()
          let assistantBuf = ''
          setMessages(prev => [...prev, { role: 'assistant' as const, content: '' }])
          // stream answer
          while (true) {
            const { value, done } = await reader.read()
            if (done) break
            const text = new TextDecoder().decode(value)
            for (const line of text.split('\n')) {
              if (!line.startsWith('data: ')) continue
              const data = JSON.parse(line.slice(6))
              if (data.type === 'delta') {
                assistantBuf += data.chunk
                setMessages(prev => {
                  const clone = [...prev]
                  clone[clone.length-1] = { role: 'assistant', content: assistantBuf }
                  return clone
                })
              }
            }
          }
        }
      }
    } catch (e) {
      alert('Upload failed')
    }
  }

  // Auto-stick to bottom when the user is near the end; do not interrupt if scrolled up
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const onScroll = () => {
      const threshold = 80
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      setStickToBottom(distanceFromBottom <= threshold)
    }
    el.addEventListener('scroll', onScroll)
    // Initialize stick state
    onScroll()
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (stickToBottom && endRef.current) {
      // Smooth during streaming; instant at message boundary changes can be okay too
      endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [messages, isThinking, stickToBottom])

  return (
    <div className="h-[100dvh] flex flex-col app-base overflow-hidden">
      <nav className="flex items-center px-4 py-2 nav-gradient sticky top-0 z-20">
        <Link to="/" onClick={(e)=>{ if (isAuthed) e.preventDefault(); }} className="flex flex-col leading-tight" style={{color:'var(--text-primary)'}}>
          <span className="font-semibold text-xl">BizPilot</span>
          <span className="text-xs opacity-80">AI business copilot for SMBs</span>
        </Link>
        <div className="flex-1" />
        <button
          className="mr-2 px-3 py-2 rounded border border-white/20 hover:bg-white/10 transition md:hidden"
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Open conversations"
          title="Open conversations"
        >
          ☰
        </button>
        <button
          className="mr-2 px-3 py-2 rounded border border-white/20 hover:bg-white/10 transition"
          onClick={toggleThemeLocal}
          aria-label="Toggle theme"
          title="Toggle theme"
        >
          {isDarkLocal ? '🌙' : '☀️'}
        </button>
        <button className="px-4 py-2 rounded btn-primary" onClick={() => { logout(); nav('/login'); }}>Logout</button>
      </nav>
      {/* Mobile conversations drawer */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-black/40" aria-label="Close" onClick={() => setIsSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[82vw] max-w-xs p-3 overflow-auto" style={{background:'var(--panel-bg)', borderRight: '1px solid var(--panel-border)'}}>
            <div className="flex items-center justify-between mb-2">
              <b style={{color:'var(--text-primary)'}}>Conversations</b>
              <button className="px-2 py-1 rounded border" onClick={createNewChat}>New</button>
            </div>
            <div className="flex flex-col">
              {chats.map(c => {
                const isActive = chatId === c._id
                return (
                  <div key={c._id} className={`flex items-center gap-2 px-2 py-2 border-b`} style={{borderColor:'var(--panel-border)', background: isActive ? 'rgba(37,99,235,0.08)' : 'transparent'}}>
                    <div className="flex-1 min-w-0">
                      <button onClick={()=>{ openChat(c._id); setIsSidebarOpen(false) }} className="text-left w-full truncate" style={{color:'var(--text-primary)'}}>
                        {c.title || 'Untitled'}
                      </button>
                      <div className="text-[10px] opacity-70" style={{color:'var(--text-primary)'}}>{c.updatedAt ? new Date(c.updatedAt).toLocaleString() : ''}</div>
                    </div>
                    <button className="p-1 rounded border" onClick={()=>deleteChat(c._id)} aria-label="Delete" title="Delete">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  </div>
                )
              })}
            </div>
            <div className="mt-3">
              <button className="w-full px-3 py-2 rounded border" onClick={() => setIsSidebarOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-3 overflow-hidden">
        <aside className="hidden md:block border-r border-zinc-800 p-3" style={{background:'var(--panel-bg)'}}>
          <div className="flex items-center justify-between mb-2">
            <b style={{color:'var(--text-primary)'}}>Conversations</b>
            <button className="px-2 py-1 rounded border" onClick={createNewChat}>New</button>
          </div>
          <div className="flex flex-col">
            {chats.map(c => {
              const isActive = chatId === c._id
              return (
                <div key={c._id} className={`flex items-center gap-2 px-2 py-2 border-b`} style={{borderColor:'var(--panel-border)', background: isActive ? 'rgba(37,99,235,0.08)' : 'transparent'}}>
                  <div className="flex-1 min-w-0">
                    <button onClick={()=>openChat(c._id)} className="text-left w-full truncate" style={{color:'var(--text-primary)'}}>
                      {c.title || 'Untitled'}
                    </button>
                    <div className="text-[10px] opacity-70" style={{color:'var(--text-primary)'}}>{c.updatedAt ? new Date(c.updatedAt).toLocaleString() : ''}</div>
                  </div>
                  <button className="p-1 rounded border" onClick={()=>deleteChat(c._id)} aria-label="Delete" title="Delete">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  </button>
                </div>
              )
            })}
          </div>
        </aside>
        <div className="flex flex-col min-h-0 overflow-hidden">
          <div ref={scrollContainerRef} className="flex-1 overflow-auto min-h-0 p-4 pb-24 flex flex-col gap-2">
            {messages.map((m, idx) => (
              <div key={idx} className="flex gap-2">
                <div className="w-24 opacity-70 capitalize text-xs shrink-0" style={{color:'var(--text-primary)'}}>{m.role}
                  <div className="msg-meta">{new Date((m as any).createdAt || Date.now()).toLocaleTimeString()}</div>
                </div>
                <div className={`msg ${m.role==='user' ? 'msg-user' : m.role==='assistant' ? 'msg-assistant' : m.role==='tool' ? 'msg-tool' : 'msg-system'} w-full overflow-x-auto`}>
                  {m.role === 'assistant' && (m.content ?? '') === '' && isThinking ? (
                    <div className="space-y-2 w-full">
                      <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-1/2" />
                      <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-1/3" />
                    </div>
                  ) : m.role === 'tool' && m.toolName === 'file_upload' ? (
                    renderToolMessage(m)
                  ) : (
                    <div>
                      <div className="md">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                          {m.content}
                        </ReactMarkdown>
                      </div>
                      {m.role === 'assistant' && <MessageCitations content={m.content} />}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {messages.length === 0 && !isThinking && (
              <div className="flex flex-col items-center justify-center text-center py-8">
                <div className="text-sm opacity-80" style={{color:'var(--text-primary)'}}>No conversation selected.</div>
                <div className="mt-3 flex gap-2">
                  <button className="px-3 py-2 rounded btn-primary" onClick={createNewChat}>Start new chat</button>
                  <button className="px-3 py-2 rounded border md:hidden" onClick={()=>setIsSidebarOpen(true)} style={{borderColor:'var(--panel-border)', color:'var(--text-primary)'}}>Open conversations</button>
                </div>
              </div>
            )}
            {/* Global fallback loader when no assistant placeholder yet */}
            {isThinking && !(messages[messages.length-1]?.role === 'assistant' && (messages[messages.length-1]?.content ?? '') === '') && (
              <div className="flex gap-2">
                <div className="w-20 opacity-70 capitalize text-sm shrink-0 text-zinc-300">assistant</div>
                <div className="bg-zinc-100 dark:bg-zinc-900 rounded p-3 text-sm w-full overflow-x-auto text-zinc-900 dark:text-zinc-100">
                  <div className="space-y-2 w-full">
                    <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-1/2" />
                    <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-1/3" />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
          <div className="flex gap-2 p-3 composer pb-[env(safe-area-inset-bottom)] sticky bottom-0 z-10">
            <textarea className="textbox" value={input} onChange={e=>setInput(e.target.value)} placeholder="Type your message..." onKeyDown={e=>{ if(e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
            <button className="px-4 py-2 rounded btn-primary disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2" onClick={send} disabled={isThinking}>
              {isThinking && <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Send
            </button>
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={e=>{ const f=e.target.files?.[0]; if (f) { const msg = input.trim(); attachFile(f, msg); if (msg) setInput(''); e.currentTarget.value=''; } }} />
            <button className="btn-outline" onClick={()=>fileInputRef.current?.click()} title="Attach a PDF or DOCX. Shift+Enter for newline.">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.2a6 6 0 1 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 1 1-2.83-2.83l8.49-8.48"/></svg>
              Attach
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center hero">
      <div className="max-w-2xl p-8 text-center hero-card">
        <h1 className="text-4xl md:text-5xl font-bold" style={{color:'var(--text-primary)'}}>BizPilot</h1>
        <p className="mt-3 text-base md:text-lg opacity-80" style={{color:'var(--text-primary)'}}>Your AI business copilot for SMB owners.</p>
        <div className="mt-8 flex gap-4 justify-center">
          <Link to="/signup"><button className="px-4 py-2 rounded border border-blue-600 bg-blue-600 hover:bg-blue-500 transition text-white">Get Started</button></Link>
          <Link to="/login"><button className="px-4 py-2 rounded border" style={{borderColor:'var(--panel-border)', color:'var(--text-primary)'}}>Log in</button></Link>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [dark] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [dark])

  return (
    <div>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/oauth-callback" element={<OAuthCallback />} />
        <Route path="/chat" element={<Chat />} />
      </Routes>
    </div>
  )
}

function OAuthCallback() {
  const nav = useNavigate()
  const { login } = useAuth()
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    const name = params.get('name') || ''
    const email = params.get('email') || ''
    if (token && email) {
      login(token, { id: 'me', name, email })
      // Force a hard navigation to ensure fresh auth state across components
      window.location.replace('/chat')
    } else {
      nav('/login')
    }
  }, [])
  return <div className="container">Signing you in…</div>
}
