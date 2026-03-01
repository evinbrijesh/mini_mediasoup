import requests
import os

class Translator:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("DEEPL_API_KEY")
        self.url = "https://api-free.deepl.com/v2/translate"

    def translate(self, text: str, target_lang: str):
        if not self.api_key:
            return text # Fallback
            
        params = {
            "auth_key": self.api_key,
            "text": text,
            "target_lang": target_lang.upper()
        }
        
        try:
            response = requests.post(self.url, data=params)
            response.raise_for_status()
            result = response.json()
            return result["translations"][0]["text"]
        except Exception as e:
            print(f"Translation error: {e}")
            return text
