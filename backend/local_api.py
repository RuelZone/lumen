"""Small localhost-only HTTP bridge between Next.js and rag_backend.py."""

import json
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import unquote

WHISPER_DIR = Path(__file__).resolve().parents[1] / "whisper"
if str(WHISPER_DIR) not in sys.path:
    sys.path.insert(0, str(WHISPER_DIR))

from command_router import command_to_dict, route_command

from consultation_service import (
    MAX_AUDIO_BYTES,
    process_consultation_audio,
    save_consultation_report,
    summarize_consultation,
    transcribe_uploaded_audio,
)
from rag_backend import (
    ask_chatbot,
    ask_procedure_guide,
    get_all_patients,
    get_patient_record,
    sync_patients_from_json,
)
from similar_records import find_similar_records


HOST = "127.0.0.1"
PORT = 8765
LATEST_VOICE_COMMAND: dict | None = None
VOICE_COMMAND_LOCK = threading.Lock()
VOICE_ACTIVITY = {
    "recording": False,
    "processing": False,
    "consultationActive": False,
    "transcript": "",
    "transcriptAt": 0,
    "updatedAt": 0,
}


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
        elif self.path.startswith("/patients/"):
            patient_id = unquote(self.path.removeprefix("/patients/").split("?", 1)[0])
            patient = get_patient_record(patient_id)
            if patient is None:
                self._json({"error": "Patient not found"}, 404)
            else:
                self._json(patient)
        elif self.path == "/voice-status":
            with VOICE_COMMAND_LOCK:
                activity = dict(VOICE_ACTIVITY)
            self._json({"voiceActivity": activity})
        elif self.path == "/voice-command":
            global LATEST_VOICE_COMMAND
            with VOICE_COMMAND_LOCK:
                command = LATEST_VOICE_COMMAND
                LATEST_VOICE_COMMAND = None
                activity = dict(VOICE_ACTIVITY)
            self._json({
                "pending": command is not None,
                "voiceActivity": activity,
                **({"command": command} if command else {}),
            })
        else:
            self._json({"error": "Not found"}, 404)

    def do_POST(self) -> None:
        if self.path == "/procedures":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if length <= 0 or length > 16_000:
                    self._json({"error": "Request body is empty or too large."}, 400)
                    return
                payload = json.loads(self.rfile.read(length))
                if not isinstance(payload, dict) or set(payload) != {"question"}:
                    self._json(
                        {"error": "Procedure searches accept only a general question; patient data is not accepted."},
                        400,
                    )
                    return
                question = str(payload.get("question", "")).strip()
                if not question or len(question) > 4_000:
                    self._json({"error": "A procedure question under 4,000 characters is required."}, 400)
                    return
                answer, citations = ask_procedure_guide(question)
                self._json({"answer": answer, "citations": citations})
            except (json.JSONDecodeError, UnicodeDecodeError, AttributeError, TypeError, ValueError) as error:
                self._json({"error": str(error)}, 400)
            except Exception:
                self._json({"error": "The local procedure guide could not answer this question."}, 500)
            return

        if self.path == "/voice-status":
            global VOICE_ACTIVITY
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if length <= 0 or length > 12_000:
                    self._json({"error": "Request body is empty or too large."}, 400)
                    return
                payload = json.loads(self.rfile.read(length))
                if not isinstance(payload, dict):
                    self._json({"error": "Expected a JSON object."}, 400)
                    return
                with VOICE_COMMAND_LOCK:
                    VOICE_ACTIVITY = {
                        "recording": bool(payload.get("recording", VOICE_ACTIVITY["recording"])),
                        "processing": bool(payload.get("processing", VOICE_ACTIVITY["processing"])),
                        "consultationActive": bool(payload.get(
                            "consultationActive",
                            VOICE_ACTIVITY.get("consultationActive", False),
                        )),
                        "transcript": VOICE_ACTIVITY["transcript"],
                        "transcriptAt": VOICE_ACTIVITY["transcriptAt"],
                        "updatedAt": int(time.time() * 1000),
                    }
                    if "transcript" in payload:
                        transcript = str(payload.get("transcript", ""))[:10_000]
                        VOICE_ACTIVITY["transcript"] = transcript
                        VOICE_ACTIVITY["transcriptAt"] = VOICE_ACTIVITY["updatedAt"]
                self._json({"ok": True})
            except (json.JSONDecodeError, UnicodeDecodeError, AttributeError, TypeError):
                self._json({"error": "Invalid voice status request."}, 400)
            return

        if self.path == "/voice-command":
            global LATEST_VOICE_COMMAND
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if length <= 0 or length > 32_000:
                    self._json({"error": "Request body is empty or too large."}, 400)
                    return
                payload = json.loads(self.rfile.read(length))
                if not isinstance(payload, dict):
                    self._json({"error": "Expected a JSON object."}, 400)
                    return
                transcript = str(payload.get("transcript", "")).strip()
                if not transcript:
                    self._json({"error": "transcript is required."}, 400)
                    return

                command = route_command(transcript, get_all_patients())
                command_data = command_to_dict(command)
                if command.type == "open_patient" and not command.error:
                    patient = next(
                        (item for item in get_all_patients() if str(item["name"]).casefold() == str(command.value).casefold()),
                        None,
                    )
                    if patient:
                        command_data["value"] = str(patient["id"])
                        command_data["patientName"] = patient["name"]
                        command_data["route"] = f"/patients/{patient['id']}"
                    else:
                        command_data["error"] = f"Patient '{command.value}' was not found in the local roster."

                with VOICE_COMMAND_LOCK:
                    LATEST_VOICE_COMMAND = command_data
                    if command.type == "start_consultation" and not command.error:
                        VOICE_ACTIVITY["consultationActive"] = True
                        VOICE_ACTIVITY["updatedAt"] = int(time.time() * 1000)
                self._json({"ok": True, "command": command_data})
            except (json.JSONDecodeError, UnicodeDecodeError):
                self._json({"error": "Invalid JSON request."}, 400)
            except (AttributeError, TypeError, ValueError):
                self._json({"error": "Voice command could not be understood."}, 400)
            except Exception:
                self._json({"error": "The local assistant could not process this voice command."}, 500)
            return

        if self.path == "/similar-records":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if length <= 0 or length > 32_000:
                    self._json({"error": "Request body is empty or too large."}, 400)
                    return
                payload = json.loads(self.rfile.read(length))
                if not isinstance(payload, dict):
                    self._json({"error": "Expected a JSON object."}, 400)
                    return
                patient_id = str(payload.get("patientId", "")).strip()
                note_id = str(payload.get("noteId", "")).strip() or None
                query_text = str(payload.get("queryText", "")).strip() or None
                limit = int(payload.get("limit", 5))
                if not patient_id:
                    self._json({"error": "patientId is required."}, 400)
                    return
                records = find_similar_records(patient_id, note_id, query_text, limit)
                self._json({"records": records, "count": len(records)})
            except (json.JSONDecodeError, AttributeError, TypeError, ValueError) as error:
                self._json({"error": str(error)}, 400)
            except Exception:
                self._json({"error": "The local assistant could not find similar records."}, 500)
            return

        if self.path == "/transcribe":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if length <= 0 or length > MAX_AUDIO_BYTES:
                    self._json({"error": "Recording is empty or exceeds the 100 MB limit."}, 400)
                    return
                result = transcribe_uploaded_audio(self.rfile.read(length))
                self._json(result)
            except ValueError as error:
                self._json({"error": str(error)}, 400)
            except RuntimeError as error:
                self._json({"error": str(error)}, 503)
            except Exception:
                self._json({"error": "The local assistant could not transcribe this recording."}, 500)
            return

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
    synced = sync_patients_from_json()
    if synced:
        print(f"Synced {synced} patients from patients.json")
    print(f"Lumen local backend ready at http://{HOST}:{PORT}")
    HTTPServer((HOST, PORT), Handler).serve_forever()
