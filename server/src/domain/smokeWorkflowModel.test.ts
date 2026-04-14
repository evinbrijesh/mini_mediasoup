import test from 'node:test';
import assert from 'node:assert/strict';
import {
    assignCoHost,
    canModerate,
    createSmokeWorkflowState,
    requestJoin,
    respondWaiting,
    setPolicyPreset,
} from './smokeWorkflowModel.js';
import { smokeFixture } from './testFixtures.js';

test('smoke workflow: first user joins as host', () => {
    const state = createSmokeWorkflowState(smokeFixture.roomId);
    const joined = requestJoin(state, smokeFixture.hostPeerId, smokeFixture.hostName);
    assert.equal(joined.outcome, 'joined');
    if (joined.outcome === 'joined') {
        assert.equal(joined.role, 'host');
    }
    assert.equal(canModerate(state, smokeFixture.hostPeerId), true);
});

test('smoke workflow: controlled policy queues guest then admit flow joins', () => {
    const state = createSmokeWorkflowState(smokeFixture.roomId);
    requestJoin(state, smokeFixture.hostPeerId, smokeFixture.hostName);
    setPolicyPreset(state, 'controlled');

    const guestJoinAttempt = requestJoin(state, smokeFixture.guestPeerId, smokeFixture.guestName);
    assert.equal(guestJoinAttempt.outcome, 'queued');
    assert.equal(state.waitingQueue.size, 1);

    const decision = respondWaiting(state, smokeFixture.guestPeerId, true);
    assert.equal(decision.ok, true);

    const admittedJoinAttempt = requestJoin(state, smokeFixture.guestPeerId, smokeFixture.guestName);
    assert.equal(admittedJoinAttempt.outcome, 'joined');
    assert.equal(state.peers.has(smokeFixture.guestPeerId), true);
});

test('smoke workflow: strict policy denies new join', () => {
    const state = createSmokeWorkflowState(smokeFixture.roomId);
    requestJoin(state, smokeFixture.hostPeerId, smokeFixture.hostName);
    setPolicyPreset(state, 'strict');

    const joinAttempt = requestJoin(state, smokeFixture.guestPeerId, smokeFixture.guestName);
    assert.equal(joinAttempt.outcome, 'denied');
});

test('smoke workflow: host can assign cohost and cohost can moderate', () => {
    const state = createSmokeWorkflowState(smokeFixture.roomId);
    requestJoin(state, smokeFixture.hostPeerId, smokeFixture.hostName);
    requestJoin(state, smokeFixture.userPeerId, smokeFixture.userName);

    const assigned = assignCoHost(state, smokeFixture.userPeerId, true);
    assert.equal(assigned, true);
    assert.equal(canModerate(state, smokeFixture.userPeerId), true);
});
