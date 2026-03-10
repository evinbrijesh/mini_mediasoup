import socket
import threading
from typing import Callable

# Minimum and maximum valid RTP payload offsets:
#   Fixed header = 12 bytes
#   CSRC list    = CC * 4 bytes  (CC is bits 0-3 of byte 0)
#   Extension    = 4 + ext_len*4 bytes if X bit (bit 4 of byte 0) is set


def _rtp_payload_offset(data: bytes) -> int:
    """Return the byte offset where the RTP payload starts."""
    if len(data) < 12:
        return len(data)  # malformed – skip entirely

    cc = data[0] & 0x0F  # CSRC count
    has_extension = bool(data[0] & 0x10)

    offset = 12 + cc * 4  # fixed header + CSRC list

    if has_extension:
        if len(data) < offset + 4:
            return len(data)  # malformed extension header
        ext_len = int.from_bytes(data[offset + 2 : offset + 4], "big")
        offset += 4 + ext_len * 4

    return offset


class RTPReceiver:
    def __init__(self, port: int, callback: Callable[[bytes], None]):
        self.port = port
        self.callback = callback
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.socket.bind(("0.0.0.0", self.port))
        self.running = False

    def start(self):
        self.running = True
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()
        print(f"RTP Receiver listening on port {self.port}")

    def _run(self):
        while self.running:
            try:
                data, _ = self.socket.recvfrom(4096)
                offset = _rtp_payload_offset(data)
                payload = data[offset:]
                if payload:
                    self.callback(payload)
            except Exception as e:
                print(f"RTP Receiver error: {e}")
                # continue – do NOT break; one bad packet must not kill the loop
                continue

    def stop(self):
        self.running = False
        self.socket.close()
