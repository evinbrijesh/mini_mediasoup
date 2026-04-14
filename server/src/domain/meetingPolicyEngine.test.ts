import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveFlagsFromPreset, evaluateJoinGate } from './meetingPolicyEngine.js';

test('join gate blocks locked room', () => {
    const result = evaluateJoinGate({ isLocked: true, waitingRoomEnabled: true, activePeerCount: 3, isAdmitted: false });
    assert.deepEqual(result, { allowed: false, queue: false, reason: 'locked' });
});

test('join gate queues when waiting room enabled and non-first joiner', () => {
    const result = evaluateJoinGate({ isLocked: false, waitingRoomEnabled: true, activePeerCount: 2, isAdmitted: false });
    assert.deepEqual(result, { allowed: false, queue: true, reason: 'waiting-room' });
});

test('join gate allows admitted waiting participant', () => {
    const result = evaluateJoinGate({ isLocked: false, waitingRoomEnabled: true, activePeerCount: 2, isAdmitted: true });
    assert.deepEqual(result, { allowed: true, queue: false });
});

test('derive flags from policy presets', () => {
    assert.deepEqual(deriveFlagsFromPreset('open'), { isLocked: false, waitingRoomEnabled: false });
    assert.deepEqual(deriveFlagsFromPreset('controlled'), { isLocked: false, waitingRoomEnabled: true });
    assert.deepEqual(deriveFlagsFromPreset('strict'), { isLocked: true, waitingRoomEnabled: true });
});
