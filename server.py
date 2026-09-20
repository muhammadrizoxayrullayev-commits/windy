"""
Windy Typing Server - 24/7 Production Python HTTP Server
Zero dependencies, built-in security headers, instant local hosting
"""

import http.server
import socketserver
import os
import sys
import json
import time

PORT = int(os.environ.get('PORT', 3000))
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

START_TIME = time.time()

class WindyRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Security headers
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'SAMEORIGIN')
        self.send_header('X-XSS-Protection', '1; mode=block')
        self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
        self.send_header('Server', 'Windy/1.0.0')
        super().end_headers()

    def do_GET(self):
        if self.path in ('/health', '/api/status'):
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            uptime = int(time.time() - START_TIME)
            response = json.dumps({
                "server": "Windy Typing Server",
                "status": "active",
                "uptimeSeconds": uptime,
                "languages": [
                    "uzbek_latin", "uzbek_cyrillic", "japanese_romaji",
                    "japanese_kana", "english", "russian", "arabic", "spanish", "german"
                ]
            })
            self.wfile.write(response.encode('utf-8'))
            return

        return super().do_GET()

class ThreadingHTTPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True

if __name__ == '__main__':
    os.chdir(DIRECTORY)
    with ThreadingHTTPServer(('0.0.0.0', PORT), WindyRequestHandler) as httpd:
        print(f"===============================================================")
        print(f"                     WINDY TYPING SERVER                       ")
        print(f"                    Running 24/7 & Secure                      ")
        print(f"===============================================================")
        print(f"  Local:   http://localhost:{PORT}")
        print(f"  Network: http://0.0.0.0:{PORT}")
        print(f"  Health:  http://localhost:{PORT}/health")
        print(f"===============================================================")
        print("Press Ctrl+C to stop.\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down Windy server...")
            httpd.shutdown()
