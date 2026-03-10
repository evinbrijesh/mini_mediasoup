import { Router } from 'express';
import prisma from '../prisma.js';
import { hashPassword, comparePassword, generateToken } from '../auth.js';

const router = Router();

router.post('/signup', async (req, res) => {
    try {
        const { email, name, password } = req.body;
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
