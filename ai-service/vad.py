import webrtcvad
import collections
import audioop  # stdlib – resample 48kHz → 16kHz

# webrtcvad only accepts these frame durations (ms) at these sample rates:
# sample rate 16000 → valid frame sizes: 160, 320, 480 bytes (10/20/30 ms × 2 bytes/sample)
_SAMPLE_RATE = 16000
_FRAME_DURATION_MS = 30  # 30 ms
_BYTES_PER_SAMPLE = 2  # 16-bit PCM
_FRAME_SIZE = (
    int(_SAMPLE_RATE * _FRAME_DURATION_MS / 1000) * _BYTES_PER_SAMPLE
)  # 960 bytes


def _resample_48k_to_16k(pcm_48k: bytes) -> bytes:
    """Down-sample 48 kHz 16-bit mono PCM to 16 kHz using the stdlib audioop."""
    # audioop.ratecv signature: (data, width, nchannels, inrate, outrate, state)
    resampled, _ = audioop.ratecv(pcm_48k, _BYTES_PER_SAMPLE, 1, 48000, 16000, None)
    return resampled


class VADProcessor:
    def __init__(self, aggressiveness: int = 2, input_sample_rate: int = 48000):
        self.vad = webrtcvad.Vad(aggressiveness)
        self.input_sample_rate = input_sample_rate
        self.padding_duration_ms = 300
        num_padding_frames = self.padding_duration_ms // _FRAME_DURATION_MS
        self.ring_buffer: collections.deque = collections.deque(
            maxlen=num_padding_frames
        )
        self.triggered = False
        self.voiced_frames: list = []
        # Accumulate partial frames until we have exactly _FRAME_SIZE bytes
        self._buf = b""

    def process(self, raw_payload: bytes):
        """
        raw_payload: Opus-decoded, raw 16-bit PCM at `input_sample_rate` Hz (mono).
        Returns: complete utterance bytes (16 kHz PCM) if an utterance ended, else None.

        Callers are responsible for Opus decoding before passing data here.
        """
        # 1. Resample to 16 kHz if the source is 48 kHz
        if self.input_sample_rate == 48000:
            pcm_16k = _resample_48k_to_16k(raw_payload)
        else:
            pcm_16k = raw_payload

        # 2. Accumulate into the internal buffer and process complete frames only
        self._buf += pcm_16k
        result = None

        while len(self._buf) >= _FRAME_SIZE:
            frame = self._buf[:_FRAME_SIZE]
            self._buf = self._buf[_FRAME_SIZE:]
            result = self._process_frame(frame)
            if result is not None:
                return result

        return None

    def _process_frame(self, frame_pcm: bytes):
        """Process one correctly-sized 16 kHz PCM frame through the VAD state machine."""
        is_speech = self.vad.is_speech(frame_pcm, _SAMPLE_RATE)
        maxlen: int = (
            self.ring_buffer.maxlen or 1
        )  # maxlen is always set; guard for typing

        if not self.triggered:
            self.ring_buffer.append((frame_pcm, is_speech))
            num_voiced = len([f for f, speech in self.ring_buffer if speech])
            if num_voiced > 0.9 * maxlen:
                self.triggered = True
                for f, _ in self.ring_buffer:
                    self.voiced_frames.append(f)
                self.ring_buffer.clear()
        else:
            self.voiced_frames.append(frame_pcm)
            self.ring_buffer.append((frame_pcm, is_speech))
            num_unvoiced = len([f for f, speech in self.ring_buffer if not speech])
            if num_unvoiced > 0.9 * maxlen:
                self.triggered = False
                utterance = b"".join(self.voiced_frames)
                self.voiced_frames = []
                self.ring_buffer.clear()
                return utterance

        return None
