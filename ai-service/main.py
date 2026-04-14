import os
from typing import Optional

import socketio
import uvicorn
from fastapi import FastAPI

from rtp_receiver import RTPReceiver
from transcriber import Transcriber
from vad import VADProcessor

app = FastAPI()

sio = socketio.Client(reconnection=True)
vad: Optional[VADProcessor] = None
transcriber: Optional[Transcriber] = None
receiver: Optional[RTPReceiver] = None


@sio.event
def connect():
    print("Connected to signaling server")


@sio.event
def disconnect():
    print("Disconnected from signaling server")


def _emit_transcript(text: str, source_language: str):
    room_id = os.getenv("AI_ROOM_ID")
    if not room_id:
        return

    if not sio.connected:
        return

    sio.emit(
        "transcript-from-ai",
        {
            "roomId": room_id,
            "peerId": "ai-service",
            "text": text,
            "isFinal": True,
            "sourceLanguage": source_language,
        },
    )


def audio_callback(payload: bytes):
    if not vad or not transcriber:
        return

    processed = vad.process(payload)
    if not processed:
        return

    text, lang = transcriber.transcribe(processed)
    if not text:
        return

    print(f"Transcribed ({lang}): {text}")
    _emit_transcript(text, lang)


@app.on_event("startup")
async def startup_event():
    global vad, transcriber, receiver

    signaling_url = os.getenv("SIGNALING_URL", "http://server:3000")
    sample_rate = int(os.getenv("AI_SAMPLE_RATE", "16000"))
    model_size = os.getenv("WHISPER_MODEL_SIZE", "base")
    model_device = os.getenv("WHISPER_DEVICE", "cpu")
    model_compute = os.getenv("WHISPER_COMPUTE_TYPE", "int8")

    vad = VADProcessor(sample_rate=sample_rate)
    transcriber = Transcriber(
        model_size=model_size,
        device=model_device,
        compute_type=model_compute,
        sample_rate=sample_rate,
    )

    receiver = RTPReceiver(
        port=int(os.getenv("AI_RTP_PORT", "5000")),
        callback=audio_callback,
    )
    receiver.start()

    auth_payload = None
    socket_token = os.getenv("AI_SOCKET_TOKEN")
    if socket_token:
        auth_payload = {"token": socket_token}

    try:
        sio.connect(
            signaling_url,
            auth=auth_payload,
            wait_timeout=5,
            transports=["websocket"],
        )
    except Exception as e:
        print(f"Failed to connect to signaling server: {e}")


@app.on_event("shutdown")
async def shutdown_event():
    global receiver

    if receiver:
        receiver.stop()
        receiver = None

    if sio.connected:
        sio.disconnect()


@app.get("/")
async def root():
    return {"status": "AI Service Running"}


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "socketConnected": sio.connected,
        "rtpReceiverRunning": bool(receiver and receiver.running),
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
