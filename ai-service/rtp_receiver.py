import socket
import threading
from typing import Callable


class RTPReceiver:
    def __init__(self, port: int, callback: Callable[[bytes], None]):
        self.port = port
        self.callback = callback
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.socket.bind(("0.0.0.0", self.port))
        self.running = False
        self.thread = None

    def start(self):
        self.running = True
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()
        print(f"RTP Receiver listening on port {self.port}")

    def _run(self):
        while self.running:
            try:
                data, _addr = self.socket.recvfrom(4096)

                # Minimum RTP header size
                if len(data) < 12:
                    continue

                # RTP header parsing
                # Byte 0: V(2), P(1), X(1), CC(4)
                # Byte 1: M(1), PT(7)
                # Byte 2-3: sequence
                # Byte 4-7: timestamp
                # Byte 8-11: SSRC
                cc = data[0] & 0x0F
                x = (data[0] >> 4) & 0x01

                header_len = 12 + (cc * 4)
                if len(data) < header_len:
                    continue

                # RTP header extension
                if x == 1:
                    if len(data) < header_len + 4:
                        continue
                    ext_len_words = int.from_bytes(
                        data[header_len + 2 : header_len + 4], byteorder="big"
                    )
                    header_len += 4 + (ext_len_words * 4)
                    if len(data) < header_len:
                        continue

                payload = data[header_len:]
                if not payload:
                    continue

                self.callback(payload)
            except Exception as e:
                if not self.running:
                    break
                print(f"RTP Receiver error: {e}")
                break

    def stop(self):
        self.running = False
        try:
            self.socket.close()
        finally:
            if self.thread and self.thread.is_alive():
                self.thread.join(timeout=1.0)
