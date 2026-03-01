import webrtcvad
import collections

class VADProcessor:
    def __init__(self, aggressiveness=2):
        self.vad = webrtcvad.Vad(aggressiveness)
        self.frame_duration_ms = 30
        self.padding_duration_ms = 300
        self.num_padding_frames = self.padding_duration_ms // self.frame_duration_ms
        self.ring_buffer = collections.deque(maxlen=self.num_padding_frames)
        self.triggered = False
        self.voiced_frames = []

    def process(self, frame_pcm):
        """
        frame_pcm: 16-bit PCM audio data at 16000Hz or 48000Hz
        Returns: complete utterance bytes if detected, else None
        """
        is_speech = self.vad.is_speech(frame_pcm, 16000) # Assuming 16k sampled audio

        if not self.triggered:
            self.ring_buffer.append((frame_pcm, is_speech))
            num_voiced = len([f for f, speech in self.ring_buffer if speech])
            if num_voiced > 0.9 * self.ring_buffer.maxlen:
                self.triggered = True
                for f, s in self.ring_buffer:
                    self.voiced_frames.append(f)
                self.ring_buffer.clear()
        else:
            self.voiced_frames.append(frame_pcm)
            self.ring_buffer.append((frame_pcm, is_speech))
            num_unvoiced = len([f for f, speech in self.ring_buffer if not speech])
            if num_unvoiced > 0.9 * self.ring_buffer.maxlen:
                self.triggered = False
                utterance = b''.join(self.voiced_frames)
                self.voiced_frames = []
                self.ring_buffer.clear()
                return utterance
        return None
