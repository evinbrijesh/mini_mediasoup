import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:3000";

async function run() {
    const clients = [];

    for (let i = 1; i <= 3; i++) {
        const socket = io(SOCKET_URL);
        const name = `Bot ${i}`;
        
        await new Promise(r => socket.on("connect", r));
        console.log(`${name} connected with id ${socket.id}`);

        socket.on('new-producer', (data) => {
            console.log(`${name} received new-producer from ${data.peerId} (${data.kind})`);
        });

        const roomData = await new Promise(r => socket.emit("join-room", {
            roomId: "test-room",
            displayName: name,
            rtpCapabilities: { codecs: [], headerExtensions: [] }
        }, r));
        
        const existing = await new Promise(r => socket.emit("get-producers", r));
        console.log(`${name} saw ${existing.length} producers on join`);

        // mock produce!
        // We can't really mock transport, but we can verify if the server disconnects them!
        
        clients.push(socket);
    }
    
    setTimeout(() => {
        clients.forEach(c => c.disconnect());
        process.exit();
    }, 2000);
}

run();
