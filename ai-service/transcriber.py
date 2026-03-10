from faster_whisper import WhisperModel
import io
import numpy as np

# Optional Opus decoder – used only when RTP payloads arrive Opus-encoded.
# If opuslib is not installed the transcriber still works with raw PCM input.
try:
    import opuslib

    _opus_decoder = opuslib.Decoder(48000, 1)  # 48 kHz, mono
    _HAS_OPUSLIB = True
except ImportError:
    _opus_decoder = None
    _HAS_OPUSLIB = False

_OPUS_FRAME_SIZE = 960  # samples @ 48 kHz (20 ms)


def _decode_opus_to_pcm16k(opus_bytes: bytes) -> bytes:
    """Decode one Opus packet and return 16 kHz 16-bit mono PCM.

    Falls back to treating the input as raw PCM when opuslib is unavailable.
    """
    if not _HAS_OPUSLIB or _opus_decoder is None:
        # No decoder – assume input is already raw PCM (best-effort fallback)
        return opus_bytes

    try:
        # Decode to 48 kHz PCM (16-bit mono)
        pcm_48k: bytes = _opus_decoder.decode(opus_bytes, _OPUS_FRAME_SIZE)
        # Downsample 48kHz → 16kHz via stdlib audioop
        import audioop

        pcm_16k, _ = audioop.ratecv(pcm_48k, 2, 1, 48000, 16000, None)
        return pcm_16k
    except Exception as e:
        print(f"Opus decode error: {e}")
        return opus_bytes  # fallback


class Transcriber:
    def __init__(
        self,
        model_size: str = "base",
        device: str = "cpu",
        compute_type: str = "int8",
        input_is_opus: bool = True,
    ):
        self.model = WhisperModel(model_size, device=device, compute_type=compute_type)
        self.input_is_opus = input_is_opus

    def transcribe(self, audio_bytes: bytes):
        """
        audio_bytes: Either Opus-encoded packets (when input_is_opus=True, default)
                     or raw 16-bit PCM at 16 kHz.
        Returns: (text, language) tuple.
        """
        if self.input_is_opus:
            audio_bytes = _decode_opus_to_pcm16k(audio_bytes)

        # Convert bytes to float32 numpy array normalised to [-1, 1]
        audio_data = (
            np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
        )

        segments, info = self.model.transcribe(audio_data, beam_size=5)

        text = ""
        for segment in segments:
            text += segment.text

        return text.strip(), info.language
