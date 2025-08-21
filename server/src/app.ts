import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { router as apiRouter } from './routes';

dotenv.config();

export const app = express();

app.use(cors({
	origin: process.env.CLIENT_URL || 'http://localhost:5173',
	credentials: true,
}));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req: Request, res: Response) => {
	res.json({ ok: true });
});

app.use('/api', apiRouter);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
	console.error('Unhandled error:', err);
	res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});


