import { create } from 'zustand';

interface Participant {
    id: string;
    displayName: string;
    isLocal: boolean;
    videoStream?: MediaStream;
    audioStream?: MediaStream;
    isMuted: boolean;
    isVideoOff: boolean;
    isHandRaised?: boolean;
    screenStream?: MediaStream;
}

interface MeetingState {
    roomId: string | null;
    localParticipant: Participant | null;
    remoteParticipants: Participant[];
    setRoomId: (id: string) => void;
    setLocalParticipant: (p: Participant) => void;
    addRemoteParticipant: (p: Participant) => void;
    removeRemoteParticipant: (id: string) => void;
    updateParticipant: (id: string, updates: Partial<Participant>) => void;
}

export const useMeetingStore = create<MeetingState>((set) => ({
    roomId: null,
    localParticipant: null,
    remoteParticipants: [],
    setRoomId: (roomId) => set({ roomId }),
    setLocalParticipant: (localParticipant) => set({ localParticipant }),
    addRemoteParticipant: (p) => set((state) => {
        const existingIndex = state.remoteParticipants.findIndex(rp => rp.id === p.id);
        if (existingIndex !== -1) {
            const updatedParticipants = [...state.remoteParticipants];
            const existing = updatedParticipants[existingIndex];

            // BUG-043: Merge ALL stream fields and metadata, not just video/audio
            updatedParticipants[existingIndex] = {
                ...existing,
                // Update display name if a newer one is provided
                displayName: p.displayName || existing.displayName,
                // Merge streams: prefer the incoming value if present, fall back to existing
                videoStream: p.videoStream ?? existing.videoStream,
                audioStream: p.audioStream ?? existing.audioStream,
                screenStream: p.screenStream !== undefined ? p.screenStream : existing.screenStream,
                isMuted: p.isMuted !== undefined ? p.isMuted : existing.isMuted,
                isVideoOff: p.isVideoOff !== undefined ? p.isVideoOff : existing.isVideoOff,
                isHandRaised: p.isHandRaised !== undefined ? p.isHandRaised : existing.isHandRaised,
            };

            return { remoteParticipants: updatedParticipants };
        }
        return { remoteParticipants: [...state.remoteParticipants, p] };
    }),
    removeRemoteParticipant: (id) => set((state) => ({
        remoteParticipants: state.remoteParticipants.filter((p) => p.id !== id)
    })),
    updateParticipant: (id, updates) => set((state) => {
        if (state.localParticipant?.id === id) {
            return { localParticipant: { ...state.localParticipant, ...updates } };
        }
        return {
            remoteParticipants: state.remoteParticipants.map((p) =>
                p.id === id ? { ...p, ...updates } : p
            )
        };
    }),
}));
