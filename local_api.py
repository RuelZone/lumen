"""Small localhost-only HTTP bridge between Next.js and rag_backend.py."""

import json
from http.server import BaseHTTPRequestHandler, HTTPServer

from rag_backend import ask_chatbot, get_all_patients


HOST = "127.0.0.1"
PORT = 8765


class Handler(BaseHTTPRequestHandler):
    def _json(self, data: dict | list, status: int = 200) -> None:
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path == "/health":
            self._json({"ok": True})
        elif self.path == "/patients":
            self._json(get_all_patients())
        else:
            self._json({"error": "Not found"}, 404)

    def do_POST(self) -> None:
        if self.path != "/chat":
            self._json({"error": "Not found"}, 404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 32_000:
                self._json({"error": "Request body is empty or too large"}, 400)
                return
            payload = json.loads(self.rfile.read(length))
            patient_id = str(payload.get("patientId", "")).strip()
            question = str(payload.get("question", "")).strip()
            if not patient_id or not question:
                self._json({"error": "patientId and question are required"}, 400)
                return
            answer, sources = ask_chatbot(patient_id, question)
            self._json({"answer": answer, "sources": sources})
        except (json.JSONDecodeError, AttributeError, TypeError):
            self._json({"error": "Invalid JSON request"}, 400)
        except Exception:
            # Do not return local file paths or patient data in error messages.
            self._json({"error": "The local assistant could not answer this question"}, 500)

    def log_message(self, format: str, *args: object) -> None:
        # Avoid logging request details in the console.
        return


if __name__ == "__main__":
    print(f"Lumen local backend ready at http://{HOST}:{PORT}")
    HTTPServer((HOST, PORT), Handler).serve_forever()
