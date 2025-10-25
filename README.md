# M32 BizPilot

A full-stack AI-powered business assistant application with document analysis, web research capabilities, and multi-provider LLM support.

## 🚀 Overview

BizPilot is an intelligent chat application that combines conversational AI with document processing and web research capabilities. It features authentication, real-time streaming responses, document ingestion (PDF/DOCX), citation-backed answers, and flexible LLM provider routing.

## ✨ Features

### Core Features
- 🤖 **Multi-Provider LLM Support** - OpenAI, Groq, and OpenRouter with automatic fallback
- 💬 **Real-time Streaming Chat** - Server-sent events for streaming AI responses
- 📄 **Document Analysis** - Upload and analyze PDF and DOCX files
- 🔍 **Web Research** - Citations from web sources using Tavily API
- 💾 **Conversation Management** - Save, load, and manage multiple chat sessions
- 🌓 **Dark/Light Themes** - Modern UI with theme switching
- 🔐 **Authentication** - Email/password signup and Google OAuth integration

### Technical Features
- TypeScript for type safety across the stack
- MongoDB for data persistence
- LangChain integration for LLM orchestration
- React 19 with modern hooks
- Tailwind CSS for styling
- Comprehensive test coverage (≥90% threshold)

## 🛠 Tech Stack

### Frontend (Client)
- **Framework:** React 19 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Routing:** React Router v7
- **Markdown:** react-markdown with syntax highlighting
- **Testing:** Vitest + Testing Library

### Backend (Server)
- **Runtime:** Node.js + Express
- **Language:** TypeScript
- **Database:** MongoDB with Mongoose
- **Authentication:** Passport.js (Local & Google OAuth)
- **AI/ML:** LangChain, OpenAI SDK
- **File Processing:** pdf-parse, mammoth
- **Testing:** Jest + Supertest

## 📋 Prerequisites

- Node.js 18+ and npm
- MongoDB (local or Atlas)
- API keys for at least one LLM provider:
  - OpenAI API key
  - Groq API key (optional)
  - OpenRouter API key (optional)
- Tavily API key (optional, for web research)
- Google OAuth credentials (optional, for Google login)

## 🚀 Quick Start

### 1. Clone and Install

```bash
cd /Users/jd/Desktop/M32_BIZ_PILOT

# Install root dependencies (includes husky hooks)
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Environment Variables

#### Server Configuration (`server/.env`)

Create a `.env` file in the `server/` directory:

```bash
# Server Configuration
PORT=4000
CLIENT_URL=http://localhost:5173
SESSION_SECRET=your-secure-session-secret

# Database
MONGO_URI=mongodb://127.0.0.1:27017/bizpilot

# LLM Configuration
LLM_PROVIDER=openai
OFFLINE_MODE=0

# OpenAI (required if LLM_PROVIDER=openai)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Groq (optional)
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.1-8b-instant

# OpenRouter (optional)
OPENROUTER_API_KEY=sk-...
OPENROUTER_MODEL=mistralai/mistral-7b-instruct:free

# Web Research (optional)
TAVILY_API_KEY=tvly-...

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

#### Client Configuration (`client/.env`)

Create a `.env` file in the `client/` directory (optional):

```bash
VITE_API_URL=http://localhost:4000/api
```

### 3. Start MongoDB

```bash
# If using local MongoDB
mongod --dbpath /path/to/your/data/directory

# Or use MongoDB Atlas (cloud)
```

### 4. Run the Application

Open two terminal windows:

**Terminal 1 - Server:**
```bash
cd server
npm run dev
# Server runs on http://localhost:4000
```

**Terminal 2 - Client:**
```bash
cd client
npm run dev
# Client runs on http://localhost:5173
```

Visit http://localhost:5173 in your browser to use the application.

## 🧪 Testing

The project uses comprehensive testing with high coverage thresholds.

### Run All Tests

```bash
# Server tests (Jest)
cd server
npm test

# Client tests (Vitest)
cd client
npm test

# Watch mode during development
npm run test:watch
```

### Pre-Push Hook

The project includes a Husky pre-push hook that enforces:
- ≥90% test coverage on client
- All tests must pass before pushing

## 📁 Project Structure

```
M32_BIZ_PILOT/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── utils/         # Utility functions
│   │   ├── App.tsx        # Main app component
│   │   └── main.tsx       # Entry point
│   ├── public/            # Static assets
│   ├── package.json       # Client dependencies
│   └── vite.config.ts     # Vite configuration
│
├── server/                # Express backend
│   ├── src/
│   │   ├── app.ts         # Express app setup
│   │   ├── index.ts       # Server entry point
│   │   ├── auth.ts        # Authentication logic
│   │   ├── llm.ts         # LLM provider routing
│   │   ├── oauth.ts       # OAuth configuration
│   │   ├── routes.ts      # API routes
│   │   ├── models.ts      # MongoDB schemas
│   │   └── types/         # TypeScript definitions
│   ├── tests/             # Jest tests
│   ├── scripts/           # Build/deploy scripts
│   └── package.json       # Server dependencies
│
├── package.json           # Root package (husky)
└── README.md              # This file
```

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/google` - Initiate Google OAuth flow
- `GET /api/me` - Get current user (requires Bearer token)

### Chat Endpoints

- `POST /api/chat` - Send message and get response
- `POST /api/chat/stream` - Stream response via SSE
- `GET /api/chats` - List all user conversations
- `GET /api/chats/:id` - Get specific conversation
- `PATCH /api/chats/:id` - Update conversation title
- `DELETE /api/chats/:id` - Delete conversation

### Document Upload

- `POST /api/upload` - Upload PDF/DOCX file
  - `file`: File to upload
  - `chatId`: (optional) Existing chat ID
  - `message`: (optional) Prompt to analyze document
  - `analyze`: (optional) Set to '0' to skip immediate analysis

### Business Tools

- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create new task

## 🔄 LLM Provider Configuration

The server supports multiple LLM providers with automatic fallback:

1. **Primary Provider** - Set via `LLM_PROVIDER` environment variable
2. **Fallback Providers** - Automatically tries other configured providers if primary fails
3. **Offline Mode** - Set `OFFLINE_MODE=1` for local fallback responses

### Supported Providers

| Provider | Environment Variables | Models Supported |
|----------|----------------------|------------------|
| OpenAI | `OPENAI_API_KEY`, `OPENAI_MODEL` | gpt-4o, gpt-4o-mini, gpt-3.5-turbo |
| Groq | `GROQ_API_KEY`, `GROQ_MODEL` | llama-3.1-8b-instant, mixtral-8x7b |
| OpenRouter | `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | Various open-source models |

## 🚢 Deployment

### Production Build

```bash
# Build server
cd server
npm run build
npm start

# Build client
cd client
npm run build
# Serve the dist/ folder with nginx or any static host
```

### Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong `SESSION_SECRET`
- [ ] Configure `CLIENT_URL` to production domain
- [ ] Set up MongoDB Atlas or persistent database
- [ ] Enable HTTPS and secure cookies
- [ ] Configure CORS for production domains
- [ ] Set up reverse proxy (nginx recommended)
- [ ] Configure environment variables on hosting platform
- [ ] Enable rate limiting and security headers

### Recommended Hosting

- **Backend:** Railway, Render, Heroku, AWS EC2
- **Frontend:** Vercel, Netlify, Cloudflare Pages
- **Database:** MongoDB Atlas

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Maintain ≥90% test coverage
- Follow existing code style (ESLint configuration)
- Write meaningful commit messages
- Update documentation for new features
- Ensure all tests pass before committing

## 📝 License

This project is licensed under the ISC License.

## 🆘 Troubleshooting

### Common Issues

**MongoDB Connection Failed**
```bash
# Ensure MongoDB is running
mongod --dbpath /path/to/data
# Or check your MONGO_URI in .env
```

**LLM Provider Errors**
```bash
# Verify your API keys are correct
# Check the provider status page
# Try switching to a different provider
```

**Port Already in Use**
```bash
# Change PORT in server/.env
# Or kill the process using the port
lsof -ti:4000 | xargs kill -9
```

**Google OAuth Not Working**
- Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
- Add http://localhost:4000/api/auth/google/callback to authorized redirect URIs in Google Console
- Verify `CLIENT_URL` matches your frontend URL

## 📞 Support

For issues, questions, or contributions, please open an issue in the repository.

---

Built with ❤️ using React, Node.js, and AI

