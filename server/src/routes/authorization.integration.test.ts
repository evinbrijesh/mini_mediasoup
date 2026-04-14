import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createServer } from 'http';
import { authorizeRoomModerator } from './authorization.js';

const startTestServer = async (checker: (roomId: string, userId: string) => Promise<boolean>) => {
    const app = express();
    app.get('/protected/:roomId', async (req, res) => {
        const raw = req.headers.authorization;
        const userId = raw?.startsWith('Bearer ') ? raw.slice('Bearer '.length) : null;
        const authz = await authorizeRoomModerator(userId, req.params.roomId, checker);
        if (!authz.ok) {
            return res.status(authz.status).json({ error: authz.error });
        }
        return res.status(200).json({ ok: true });
    });

    const server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    return {
        baseUrl: `http://127.0.0.1:${port}`,
        close: async () => {
            await new Promise<void>((resolve) => server.close(() => resolve()));
        },
    };
};

test('authorization integration: returns 401 without token', async () => {
    const srv = await startTestServer(async () => true);
    try {
        const res = await fetch(`${srv.baseUrl}/protected/room-1`);
        assert.equal(res.status, 401);
    } finally {
        await srv.close();
    }
});

test('authorization integration: returns 403 when checker denies', async () => {
    const srv = await startTestServer(async () => false);
    try {
        const res = await fetch(`${srv.baseUrl}/protected/room-1`, {
            headers: { Authorization: 'Bearer user-1' },
        });
        assert.equal(res.status, 403);
    } finally {
        await srv.close();
    }
});

test('authorization integration: returns 200 when checker allows', async () => {
    const srv = await startTestServer(async () => true);
    try {
        const res = await fetch(`${srv.baseUrl}/protected/room-1`, {
            headers: { Authorization: 'Bearer user-1' },
        });
        assert.equal(res.status, 200);
    } finally {
        await srv.close();
    }
});
