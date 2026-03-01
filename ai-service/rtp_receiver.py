import socket
import threading
from typing import Callable

class RTPReceiver:
    def __init__(self, port: int, callback: Callable[[bytes], None]):
        self.port = port
        self.callback = callback
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.socket.bind(('0.0.0.0', self.port))
        self.running = False

    def start(self):
        self.running = True
        self.thread = threading.Thread(target=self._run)
        self.thread.start()
        print(f"RTP Receiver listening on port {self.port}")

    def _run(self):
        while self.running:
            try:
                data, addr = self.socket.recvfrom(2048)
                # RTP header is 12 bytes
                payload = data[12:]
                self.callback(payload)
            except Exception as e:
                print(f"RTP Receiver error: {e}")
                break

    def stop(self):
        self.running = False
        self.socket.close()
