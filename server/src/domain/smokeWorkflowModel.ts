import type { PolicyPreset } from '../policyStore.js';
import { deriveFlagsFromPreset, evaluateJoinGate } from './meetingPolicyEngine.js';

type Role = 'host' | 'cohost' | 'participant';

interface PeerEntry {
    peerId: string;
    displayName: string;
    role: Role;
}

interface WaitingEntry {
    peerId: string;
    displayName: string;
    requestedAt: number;
}

export interface SmokeWorkflowState {
    roomId: string;
    policyPreset: PolicyPreset;
    isLocked: boolean;
    waitingRoomEnabled: boolean;
    peers: Map<string, PeerEntry>;
    waitingQueue: Map<string, WaitingEntry>;
    admittedPeers: Set<string>;
    now: number;
}

export const createSmokeWorkflowState = (roomId: string): SmokeWorkflowState => {
    const flags = deriveFlagsFromPreset('open');
    return {
        roomId,
        policyPreset: 'open',
        isLocked: flags.isLocked,
        waitingRoomEnabled: flags.waitingRoomEnabled,
        peers: new Map(),
        waitingQueue: new Map(),
        admittedPeers: new Set(),
        now: 1,
    };
};

export const setPolicyPreset = (state: SmokeWorkflowState, preset: PolicyPreset) => {
    const flags = deriveFlagsFromPreset(preset);
    state.policyPreset = preset;
    state.isLocked = flags.isLocked;
    state.waitingRoomEnabled = flags.waitingRoomEnabled;
};

export const requestJoin = (state: SmokeWorkflowState, peerId: string, displayName: string) => {
    const joinGate = evaluateJoinGate({
        isLocked: state.isLocked,
        waitingRoomEnabled: state.waitingRoomEnabled,
        activePeerCount: state.peers.size,
        isAdmitted: state.admittedPeers.has(peerId),
    });

    if (!joinGate.allowed && joinGate.reason === 'locked') {
        return { outcome: 'denied' as const, reason: 'locked' as const };
    }

    if (joinGate.queue) {
        state.waitingQueue.set(peerId, {
            peerId,
            displayName,
            requestedAt: state.now++,
        });
        return { outcome: 'queued' as const };
    }

    state.admittedPeers.delete(peerId);
    const role: Role = state.peers.size === 0 ? 'host' : 'participant';
    state.peers.set(peerId, { peerId, displayName, role });
    return { outcome: 'joined' as const, role };
};

export const respondWaiting = (state: SmokeWorkflowState, peerId: string, allow: boolean) => {
    const waiting = state.waitingQueue.get(peerId);
    if (!waiting) return { ok: false as const };
    state.waitingQueue.delete(peerId);
    if (allow) {
        state.admittedPeers.add(peerId);
    }
    return { ok: true as const, allowed: allow };
};

export const assignCoHost = (state: SmokeWorkflowState, peerId: string, isCoHost: boolean) => {
    const peer = state.peers.get(peerId);
    if (!peer || peer.role === 'host') return false;
    peer.role = isCoHost ? 'cohost' : 'participant';
    state.peers.set(peerId, peer);
    return true;
};

export const canModerate = (state: SmokeWorkflowState, peerId: string) => {
    const peer = state.peers.get(peerId);
    return Boolean(peer && (peer.role === 'host' || peer.role === 'cohost'));
};
