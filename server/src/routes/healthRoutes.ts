import { Router } from 'express';

const router = Router();

router.get('/live', (_req, res) => {
    res.json({ status: 'ok' });
});

router.get('/ready', (_req, res) => {
    res.json({
        status: 'ready',
        timestamp: Date.now(),
        uptimeSeconds: process.uptime(),
    });
});

export default router;
