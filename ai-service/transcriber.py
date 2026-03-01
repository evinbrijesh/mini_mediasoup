from faster_whisper import WhisperModel
import io
import numpy as np

class Transcriber:
    def __init__(self, model_size="base", device="cpu", compute_type="int8"):
        self.model = WhisperModel(model_size, device=device, compute_type=compute_type)

    def transcribe(self, audio_bytes: bytes):
        """
        audio_bytes: Raw PCM data
        """
        # Convert bytes to numpy array (float32)
        audio_data = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
        
        segments, info = self.model.transcribe(audio_data, beam_size=5)
        
        text = ""
        for segment in segments:
            text += segment.text
            
        return text.strip(), info.language
