#!/usr/bin/env python3
"""Local static server for Lantern Lancers.

Serves this directory on 127.0.0.1. The default port comes from arcade.json
(8811) and walks forward if that port is already taken. Opens a browser
unless --no-browser is passed.
"""

from __future__ import annotations

import argparse
import mimetypes
import os
import socket
import sys
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8811

mimetypes.add_type("text/javascript", ".js")
mimetypes.add_type("application/json", ".json")
mimetypes.add_type("image/jpeg", ".jpg")


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


def port_is_free(host, port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        try:
            sock.bind((host, port))
        except OSError:
            return False
    return True


def choose_port(host, preferred, span=20):
    if preferred == 0:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.bind((host, 0))
            return sock.getsockname()[1]
    for offset in range(span):
        port = preferred + offset
        if port > 65535:
            break
        if port_is_free(host, port):
            return port
    raise SystemExit(f"No free port in {preferred}-{preferred + span - 1}")


def parse_args(argv):
    parser = argparse.ArgumentParser(description="Serve Lantern Lancers locally")
    parser.add_argument("--host", default=DEFAULT_HOST)
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--no-browser", action="store_true")
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(sys.argv[1:] if argv is None else argv)
    os.chdir(ROOT)
    if args.port == 0:
        server = ThreadingHTTPServer((args.host, 0), Handler)
    else:
        port = choose_port(args.host, args.port)
        server = ThreadingHTTPServer((args.host, port), Handler)
    host, port = server.server_address
    url = f"http://{host}:{port}/"
    # Print only after the socket is listening so clients can connect immediately.
    print(f"LANTERN_URL={url}", flush=True)
    if args.port not in (0, port):
        print(f"Port {args.port} was busy; using {port}.", flush=True)
    if not args.no_browser:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
