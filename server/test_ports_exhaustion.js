import * as mediasoup from "mediasoup";
async function run() {
    try {
        const worker = await mediasoup.createWorker({
            logLevel: 'warn',
            rtcMinPort: 10000,
            rtcMaxPort: 10100, // 100 ports total
        });
        const router = await worker.createRouter({ mediaCodecs: [{ kind: "audio", mimeType: "audio/opus", clockRate: 48000, channels: 2 }] });
        
        let successCount = 0;
        for (let i = 0; i < 150; i++) {
            try {
                await router.createWebRtcTransport({ listenIps: [{ ip: "0.0.0.0", announcedIp: "127.0.0.1" }] });
                successCount++;
            } catch (e) {
                console.log(`Failed at iteration ${i}:`, e.message);
                break;
            }
        }
        console.log(`Successfully created ${successCount} WebRtcTransports`);
    } catch(e) {
        console.error(e);
    }
    process.exit();
}
run();
