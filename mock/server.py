import http.server, json, os

PORT = 3333
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MOCK = os.path.join(ROOT, "mock")

class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/api/luma":
            self.serve_json("luma.json")
        elif self.path == "/api/zaprite":
            self.serve_json("zaprite.json")
        else:
            self.serve_html()

    def serve_json(self, filename):
        with open(os.path.join(MOCK, filename), "rb") as f:
            data = f.read()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(data)

    def serve_html(self):
        with open(os.path.join(ROOT, "public", "index.html"), "rb") as f:
            data = f.read()
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *args):
        pass  # quiet

print(f"Mock server → http://localhost:{PORT}")
print("Edit mock/luma.json and mock/zaprite.json, then refresh.")
http.server.HTTPServer(("", PORT), Handler).serve_forever()
