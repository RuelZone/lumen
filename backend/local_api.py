"""Small localhost-only HTTP bridge between Next.js and rag_backend.py."""

import json
from http.server import BaseHTTPRequestHandler, HTTPServer

from consultation_service import (
    MAX_AUDIO_BYTES,
    process_consultation_audio,
    save_consultation_report,
    summarize_consultation,
)
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
        if self.path == "/consultations/transcribe":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if length <= 0 or length > MAX_AUDIO_BYTES:
                    self._json({"error": "Recording is empty or exceeds the 100 MB limit."}, 400)
                    return
                patient_id = self.headers.get("X-Patient-Id", "").strip()
                if not patient_id:
                    self._json({"error": "patientId is required."}, 400)
                    return
                result = process_consultation_audio(patient_id, self.rfile.read(length))
                self._json(result)
            except ValueError as error:
                self._json({"error": str(error)}, 400)
            except RuntimeError as error:
                self._json({"error": str(error)}, 503)
            except Exception:
                self._json({"error": "The local assistant could not process this recording."}, 500)
            return

        if self.path in ("/consultations/summarize", "/consultations/save"):
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if length <= 0 or length > 10_000_000:
                    self._json({"error": "Request body is empty or too large."}, 400)
                    return
                payload = json.loads(self.rfile.read(length))
                patient_id = str(payload.get("patientId", "")).strip()
                if self.path == "/consultations/summarize":
                    report = summarize_consultation(
                        patient_id,
                        payload.get("segments"),
                        payload.get("speakerRoles"),
                    )
                    self._json({"report": report})
                else:
                    saved = save_consultation_report(
                        patient_id,
                        str(payload.get("report", "")),
                    )
                    self._json(saved)
            except (json.JSONDecodeError, AttributeError, TypeError):
                self._json({"error": "Invalid JSON request."}, 400)
            except ValueError as error:
                self._json({"error": str(error)}, 400)
            except Exception:
                self._json({"error": "The local assistant could not complete this request."}, 500)
            return

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
