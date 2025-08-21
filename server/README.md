# BizPilot Server

Node/Express TypeScript backend providing authentication, chat APIs, document ingestion, and LLM provider routing.

## Quick start

```bash
cd server
npm i
npm run dev            # http://localhost:4000
```

Create a `.env` based on the variables below.

## Environment variables (.env)

- PORT=4000
- CLIENT_URL=http://localhost:5173
- SESSION_SECRET=dev-session
- MONGO_URI=mongodb://127.0.0.1:27017/yourdb
- OFFLINE_MODE=0
- LLM_PROVIDER=openai|groq|openrouter
- OPENAI_API_KEY=...
- OPENAI_MODEL=gpt-4o-mini (optional)
- GROQ_API_KEY=... (optional)
- GROQ_MODEL=llama-3.1-8b-instant (optional)
- OPENROUTER_API_KEY=... (optional)
- OPENROUTER_MODEL=mistralai/mistral-7b-instruct:free (optional)
- TAVILY_API_KEY=... (optional, enables web citations)
- GOOGLE_CLIENT_ID=... (optional)
- GOOGLE_CLIENT_SECRET=... (optional)

## Scripts

- `npm run dev`: ts-node + nodemon
- `npm test`: Jest with coverage
- `npm run build && npm start`: production build

## APIs (prefix /api)

- `POST /auth/signup` { name, email, password }
- `POST /auth/login` { email, password }
- `GET /me` (Bearer)
- `GET /auth/google` → Google OAuth
- `POST /chat` (Bearer) { chatId?, message }
- `POST /chat/stream` (SSE) (Bearer) { chatId?, message }
- `GET /chats` (Bearer)
- `GET /chats/:id` (Bearer)
- `PATCH /chats/:id` (Bearer) { title }
- `DELETE /chats/:id` (Bearer)
- `POST /upload` (Bearer, multipart/form-data)
  - file: PDF/DOCX
  - chatId?: existing chat id
  - message?: optional prompt to run with the uploaded doc
  - analyze?: '0' to skip immediate analysis (client can stream separately)
- `GET /tasks`, `POST /tasks` (example business tool)

## LLM routing

Select provider with `LLM_PROVIDER`. If a provider call fails, the code attempts configured fallbacks, then a local offline responder (if `OFFLINE_MODE=1`). LangChain agent prompt includes the required `agent_scratchpad` placeholder.

## Tests & coverage

`npm test` runs Jest. The root pre-push hook runs server and client tests and enforces ≥90% coverage on the client.

## Deployment notes

- Set `CLIENT_URL` to your deployed client origin
- Put behind nginx; forward `X-Forwarded-*`
- Persist MongoDB (Atlas or Docker volume)
- Use https and secure cookies in production
