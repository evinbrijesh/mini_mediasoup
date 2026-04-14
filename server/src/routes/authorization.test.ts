import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeRoomModerator } from './authorization.js';

test('authorizeRoomModerator rejects missing user', async () => {
    const result = await authorizeRoomModerator(null, 'room-a', async () => true);
    assert.equal(result.ok, false);
    if (!result.ok) {
        assert.equal(result.status, 401);
    }
});

test('authorizeRoomModerator rejects non-moderator', async () => {
    const result = await authorizeRoomModerator('user-a', 'room-a', async () => false);
    assert.equal(result.ok, false);
    if (!result.ok) {
        assert.equal(result.status, 403);
    }
});

test('authorizeRoomModerator allows moderator', async () => {
    const result = await authorizeRoomModerator('user-a', 'room-a', async () => true);
    assert.equal(result.ok, true);
});
