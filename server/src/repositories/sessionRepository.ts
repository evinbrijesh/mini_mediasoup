import {
    deleteRoomRuntimeRole,
    endSession,
    getLatestSessionByRoom,
    getRoomRuntimeRole,
    listActiveSessions,
    recordParticipantJoin,
    recordParticipantLeft,
    recordSessionEvent,
    startSession,
    upsertRoomRuntimeRole,
} from '../sessionStore.js';

export class SessionRepository {
    async startSession(roomId: string) {
        return startSession(roomId);
    }

    async endSession(sessionId: string, reason: string) {
        return endSession(sessionId, reason);
    }

    async recordParticipantJoin(params: {
        sessionId: string;
        roomId: string;
        peerId: string;
        userId?: string | null;
        displayName: string;
        isGuest: boolean;
    }) {
        return recordParticipantJoin(params);
    }

    async recordParticipantLeft(sessionId: string, peerId: string) {
        return recordParticipantLeft(sessionId, peerId);
    }

    async recordEvent(params: {
        sessionId?: string | null;
        roomId: string;
        peerId?: string | null;
        userId?: string | null;
        eventType: string;
        payload?: any;
    }) {
        return recordSessionEvent(params);
    }

    async listActiveSessions() {
        return listActiveSessions();
    }

    async getLatestSessionByRoom(roomId: string) {
        return getLatestSessionByRoom(roomId);
    }

    async upsertRuntimeRole(roomId: string, userId: string, role: 'host' | 'cohost' | 'participant') {
        return upsertRoomRuntimeRole(roomId, userId, role);
    }

    async deleteRuntimeRole(roomId: string, userId: string) {
        return deleteRoomRuntimeRole(roomId, userId);
    }

    async getRuntimeRole(roomId: string, userId: string) {
        return getRoomRuntimeRole(roomId, userId);
    }
}

export const sessionRepository = new SessionRepository();
