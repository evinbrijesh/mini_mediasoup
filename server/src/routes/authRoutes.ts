import { Router } from 'express';
import prisma from '../prisma';
import { hashPassword, comparePassword, generateToken } from '../auth.js';
import rateLimit from 'express-rate-limit';

const router = Router();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
});

const isValidEmail = (value: unknown): value is string => {
    if (typeof value !== 'string') return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

const isValidName = (value: unknown): value is string => {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    return trimmed.length >= 2 && trimmed.length <= 50;
};

const isValidPassword = (value: unknown): value is string => {
    if (typeof value !== 'string') return false;
    return value.length >= 8 && value.length <= 128;
};

router.use(authLimiter);

router.post('/signup', async (req, res) => {
    try {
        const { email, name, password } = req.body;

        if (!isValidEmail(email) || !isValidName(name) || !isValidPassword(password)) {
            return res.status(400).json({ error: 'Invalid signup payload' });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });

        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await hashPassword(password);
        const user = await prisma.user.create({
            data: {
                email,
                name,
                passwordHash: hashedPassword,
            },
        });

        const token = generateToken(user.id);
        res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!isValidEmail(email) || !isValidPassword(password)) {
            return res.status(400).json({ error: 'Invalid login payload' });
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || !(await comparePassword(password, user.passwordHash))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = generateToken(user.id);
        res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
