from faster_whisper import WhisperModel
import numpy as np


class Transcriber:
    def __init__(
        self, model_size="base", device="cpu", compute_type="int8", sample_rate=16000
    ):
        self.model = WhisperModel(model_size, device=device, compute_type=compute_type)
        self.sample_rate = sample_rate

    def transcribe(self, audio_bytes: bytes):
        """
        audio_bytes: Raw PCM data
        """
        # Convert bytes to numpy array (float32)
        audio_data = (
            np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
        )

        segments, info = self.model.transcribe(audio_data, beam_size=5, language=None)

        text = ""
        for segment in segments:
            text += segment.text

        return text.strip(), info.language
