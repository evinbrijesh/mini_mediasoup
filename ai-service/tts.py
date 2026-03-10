import requests
import os
from typing import Optional


class TTSProcessor:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("ELEVENLABS_API_KEY")
        self.voice_id = "21m00Tcm4TlvDq8ikWAM"  # Default Rachel voice

    def synthesize(self, text: str) -> Optional[bytes]:
        """Return the synthesized audio as bytes, or None on failure / missing key."""
        if not self.api_key:
            return None

        url = f"https://api.elevenlabs.io/v1/text-to-speech/{self.voice_id}"

        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": self.api_key,
        }

        data = {
            "text": text,
            "model_id": "eleven_turbo_v2",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.5,
            },
        }

        try:
            response = requests.post(url, json=data, headers=headers)
            response.raise_for_status()
            audio_bytes: bytes = response.content
            return audio_bytes
        except Exception as e:
            print(f"TTS error: {e}")
            return None
