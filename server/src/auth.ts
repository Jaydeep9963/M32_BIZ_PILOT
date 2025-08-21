import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
	id: string;
	email: string;
}

export function signJwt(payload: AuthPayload, expiresIn: string = '7d'): string {
	const secret = process.env.JWT_SECRET || 'dev-secret';
	// Cast to any to accommodate differing jsonwebtoken type defs across versions
	return (jwt.sign as any)(payload, secret, { expiresIn });
}

export function verifyJwt(token: string): AuthPayload {
	const secret = process.env.JWT_SECRET || 'dev-secret';
	return (jwt.verify as any)(token, secret) as AuthPayload;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
	try {
		const authHeader = req.headers.authorization || '';
		const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
		if (!token) {
			return res.status(401).json({ error: 'Unauthorized' });
		}
		const payload = verifyJwt(token);
		// @ts-ignore attach to req
		req.user = payload;
		return next();
	} catch (err) {
		return res.status(401).json({ error: 'Invalid token' });
	}
}


