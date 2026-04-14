export const authorizeRoomModerator = async (
    userId: string | null,
    roomId: string,
    checker: (roomId: string, userId: string) => Promise<boolean>,
) => {
    if (!userId) {
        return { ok: false as const, status: 401, error: 'Unauthorized' };
    }

    const allowed = await checker(roomId, userId);
    if (!allowed) {
        return { ok: false as const, status: 403, error: 'Forbidden: moderator role required in room' };
    }

    return { ok: true as const };
};
