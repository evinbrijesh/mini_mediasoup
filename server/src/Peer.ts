import type {
    WebRtcTransport,
    Producer,
    Consumer,
    Transport,
    RtpCapabilities,
} from 'mediasoup/node/lib/types';

export interface PeerOptions {
    id: string;
    displayName: string;
    rtpCapabilities?: RtpCapabilities;
    userId?: string;
}

export class Peer {
    public id: string;
    public displayName: string;
    public rtpCapabilities?: RtpCapabilities | undefined;
    public transports: Map<string, Transport> = new Map();
    public producers: Map<string, Producer> = new Map();
    public consumers: Map<string, Consumer> = new Map();
    public isMuted = false;
    public isVideoOff = false;
    public isHost = false;
    public isCoHost = false;
    public userId: string | undefined;

    constructor({ id, displayName, rtpCapabilities, userId }: PeerOptions) {
        this.id = id;
        this.displayName = displayName;
        this.rtpCapabilities = rtpCapabilities;
        this.userId = userId;
    }

    addTransport(transport: Transport) {
        this.transports.set(transport.id, transport);
    }

    getTransport(transportId: string) {
        return this.transports.get(transportId);
    }

    addProducer(producer: Producer) {
        this.producers.set(producer.id, producer);
    }

    getProducer(producerId: string) {
        return this.producers.get(producerId);
    }

    addConsumer(consumer: Consumer) {
        this.consumers.set(consumer.id, consumer);
    }

    getConsumer(consumerId: string) {
        return this.consumers.get(consumerId);
    }

    close() {
        this.consumers.forEach((consumer) => {
            try {
                consumer.close();
            } catch {
                // ignore cleanup errors
            }
        });
        this.producers.forEach((producer) => {
            try {
                producer.close();
            } catch {
                // ignore cleanup errors
            }
        });
        this.transports.forEach((transport) => transport.close());
        this.consumers.clear();
        this.producers.clear();
        this.transports.clear();
    }
}
