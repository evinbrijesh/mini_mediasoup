import asyncio
import os
import uvicorn
import socketio
from fastapi import FastAPI
from typing import Optional
from vad import VADProcessor
from transcriber import Transcriber
from rtp_receiver import RTPReceiver

# --- App and globals ---
app = FastAPI()

# Use async socketio client so it works inside the async FastAPI event loop
sio = socketio.AsyncClient()

# Globals initialised in startup_event
vad: Optional[VADProcessor] = None
transcriber: Optional[Transcriber] = None
receiver: Optional[RTPReceiver] = None

# Peer/room context supplied by the signaling server when it starts an RTP pipe
_current_peer_id: str = "unknown"
_current_room_id: str = "unknown"


@sio.event
async def connect():
    print("Connected to signaling server")


@sio.on("rtp-context")
async def on_rtp_context(data):
    """Signaling server sends peerId/roomId when it opens an RTP pipe."""
    global _current_peer_id, _current_room_id
    _current_peer_id = data.get("peerId", "unknown")
    _current_room_id = data.get("roomId", "unknown")
    print(f"RTP context updated: peer={_current_peer_id}, room={_current_room_id}")


def audio_callback(payload: bytes) -> None:
    """Sync callback called from the RTPReceiver thread.

    Schedules the async emit onto the running event loop so we don't block
    the receiver thread and don't violate the async socketio client's
    thread-safety requirement.
    """
    processed = vad.process(payload) if vad else None
    if processed and transcriber:
        text, lang = transcriber.transcribe(processed)
        print(f"Transcribed ({lang}): {text}")

        # Schedule coroutine from a non-async context
        loop = asyncio.get_event_loop()
        asyncio.run_coroutine_threadsafe(
            sio.emit(
                "transcript-from-ai",
                {
                    "text": text,
                    "isFinal": True,
                    "sourceLanguage": lang,
                    "peerId": _current_peer_id,
                    "roomId": _current_room_id,
                },
            ),
            loop,
        )


@app.on_event("startup")
async def startup_event():
    global vad, transcriber, receiver

    vad = VADProcessor()
    transcriber = Transcriber()

    server_url = os.getenv("SERVER_URL", "http://server:3000")  # overridable via env
    try:
        await sio.connect(server_url)
    except Exception as e:
        print(f"Failed to connect to signaling server: {e}")

    receiver = RTPReceiver(port=5000, callback=audio_callback)
    receiver.start()


@app.on_event("shutdown")
async def shutdown_event():
    if receiver:
        receiver.stop()
    if sio.connected:
        await sio.disconnect()


@app.get("/")
async def root():
    return {"status": "AI Service Running"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
