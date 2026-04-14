import type { Router, RtpCapabilities, Worker, MediaKind, RtpParameters, DtlsParameters } from 'mediasoup/node/lib/types';
import { Peer } from './Peer';

export class Room {
    public id: string;
    public router!: Router;
    public peers: Map<string, Peer> = new Map();
    public hostPeerId: string | null = null;
    public isLocked = false;
    public waitingRoomEnabled = false;
    public waitingQueue: Map<string, { peerId: string; displayName: string; requestedAt: number }> = new Map();
    public admittedPeers: Set<string> = new Set();
    public sessionId: string | null = null;

    constructor(id: string) {
        this.id = id;
    }

    static async create(id: string, worker: Worker): Promise<Room> {
        const room = new Room(id);
        const mediaCodecs = [
            {
                kind: 'audio' as MediaKind,
                mimeType: 'audio/opus',
                clockRate: 48000,
                channels: 2,
            },
            {
                kind: 'video' as MediaKind,
                mimeType: 'video/VP8',
                clockRate: 90000,
                parameters: {
                    'x-google-start-bitrate': 1000,
                },
            },
            {
                kind: 'video' as MediaKind,
                mimeType: 'video/H264',
                clockRate: 90000,
                parameters: {
                    'packetization-mode': 1,
                    'profile-level-id': '42e01f',
                    'level-asymmetry-allowed': 1,
                },
            },
        ];

        room.router = await worker.createRouter({ mediaCodecs });
        return room;
    }

    addPeer(peer: Peer) {
        if (!this.hostPeerId) {
            this.hostPeerId = peer.id;
            peer.isHost = true;
        }
        this.peers.set(peer.id, peer);
    }

    getPeer(peerId: string) {
        return this.peers.get(peerId);
    }

    removePeer(peerId: string) {
        const peer = this.peers.get(peerId);
        if (peer) {
            peer.close();
            this.peers.delete(peerId);

            if (this.hostPeerId === peerId) {
                const nextPeer = this.peers.values().next().value as Peer | undefined;
                this.hostPeerId = nextPeer?.id ?? null;
                if (nextPeer) {
                    nextPeer.isHost = true;
                }
            }
        }
    }

    async createPlainTransport() {
        return await this.router.createPlainTransport({
            listenIp: { ip: '0.0.0.0', announcedIp: '127.0.0.1' }, // For local AI service
            rtcpMux: true,
            comedia: true,
        });
    }

    get rtpCapabilities(): RtpCapabilities {
        return this.router.rtpCapabilities;
    }

    close() {
        this.peers.forEach((peer) => {
            peer.close();
        });
        this.peers.clear();

        try {
            this.router.close();
        } catch {
            // ignore cleanup errors
        }
    }
}
