import dotenv from 'dotenv';
import mongoose from 'mongoose';
import session from 'express-session';
import passport from 'passport';
import { app } from './app';

dotenv.config();

console.log('[Boot] Env check:', {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'set' : 'missing',
  TAVILY_API_KEY: process.env.TAVILY_API_KEY ? 'set' : 'missing',
  OFFLINE_MODE: process.env.OFFLINE_MODE === '1' ? '1' : '0',
});

// Sessions for OAuth
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-session';
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false },
}));
app.use(passport.initialize());
app.use(passport.session());

// Passport Google strategy
import './oauth';

const PORT = Number(process.env.PORT) || 4000;
const MONGO_URI = process.env.MONGO_URI || '';
console.log("🚀 ~ MONGO_URI:", MONGO_URI)

async function start() {
	try {
		if (!MONGO_URI) {
			console.warn('Warning: MONGO_URI not set. Starting without DB connection.');
		} else {
			await mongoose.connect(MONGO_URI);
			console.log('Connected to MongoDB');
		}

		app.listen(PORT, () => {
			console.log(`Server listening on http://localhost:${PORT}`);
		});
	} catch (error) {
		console.error('Failed to start server:', error);
		process.exit(1);
	}
}

start();


