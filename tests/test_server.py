"""Smoke test: server.py serves the game."""

from __future__ import annotations

import os
import socket
import subprocess
import sys
import unittest
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SERVER = os.path.join(ROOT, "server.py")


def _start(port):
    proc = subprocess.Popen(
        [sys.executable, SERVER, "--port", str(port), "--no-browser"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        cwd=ROOT,
    )
    assert proc.stdout is not None
    line = proc.stdout.readline()
    if not line:
        err = proc.stderr.read() if proc.stderr else ""
        proc.kill()
        raise RuntimeError(f"server produced no URL line: {err}")
    if "LANTERN_URL=" not in line:
        proc.kill()
        raise RuntimeError(f"unexpected server output: {line}")
    url = line.strip().split("LANTERN_URL=", 1)[1]
    return proc, url


def _stop(proc):
    if proc.poll() is None:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait(timeout=3)
    if proc.stdout:
        proc.stdout.close()
    if proc.stderr:
        proc.stderr.close()


class ServerSmokeTest(unittest.TestCase):
    def test_serves_index_and_modules(self):
        proc, url = _start(0)
        try:
            with urllib.request.urlopen(url + "index.html", timeout=5) as response:
                body = response.read()
                self.assertEqual(response.status, 200)
                self.assertIn(b"<canvas", body)
                self.assertIn(b"Lantern Lancers", body)
                self.assertIn(b"src/ui/main.js", body)
            with urllib.request.urlopen(url + "src/core/match.js", timeout=5) as response:
                ctype = response.headers.get("Content-Type", "")
                self.assertIn("javascript", ctype)
                self.assertIn(b"updateMatch", response.read())
            with urllib.request.urlopen(url + "arcade.json", timeout=5) as response:
                self.assertIn(b"lanternlancers", response.read())
        finally:
            _stop(proc)

    def test_port_falls_forward_when_busy(self):
        holder = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        holder.bind(("127.0.0.1", 0))
        holder.listen(1)
        busy = holder.getsockname()[1]
        proc = None
        try:
            proc, url = _start(busy)
            self.assertNotIn(f":{busy}/", url)
            with urllib.request.urlopen(url + "index.html", timeout=5) as response:
                self.assertEqual(response.status, 200)
        finally:
            holder.close()
            if proc is not None:
                _stop(proc)


if __name__ == "__main__":
    unittest.main()
