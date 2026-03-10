import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../auth.js';

export interface AuthRequest extends Request {
    userId?: string;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const parts = authHeader.split(' ');
    const token = parts[1];
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    req.userId = decoded.userId;
    next();
};
