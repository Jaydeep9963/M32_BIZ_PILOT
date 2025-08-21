# BizPilot Client

React + Vite + TypeScript frontend for BizPilot. Provides auth flows, chat UI with streaming, document upload, citations, conversations sidebar, and light/dark themes.

## Quick start

```bash
cd client
npm i
npm run dev           # http://localhost:5173
```

Create `client/.env` (optional):

```
VITE_API_URL=http://localhost:4000/api
```

## Scripts

- `npm run dev` – Vite dev server
- `npm run build` – production build
- `npm run preview` – preview built app
- `npm test` – Vitest with coverage (threshold ≥90%)
- `npm run test:watch` – watch mode

## Features

- Sign up / login / logout (Google OAuth supported via server)
- Chat with streaming responses and context per chat
- File attach (PDF, DOCX) with immediate analysis or manual follow‑up
- Web research citations (when TAVILY_API_KEY is set on server)
- Conversations list with New / active highlight / delete
- Sticky composer (textarea) with Shift+Enter for newline
- Improved markdown (GFM) and code highlighting
- Light/dark themes with refined palette

## Testing & coverage

Vitest + Testing Library, enforcing ≥90% coverage (pre‑push hook at repo root will block pushes if thresholds fail).

```bash
npm test
```

## Environment & Integration

- API base defaults to `http://localhost:4000/api` or override via `VITE_API_URL`.
- Server must be running with proper `.env` (see server/README.md).
- For OAuth, set `CLIENT_URL` on the server to this client origin.

## Build & deploy

```bash
npm run build
# Serve the dist/ directory with any static host or behind nginx
```

For a one-box deployment, serve the client separately (static) and run the server on Node; set `VITE_API_URL` to the server’s public `/api` URL.
