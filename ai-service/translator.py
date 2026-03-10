import requests
import os
from typing import Optional


class Translator:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("DEEPL_API_KEY")
        # DeepL free-tier keys end with ":fx"; paid keys use the non-free endpoint.
        if self.api_key and self.api_key.endswith(":fx"):
            self.url = "https://api-free.deepl.com/v2/translate"
        else:
            self.url = "https://api.deepl.com/v2/translate"

    def translate(self, text: str, target_lang: str) -> str:
        if not self.api_key:
            return text  # Fallback – no key configured

        params = {
            "auth_key": self.api_key,
            "text": text,
            "target_lang": target_lang.upper(),
        }

        try:
            response = requests.post(self.url, data=params)
            response.raise_for_status()
            result = response.json()
            return result["translations"][0]["text"]
        except Exception as e:
            print(f"Translation error: {e}")
            return text
