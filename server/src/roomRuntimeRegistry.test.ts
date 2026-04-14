import test from 'node:test';
import assert from 'node:assert/strict';

import {
    registerRuntimeUser,
    updateRuntimeRole,
    unregisterRuntimePeer,
    hasRuntimeUserInRoom,
    canUserModerateRoom,
} from './roomRuntimeRegistry.js';

test('roomRuntimeRegistry moderator path from runtime map', async () => {
    const roomId = 'room-reg-1';
    const peerId = 'peer-a';
    const userId = 'user-a';

    registerRuntimeUser(roomId, peerId, userId, 'participant');
    let canModerate = await canUserModerateRoom(roomId, userId);
    assert.equal(canModerate, false);

    updateRuntimeRole(roomId, peerId, 'cohost');
    canModerate = await canUserModerateRoom(roomId, userId);
    assert.equal(canModerate, true);

    unregisterRuntimePeer(roomId, peerId);
    assert.equal(hasRuntimeUserInRoom(roomId, userId), false);
});
