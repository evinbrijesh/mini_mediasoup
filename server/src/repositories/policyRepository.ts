import type { PolicyPreset, RoomPolicyState } from '../policyStore.js';
import {
    createPolicyTemplate,
    deletePolicyTemplate,
    getPolicyTemplate,
    getRoomPolicy,
    insertPolicyAudit,
    listPolicyAudits,
    listPolicyTemplates,
    upsertRoomPolicy,
} from '../policyStore.js';

export class PolicyRepository {
    async getRoomPolicy(roomId: string): Promise<RoomPolicyState | null> {
        return getRoomPolicy(roomId);
    }

    async upsertRoomPolicy(roomId: string, state: RoomPolicyState) {
        return upsertRoomPolicy(roomId, state);
    }

    async addAudit(roomId: string, action: string, details: any, actorUserId?: string, actorPeerId?: string) {
        return insertPolicyAudit(roomId, action, details, actorUserId, actorPeerId);
    }

    async listTemplates(userId: string) {
        return listPolicyTemplates(userId);
    }

    async createTemplate(userId: string, name: string, state: RoomPolicyState) {
        return createPolicyTemplate(userId, name, state);
    }

    async deleteTemplate(userId: string, id: string) {
        return deletePolicyTemplate(userId, id);
    }

    async getTemplate(userId: string, id: string) {
        return getPolicyTemplate(userId, id);
    }

    async listAudits(roomId: string, limit = 50) {
        return listPolicyAudits(roomId, limit);
    }

    derivePresetFromFlags(isLocked: boolean, waitingRoomEnabled: boolean): PolicyPreset {
        if (isLocked) return 'strict';
        if (waitingRoomEnabled) return 'controlled';
        return 'open';
    }
}

export const policyRepository = new PolicyRepository();
