import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWaitingQueuePayload, buildWaitingRoomResponse } from './waitingRoomContract.js';

test('waiting-room contract sorts queue by requestedAt asc', () => {
    const payload = buildWaitingQueuePayload([
        { peerId: 'p2', displayName: 'B', requestedAt: 20 },
        { peerId: 'p1', displayName: 'A', requestedAt: 10 },
    ]);

    assert.equal(payload.queue[0]?.peerId, 'p1');
    assert.equal(payload.queue[1]?.peerId, 'p2');
});

test('waiting-room contract deny response includes reason', () => {
    const response = buildWaitingRoomResponse(false, 'Denied by host');
    assert.deepEqual(response, { allowed: false, reason: 'Denied by host' });
});

test('waiting-room contract allow response has minimal shape', () => {
    const response = buildWaitingRoomResponse(true);
    assert.deepEqual(response, { allowed: true });
});
