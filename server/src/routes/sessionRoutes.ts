import { Router } from 'express';
import { verifyToken } from '../auth.js';
import { canUserModerateRoom } from '../roomRuntimeRegistry.js';
import { sessionRepository } from '../repositories/sessionRepository.js';
import { authorizeRoomModerator } from './authorization.js';

export interface SessionRoutesDeps {
    extractUserId?: (authorization?: string) => string | null;
    canUserModerateRoomFn?: (roomId: string, userId: string) => Promise<boolean>;
    sessionRepo?: typeof sessionRepository;
}

const defaultExtractUserId = (authorization?: string): string | null => {
    if (!authorization?.startsWith('Bearer ')) return null;
    const token = authorization.slice('Bearer '.length).trim();
    const decoded = verifyToken(token);
    return decoded?.userId || null;
};

export const buildSessionRoutes = (deps: SessionRoutesDeps = {}) => {
    const router = Router();
    const extractUserId = deps.extractUserId || defaultExtractUserId;
    const canModerate = deps.canUserModerateRoomFn || canUserModerateRoom;
    const repo = deps.sessionRepo || sessionRepository;

    router.get('/active', async (req, res) => {
        const userId = extractUserId(req.headers.authorization);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const sessions = await repo.listActiveSessions();
        return res.json({ sessions });
    });

    router.get('/rooms/:roomId/latest', async (req, res) => {
        const userId = extractUserId(req.headers.authorization);
        const authz = await authorizeRoomModerator(userId, req.params.roomId, canModerate);
        if (!authz.ok) {
            return res.status(authz.status).json({ error: authz.error });
        }

        const session = await repo.getLatestSessionByRoom(req.params.roomId);
        if (!session) return res.status(404).json({ error: 'No session history for room' });

        return res.json({ session });
    });

    return router;
};

export default buildSessionRoutes();
