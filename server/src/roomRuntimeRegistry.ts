import { sessionRepository } from './repositories/sessionRepository.js';

type Role = 'host' | 'cohost' | 'participant';

interface RuntimeEntry {
    userId: string;
    role: Role;
}

const roomRuntimeUsers = new Map<string, Map<string, RuntimeEntry>>();

export const registerRuntimeUser = (roomId: string, peerId: string, userId: string, role: Role) => {
    if (!roomRuntimeUsers.has(roomId)) {
        roomRuntimeUsers.set(roomId, new Map());
    }
    roomRuntimeUsers.get(roomId)!.set(peerId, { userId, role });
};

export const updateRuntimeRole = (roomId: string, peerId: string, role: Role) => {
    const roomMap = roomRuntimeUsers.get(roomId);
    if (!roomMap) return;
    const entry = roomMap.get(peerId);
    if (!entry) return;
    roomMap.set(peerId, { ...entry, role });
};

export const unregisterRuntimePeer = (roomId: string, peerId: string) => {
    const roomMap = roomRuntimeUsers.get(roomId);
    if (!roomMap) return;
    roomMap.delete(peerId);
    if (roomMap.size === 0) {
        roomRuntimeUsers.delete(roomId);
    }
};

export const hasRuntimeUserInRoom = (roomId: string, userId: string): boolean => {
    const roomMap = roomRuntimeUsers.get(roomId);
    if (!roomMap) return false;
    for (const entry of roomMap.values()) {
        if (entry.userId === userId) return true;
    }
    return false;
};

export const canUserModerateRoom = async (roomId: string, userId: string): Promise<boolean> => {
    const roomMap = roomRuntimeUsers.get(roomId);
    if (roomMap) {
        let seenUserInRuntime = false;
        for (const entry of roomMap.values()) {
            if (entry.userId === userId) {
                seenUserInRuntime = true;
                if (entry.role === 'host' || entry.role === 'cohost') {
                    return true;
                }
            }
        }
        if (seenUserInRuntime) return false;
    }

    const persistedRole = await sessionRepository.getRuntimeRole(roomId, userId);
    return persistedRole === 'host' || persistedRole === 'cohost';
};
