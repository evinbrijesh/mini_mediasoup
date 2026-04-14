import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createServer } from 'http';
import { buildSessionRoutes } from './sessionRoutes.js';

const startSessionTestServer = async (deps: Parameters<typeof buildSessionRoutes>[0]) => {
    const app = express();
    app.use(express.json());
    app.use('/api/sessions', buildSessionRoutes(deps));

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

const baseSessionRepo = {
    listActiveSessions: async () => [],
    getLatestSessionByRoom: async () => ({ id: 'sess-1', roomId: 'room-1', participants: [], events: [] }),
};

test('session routes integration: latest returns 401 when unauthenticated', async () => {
    const srv = await startSessionTestServer({
        extractUserId: () => null,
        canUserModerateRoomFn: async () => true,
        sessionRepo: baseSessionRepo as any,
    });
    try {
        const res = await fetch(`${srv.baseUrl}/api/sessions/rooms/room-1/latest`);
        assert.equal(res.status, 401);
    } finally {
        await srv.close();
    }
});

test('session routes integration: latest returns 403 for non-moderator', async () => {
    const srv = await startSessionTestServer({
        extractUserId: () => 'user-1',
        canUserModerateRoomFn: async () => false,
        sessionRepo: baseSessionRepo as any,
    });
    try {
        const res = await fetch(`${srv.baseUrl}/api/sessions/rooms/room-1/latest`);
        assert.equal(res.status, 403);
    } finally {
        await srv.close();
    }
});

test('session routes integration: latest returns 200 for moderator', async () => {
    const srv = await startSessionTestServer({
        extractUserId: () => 'user-1',
        canUserModerateRoomFn: async () => true,
        sessionRepo: baseSessionRepo as any,
    });
    try {
        const res = await fetch(`${srv.baseUrl}/api/sessions/rooms/room-1/latest`);
        assert.equal(res.status, 200);
    } finally {
        await srv.close();
    }
});
