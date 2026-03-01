import socketio

sio = socketio.Client()

@sio.event
def connect():
    print("Connected to signaling server")

@app.on_event("startup")
async def startup_event():
    try:
        sio.connect("http://localhost:3000")
    except Exception as e:
        print(f"Failed to connect to signaling server: {e}")

def audio_callback(payload: bytes):
    processed = vad.process(payload)
    if processed:
        text, lang = transcriber.transcribe(processed)
        print(f"Transcribed ({lang}): {text}")
        
        # Emit transcript to signaling server
        sio.emit('transcript-from-ai', {
            'text': text,
            'isFinal': True,
            'sourceLanguage': lang,
            'peerId': 'placeholder' # Needs real peer mapping
        })

@app.get("/")
async def root():
    return {"status": "AI Service Running"}

if __name__ == "__main__":
    vad = VADProcessor()
    receiver = RTPReceiver(port=5000, callback=audio_callback)
    receiver.start()
    uvicorn.run(app, host="0.0.0.0", port=8000)
