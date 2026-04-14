import { randomUUID } from 'crypto';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
    connectionString,
    ssl: false,
});

export const initSessionStore = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS meeting_sessions (
            id TEXT PRIMARY KEY,
            room_id TEXT NOT NULL,
            started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ended_at TIMESTAMPTZ,
            ended_reason TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS meeting_session_participants (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            room_id TEXT NOT NULL,
            peer_id TEXT NOT NULL,
            user_id TEXT,
            display_name TEXT NOT NULL,
            is_guest BOOLEAN NOT NULL DEFAULT FALSE,
            joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            left_at TIMESTAMPTZ
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS meeting_session_events (
            id TEXT PRIMARY KEY,
            session_id TEXT,
            room_id TEXT NOT NULL,
            peer_id TEXT,
            user_id TEXT,
            event_type TEXT NOT NULL,
            payload JSONB,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS room_runtime_roles (
            room_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            role TEXT NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (room_id, user_id)
        );
    `);

    await pool.query(`
        UPDATE meeting_sessions
        SET ended_at = NOW(), ended_reason = 'server-restart'
        WHERE ended_at IS NULL;
    `);
};

export const startSession = async (roomId: string) => {
    const id = randomUUID();
    await pool.query(
        `
        INSERT INTO meeting_sessions (id, room_id, started_at)
        VALUES ($1, $2, NOW())
        `,
        [id, roomId],
    );
    return id;
};

export const endSession = async (sessionId: string, reason: string) => {
    await pool.query(
        `
        UPDATE meeting_sessions
        SET ended_at = COALESCE(ended_at, NOW()), ended_reason = COALESCE(ended_reason, $2)
        WHERE id = $1
        `,
        [sessionId, reason],
    );
};

export const recordParticipantJoin = async (params: {
    sessionId: string;
    roomId: string;
    peerId: string;
    userId?: string | null;
    displayName: string;
    isGuest: boolean;
}) => {
    const id = randomUUID();
    await pool.query(
        `
        INSERT INTO meeting_session_participants (id, session_id, room_id, peer_id, user_id, display_name, is_guest, joined_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `,
        [id, params.sessionId, params.roomId, params.peerId, params.userId ?? null, params.displayName, params.isGuest],
    );
};

export const recordParticipantLeft = async (sessionId: string, peerId: string) => {
    await pool.query(
        `
        UPDATE meeting_session_participants
        SET left_at = COALESCE(left_at, NOW())
        WHERE session_id = $1 AND peer_id = $2 AND left_at IS NULL
        `,
        [sessionId, peerId],
    );
};

export const recordSessionEvent = async (params: {
    sessionId?: string | null;
    roomId: string;
    peerId?: string | null;
    userId?: string | null;
    eventType: string;
    payload?: any;
}) => {
    const id = randomUUID();
    await pool.query(
        `
        INSERT INTO meeting_session_events (id, session_id, room_id, peer_id, user_id, event_type, payload, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW())
        `,
        [
            id,
            params.sessionId ?? null,
            params.roomId,
            params.peerId ?? null,
            params.userId ?? null,
            params.eventType,
            JSON.stringify(params.payload ?? {}),
        ],
    );
};

export const upsertRoomRuntimeRole = async (roomId: string, userId: string, role: 'host' | 'cohost' | 'participant') => {
    await pool.query(
        `
        INSERT INTO room_runtime_roles (room_id, user_id, role, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (room_id, user_id)
        DO UPDATE SET role = EXCLUDED.role, updated_at = NOW()
        `,
        [roomId, userId, role],
    );
};

export const deleteRoomRuntimeRole = async (roomId: string, userId: string) => {
    await pool.query(
        `
        DELETE FROM room_runtime_roles WHERE room_id = $1 AND user_id = $2
        `,
        [roomId, userId],
    );
};

export const getRoomRuntimeRole = async (roomId: string, userId: string) => {
    const res = await pool.query(
        `
        SELECT role FROM room_runtime_roles WHERE room_id = $1 AND user_id = $2 LIMIT 1
        `,
        [roomId, userId],
    );
    if (!res.rowCount) return null;
    return res.rows[0].role as 'host' | 'cohost' | 'participant';
};

export const listActiveSessions = async () => {
    const res = await pool.query(
        `
        SELECT id, room_id AS "roomId", started_at AS "startedAt"
        FROM meeting_sessions
        WHERE ended_at IS NULL
        ORDER BY started_at DESC
        `,
    );
    return res.rows;
};

export const getLatestSessionByRoom = async (roomId: string) => {
    const sessionRes = await pool.query(
        `
        SELECT id, room_id AS "roomId", started_at AS "startedAt", ended_at AS "endedAt", ended_reason AS "endedReason"
        FROM meeting_sessions
        WHERE room_id = $1
        ORDER BY started_at DESC
        LIMIT 1
        `,
        [roomId],
    );

    if (!sessionRes.rowCount) return null;

    const session = sessionRes.rows[0];

    const [participantsRes, eventsRes] = await Promise.all([
        pool.query(
            `
            SELECT peer_id AS "peerId", user_id AS "userId", display_name AS "displayName", is_guest AS "isGuest", joined_at AS "joinedAt", left_at AS "leftAt"
            FROM meeting_session_participants
            WHERE session_id = $1
            ORDER BY joined_at ASC
            `,
            [session.id],
        ),
        pool.query(
            `
            SELECT id, peer_id AS "peerId", user_id AS "userId", event_type AS "eventType", payload, created_at AS "createdAt"
            FROM meeting_session_events
            WHERE session_id = $1
            ORDER BY created_at DESC
            LIMIT 100
            `,
            [session.id],
        ),
    ]);

    return {
        ...session,
        participants: participantsRes.rows,
        events: eventsRes.rows,
    };
};
