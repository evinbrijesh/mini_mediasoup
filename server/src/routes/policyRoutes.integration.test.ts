import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createServer } from 'http';
import { buildPolicyRoutes } from './policyRoutes.js';

const startPolicyTestServer = async (deps: Parameters<typeof buildPolicyRoutes>[0]) => {
    const app = express();
    app.use(express.json());
    app.use('/api/policies', buildPolicyRoutes(deps));

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

const basePolicyRepo = {
    listTemplates: async () => [],
    createTemplate: async () => ({ id: 'tpl-1' }),
    deleteTemplate: async () => undefined,
    getTemplate: async () => ({
        id: 'tpl-1',
        name: 'Default',
        preset: 'open',
        isLocked: false,
        waitingRoomEnabled: false,
    }),
    upsertRoomPolicy: async () => undefined,
    addAudit: async () => undefined,
    listAudits: async () => [],
    derivePresetFromFlags: () => 'open' as const,
};

test('policy routes integration: apply-template returns 401', async () => {
    const srv = await startPolicyTestServer({
        extractUserId: () => null,
        canUserModerateRoomFn: async () => true,
        policyRepo: basePolicyRepo as any,
    });
    try {
        const res = await fetch(`${srv.baseUrl}/api/policies/rooms/room-1/apply-template`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ templateId: 'tpl-1' }),
        });
        assert.equal(res.status, 401);
    } finally {
        await srv.close();
    }
});

test('policy routes integration: apply-template returns 403', async () => {
    const srv = await startPolicyTestServer({
        extractUserId: () => 'user-1',
        canUserModerateRoomFn: async () => false,
        policyRepo: basePolicyRepo as any,
    });
    try {
        const res = await fetch(`${srv.baseUrl}/api/policies/rooms/room-1/apply-template`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ templateId: 'tpl-1' }),
        });
        assert.equal(res.status, 403);
    } finally {
        await srv.close();
    }
});

test('policy routes integration: apply-template returns 200 for moderator', async () => {
    const srv = await startPolicyTestServer({
        extractUserId: () => 'user-1',
        canUserModerateRoomFn: async () => true,
        policyRepo: basePolicyRepo as any,
    });
    try {
        const res = await fetch(`${srv.baseUrl}/api/policies/rooms/room-1/apply-template`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ templateId: 'tpl-1' }),
        });
        assert.equal(res.status, 200);
    } finally {
        await srv.close();
    }
});
