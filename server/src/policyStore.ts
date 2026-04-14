import { randomUUID } from 'crypto';
import { Pool } from 'pg';

export type PolicyPreset = 'open' | 'controlled' | 'strict';

export interface RoomPolicyState {
    preset: PolicyPreset;
    isLocked: boolean;
    waitingRoomEnabled: boolean;
}

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
    connectionString,
    ssl: false,
});

export const initPolicyStore = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS room_policies (
            room_id TEXT PRIMARY KEY,
            preset TEXT NOT NULL DEFAULT 'open',
            is_locked BOOLEAN NOT NULL DEFAULT FALSE,
            waiting_room_enabled BOOLEAN NOT NULL DEFAULT FALSE,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS room_policy_audits (
            id TEXT PRIMARY KEY,
            room_id TEXT NOT NULL,
            actor_user_id TEXT,
            actor_peer_id TEXT,
            action TEXT NOT NULL,
            details JSONB,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS room_policy_templates (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            preset TEXT NOT NULL,
            is_locked BOOLEAN NOT NULL,
            waiting_room_enabled BOOLEAN NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);
};

export const getRoomPolicy = async (roomId: string): Promise<RoomPolicyState | null> => {
    const res = await pool.query(
        'SELECT preset, is_locked, waiting_room_enabled FROM room_policies WHERE room_id = $1',
        [roomId],
    );
    if (!res.rowCount) return null;
    return {
        preset: res.rows[0].preset as PolicyPreset,
        isLocked: Boolean(res.rows[0].is_locked),
        waitingRoomEnabled: Boolean(res.rows[0].waiting_room_enabled),
    };
};

export const upsertRoomPolicy = async (roomId: string, state: RoomPolicyState) => {
    await pool.query(
        `
        INSERT INTO room_policies (room_id, preset, is_locked, waiting_room_enabled, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (room_id)
        DO UPDATE SET
            preset = EXCLUDED.preset,
            is_locked = EXCLUDED.is_locked,
            waiting_room_enabled = EXCLUDED.waiting_room_enabled,
            updated_at = NOW()
        `,
        [roomId, state.preset, state.isLocked, state.waitingRoomEnabled],
    );
};

export const insertPolicyAudit = async (roomId: string, action: string, details: any, actorUserId?: string, actorPeerId?: string) => {
    const id = randomUUID();
    await pool.query(
        `
        INSERT INTO room_policy_audits (id, room_id, actor_user_id, actor_peer_id, action, details)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb)
        `,
        [id, roomId, actorUserId ?? null, actorPeerId ?? null, action, JSON.stringify(details ?? {})],
    );
};

export const listPolicyTemplates = async (userId: string) => {
    const res = await pool.query(
        `
        SELECT id, name, preset, is_locked, waiting_room_enabled, created_at, updated_at
        FROM room_policy_templates
        WHERE user_id = $1
        ORDER BY updated_at DESC
        `,
        [userId],
    );
    return res.rows.map((row) => ({
        id: row.id as string,
        name: row.name as string,
        preset: row.preset as PolicyPreset,
        isLocked: Boolean(row.is_locked),
        waitingRoomEnabled: Boolean(row.waiting_room_enabled),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }));
};

export const createPolicyTemplate = async (userId: string, name: string, state: RoomPolicyState) => {
    const id = randomUUID();
    const res = await pool.query(
        `
        INSERT INTO room_policy_templates (id, user_id, name, preset, is_locked, waiting_room_enabled)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, preset, is_locked, waiting_room_enabled, created_at, updated_at
        `,
        [id, userId, name, state.preset, state.isLocked, state.waitingRoomEnabled],
    );
    const row = res.rows[0];
    return {
        id: row.id as string,
        name: row.name as string,
        preset: row.preset as PolicyPreset,
        isLocked: Boolean(row.is_locked),
        waitingRoomEnabled: Boolean(row.waiting_room_enabled),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
};

export const deletePolicyTemplate = async (userId: string, id: string) => {
    await pool.query('DELETE FROM room_policy_templates WHERE id = $1 AND user_id = $2', [id, userId]);
};

export const getPolicyTemplate = async (userId: string, id: string) => {
    const res = await pool.query(
        `
        SELECT id, name, preset, is_locked, waiting_room_enabled
        FROM room_policy_templates
        WHERE id = $1 AND user_id = $2
        LIMIT 1
        `,
        [id, userId],
    );
    if (!res.rowCount) return null;
    const row = res.rows[0];
    return {
        id: row.id as string,
        name: row.name as string,
        preset: row.preset as PolicyPreset,
        isLocked: Boolean(row.is_locked),
        waitingRoomEnabled: Boolean(row.waiting_room_enabled),
    };
};

export const listPolicyAudits = async (roomId: string, limit = 50) => {
    const res = await pool.query(
        `
        SELECT id, actor_user_id, actor_peer_id, action, details, created_at
        FROM room_policy_audits
        WHERE room_id = $1
        ORDER BY created_at DESC
        LIMIT $2
        `,
        [roomId, limit],
    );

    return res.rows.map((row) => ({
        id: row.id as string,
        actorUserId: row.actor_user_id as string | null,
        actorPeerId: row.actor_peer_id as string | null,
        action: row.action as string,
        details: row.details,
        createdAt: row.created_at,
    }));
};
