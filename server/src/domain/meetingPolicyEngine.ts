import type { PolicyPreset } from '../policyStore.js';

export interface JoinGateInput {
    isLocked: boolean;
    waitingRoomEnabled: boolean;
    activePeerCount: number;
    isAdmitted: boolean;
}

export interface JoinGateResult {
    allowed: boolean;
    queue: boolean;
    reason?: 'locked' | 'waiting-room';
}

export const evaluateJoinGate = (input: JoinGateInput): JoinGateResult => {
    if (input.isLocked) {
        return { allowed: false, queue: false, reason: 'locked' };
    }

    if (input.waitingRoomEnabled && input.activePeerCount > 0 && !input.isAdmitted) {
        return { allowed: false, queue: true, reason: 'waiting-room' };
    }

    return { allowed: true, queue: false };
};

export const deriveFlagsFromPreset = (preset: PolicyPreset) => {
    if (preset === 'open') {
        return { isLocked: false, waitingRoomEnabled: false };
    }
    if (preset === 'controlled') {
        return { isLocked: false, waitingRoomEnabled: true };
    }
    return { isLocked: true, waitingRoomEnabled: true };
};
