import jwt from 'jsonwebtoken';
import prisma from './prisma.js';
import bcrypt from 'bcryptjs';

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
}

const JWT_SECRET: string = process.env.JWT_SECRET;

export const hashPassword = async (password: string) => {
    return bcrypt.hash(password, 10);
};

export const comparePassword = async (password: string, hash: string) => {
    return bcrypt.compare(password, hash);
};

export const generateToken = (userId: string) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string) => {
    try {
        return jwt.verify(token, JWT_SECRET) as { userId: string };
    } catch (error) {
        return null;
    }
};
