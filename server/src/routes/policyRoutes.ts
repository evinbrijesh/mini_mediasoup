import { Router } from 'express';
import { verifyToken } from '../auth.js';
import { canUserModerateRoom } from '../roomRuntimeRegistry.js';
import { policyRepository } from '../repositories/policyRepository.js';
import { authorizeRoomModerator } from './authorization.js';

export interface PolicyRoutesDeps {
    extractUserId?: (authorization?: string) => string | null;
    canUserModerateRoomFn?: (roomId: string, userId: string) => Promise<boolean>;
    policyRepo?: typeof policyRepository;
}

const defaultExtractUserId = (authorization?: string): string | null => {
    if (!authorization?.startsWith('Bearer ')) return null;
    const token = authorization.slice('Bearer '.length).trim();
    const decoded = verifyToken(token);
    return decoded?.userId || null;
};

export const buildPolicyRoutes = (deps: PolicyRoutesDeps = {}) => {
    const router = Router();
    const extractUserId = deps.extractUserId || defaultExtractUserId;
    const canModerate = deps.canUserModerateRoomFn || canUserModerateRoom;
    const repo = deps.policyRepo || policyRepository;

    router.get('/templates', async (req, res) => {
        const userId = extractUserId(req.headers.authorization);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const templates = await repo.listTemplates(userId);
        return res.json({ templates });
    });

    router.post('/templates', async (req, res) => {
        const userId = extractUserId(req.headers.authorization);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { name, preset, isLocked, waitingRoomEnabled } = req.body || {};
        if (typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ error: 'Template name required' });
        }
        if (!['open', 'controlled', 'strict'].includes(preset)) {
            return res.status(400).json({ error: 'Invalid preset' });
        }

        const created = await repo.createTemplate(userId, name.trim(), {
            preset,
            isLocked: Boolean(isLocked),
            waitingRoomEnabled: Boolean(waitingRoomEnabled),
        });
        return res.status(201).json({ template: created });
    });

    router.delete('/templates/:id', async (req, res) => {
        const userId = extractUserId(req.headers.authorization);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        await repo.deleteTemplate(userId, req.params.id);
        return res.status(204).send();
    });

    router.post('/rooms/:roomId/apply-template', async (req, res) => {
        const userId = extractUserId(req.headers.authorization);
        const authz = await authorizeRoomModerator(userId, req.params.roomId, canModerate);
        if (!authz.ok) {
            return res.status(authz.status).json({ error: authz.error });
        }
        const actorUserId = userId as string;

        const { templateId } = req.body || {};
        if (typeof templateId !== 'string' || !templateId) {
            return res.status(400).json({ error: 'templateId required' });
        }

        const template = await repo.getTemplate(actorUserId, templateId);
        if (!template) return res.status(404).json({ error: 'Template not found' });

        await repo.upsertRoomPolicy(req.params.roomId, {
            preset: template.preset as 'open' | 'controlled' | 'strict',
            isLocked: template.isLocked,
            waitingRoomEnabled: template.waitingRoomEnabled,
        });
        await repo.addAudit(
            req.params.roomId,
            'apply-template',
            { templateId: template.id, templateName: template.name },
            actorUserId,
        );

        return res.json({ ok: true, policy: template });
    });

    router.get('/rooms/:roomId/audits', async (req, res) => {
        const userId = extractUserId(req.headers.authorization);
        const authz = await authorizeRoomModerator(userId, req.params.roomId, canModerate);
        if (!authz.ok) {
            return res.status(authz.status).json({ error: authz.error });
        }

        const limit = Math.min(Number(req.query.limit || 50), 200);
        const audits = await repo.listAudits(req.params.roomId, Number.isFinite(limit) ? limit : 50);
        return res.json({ audits });
    });

    return router;
};

export default buildPolicyRoutes();
