export interface WaitingQueueEntry {
    peerId: string;
    displayName: string;
    requestedAt: number;
}

export const buildWaitingQueuePayload = (queue: WaitingQueueEntry[]) => ({
    queue: [...queue].sort((a, b) => a.requestedAt - b.requestedAt),
});

export const buildWaitingRoomResponse = (allowed: boolean, reason?: string) => {
    if (!allowed) {
        return { allowed: false as const, reason: reason || 'Denied by host' };
    }
    return { allowed: true as const };
};
