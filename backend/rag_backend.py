"""Local, single-doctor patient-note RAG backend."""

import hashlib
import json
import logging
import os
import sqlite3
import uuid
from datetime import date, datetime
from pathlib import Path

# Keep model libraries offline at runtime. Models must already be on disk/cache.
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"

import chromadb
from chromadb.config import Settings
from llama_cpp import Llama
from sentence_transformers import SentenceTransformer


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent
MODEL_NAMES = (
    "qwen2.5-3b-instruct-q4_k_m.gguf",
    "Qwen2.5-3B-Instruct-Q4_K_M.gguf",
)
MODEL_LOCATIONS = (
    BASE_DIR / "models",
    BASE_DIR.parent / "models",
)
MODEL_PATH = next(
    (
        directory / filename
        for directory in MODEL_LOCATIONS
        for filename in MODEL_NAMES
        if (directory / filename).is_file()
    ),
    MODEL_LOCATIONS[0] / MODEL_NAMES[0],
)

ROOT_DIR = BASE_DIR.parent
# Reuse the original project-root stores when upgrading from the earlier layout.
# On a fresh install, keep generated data alongside the backend instead.
DB_PATH = (
    ROOT_DIR / "hospital.db"
    if (ROOT_DIR / "hospital.db").is_file()
    else BASE_DIR / "hospital.db"
)
CHROMA_PATH = (
    ROOT_DIR / "chroma_db"
    if (ROOT_DIR / "chroma_db").is_dir()
    else BASE_DIR / "chroma_db"
)
COLLECTION_NAME = "patient_notes"

if not MODEL_PATH.is_file():
    raise FileNotFoundError(
        "Qwen GGUF model not found. Searched for either filename "
        f"{', '.join(MODEL_NAMES)} in: "
        f"{', '.join(str(directory) for directory in MODEL_LOCATIONS)}"
    )

# Load once per process. The embedding model must already be available locally.
llm = Llama(model_path=str(MODEL_PATH), n_ctx=4096, n_threads=max(1, min(4, os.cpu_count() or 1)), verbose=False)
try:
    embedder = SentenceTransformer("all-MiniLM-L6-v2", local_files_only=True)
except Exception as exc:
    raise RuntimeError(
        "The all-MiniLM-L6-v2 embedding model is not available in the local Hugging Face cache. "
        "Download it once before running this offline backend."
    ) from exc
chroma_client = chromadb.PersistentClient(
    path=str(CHROMA_PATH), settings=Settings(anonymized_telemetry=False)
)
collection = chroma_client.get_or_create_collection(
    name=COLLECTION_NAME,
    metadata={"hnsw:space": "cosine"},
    embedding_function=None,
)


def init_db() -> None:
    """Create the patient and note tables if they do not exist."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute(
            """CREATE TABLE IF NOT EXISTS patients (
                id TEXT PRIMARY KEY,
                name TEXT,
                age INTEGER
            )"""
        )
        conn.execute(
            """CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                patient_id TEXT NOT NULL,
                date TEXT,
                author TEXT,
                text TEXT NOT NULL,
                test_name TEXT,
                value REAL,
                flag_for_review INTEGER DEFAULT 0,
                FOREIGN KEY (patient_id) REFERENCES patients(id)
            )"""
        )


def _embed(text: str) -> list[float]:
    return embedder.encode(text, normalize_embeddings=True).tolist()


def _build_embedding_text(note: dict) -> str:
    """Build a semantically rich string for embedding that includes metadata.

    Combining the note text with its date, author, and test details gives the
    vector search much better signal for matching temporal, author-specific,
    and test-specific queries.
    """
    parts = []
    if note.get("date"):
        parts.append(f"Date: {note['date']}")
    if note.get("author"):
        parts.append(f"Author: {note['author']}")
    if note.get("test_name"):
        parts.append(f"Test: {note['test_name']}")
    if note.get("value") is not None:
        parts.append(f"Value: {note['value']}")
    parts.append(note.get("text", ""))
    return " | ".join(parts)


def _stable_note_id(patient_id: str, note: dict) -> str:
    identity = "\x1f".join(
        [patient_id, str(note.get("date", "")), str(note.get("author", "")), str(note.get("text", ""))]
    )
    return hashlib.sha256(identity.encode("utf-8")).hexdigest()


def _save_note(note: dict) -> dict:
    note = {
        "id": str(note.get("id") or uuid.uuid4()),
        "patient_id": str(note["patient_id"]),
        "date": str(note.get("date") or date.today().isoformat()),
        "author": str(note.get("author") or "Doctor"),
        "text": str(note["text"]),
        "test_name": note.get("test_name"),
        "value": note.get("value"),
        "flag_for_review": int(bool(note.get("flag_for_review", False))),
    }
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute(
            """INSERT OR IGNORE INTO notes
               (id, patient_id, date, author, text, test_name, value, flag_for_review)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            tuple(note[key] for key in ("id", "patient_id", "date", "author", "text", "test_name", "value", "flag_for_review")),
        )
    # Upsert also repairs a missing Chroma entry if SQLite already had this note.
    embedding_text = _build_embedding_text(note)
    collection.upsert(
        ids=[note["id"]],
        documents=[note["text"]],
        metadatas=[{"patient_id": note["patient_id"]}],
        embeddings=[_embed(embedding_text)],
    )
    return note


def ingest_patient(patient_dict: dict) -> None:
    """Insert one patient and their notes into SQLite and the local vector index."""
    patient_id = str(patient_dict["id"])
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT OR IGNORE INTO patients (id, name, age) VALUES (?, ?, ?)",
            (patient_id, patient_dict.get("name"), patient_dict.get("age")),
        )
    for source_note in patient_dict.get("notes", []):
        note = dict(source_note)
        note["patient_id"] = patient_id
        note["id"] = _stable_note_id(patient_id, note)
        _save_note(note)


def add_note(patient_id: str, author: str, text: str, note_date: str = None) -> dict:
    """Add a new note for an existing patient and return its stored fields."""
    init_db()
    return _save_note(
        {
            "patient_id": patient_id,
            "author": author,
            "text": text,
            "date": note_date or date.today().isoformat(),
        }
    )


def get_all_patients() -> list[dict]:
    """Return all patients as dictionaries containing id, name, and age."""
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute("SELECT id, name, age FROM patients ORDER BY name, id").fetchall()
    return [dict(row) for row in rows]


def ask_chatbot(patient_id: str, question: str, n_results: int = 8) -> tuple[str, list[str]]:
    """Answer a question using only the most relevant notes for this patient.

    Retrieves up to *n_results* notes via semantic search, always presents them
    in chronological order so the LLM can reason about trends and timelines,
    and uses an enriched system prompt that guides clinical reasoning.
    """
    init_db()
    if n_results < 1:
        raise ValueError("n_results must be at least 1")

    # Build an enriched query embedding so the vector search also matches on
    # metadata concepts (dates, test names, authors) not just raw note text.
    enriched_query = f"Patient question: {question}"
    result = collection.query(
        query_embeddings=[_embed(enriched_query)],
        n_results=n_results,
        where={"patient_id": str(patient_id)},
        include=["documents", "metadatas", "distances"],
    )
    note_ids = result.get("ids", [[]])[0] or []
    distances = result.get("distances", [[]])[0] or []

    # Filter out notes with very low relevance (cosine distance > 0.85 means
    # almost no semantic overlap). This prevents irrelevant filler context.
    if distances:
        note_ids = [
            nid for nid, dist in zip(note_ids, distances) if dist < 0.85
        ]
    if not note_ids:
        return "I don't have that information.", []

    placeholders = ",".join("?" for _ in note_ids)
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            f"""SELECT id, date, author, text, test_name, value
                FROM notes WHERE patient_id = ? AND id IN ({placeholders})""",
            [str(patient_id), *note_ids],
        ).fetchall()

    def parsed_date(value: str) -> date:
        try:
            return date.fromisoformat(value[:10])
        except (TypeError, ValueError):
            for date_format in ("%d %b %Y", "%d %B %Y", "%b %d, %Y"):
                try:
                    return datetime.strptime(value, date_format).date()
                except (TypeError, ValueError):
                    pass
        return date.min

    notes_by_id = {row["id"]: dict(row) for row in rows}

    # Always sort chronologically so the LLM sees a timeline regardless of
    # the question phrasing.  This is critical for trend / progression queries.
    ordered_ids = sorted(
        note_ids,
        key=lambda nid: parsed_date(str(notes_by_id.get(nid, {}).get("date") or "")),
    )

    sources = []
    for note_id in ordered_ids:
        note = notes_by_id.get(note_id)
        if not note:
            continue
        test_details = ""
        if note["test_name"]:
            test_details = f"\n  Test: {note['test_name']}"
            if note["value"] is not None:
                test_details += f"  |  Result: {note['value']}"
        sources.append(
            f"Date: {note['date'] or 'Not recorded'}\n"
            f"  Author: {note['author'] or 'Not recorded'}"
            f"{test_details}\n"
            f"  Note: {note['text']}"
        )
    if not sources:
        return "I don't have that information.", []

    context = "\n\n---\n\n".join(f"[Note {i + 1}]\n{text}" for i, text in enumerate(sources))

    # Prompt structure optimised for a small (3B) local model:
    # - Keep the system prompt short and assertive so the model doesn't ignore it.
    # - Place the question BEFORE the notes so the model reads intent first.
    # - Include one concrete example so the model sees the expected output shape.
    system_prompt = (
        "You are a medical records assistant. Answer the doctor's question using ONLY the "
        "patient notes provided. Summarize the relevant facts, cite dates and authors. "
        "If the notes only partially answer the question, answer what you can and say what "
        "is not documented. If the notes have the same test on different dates, describe "
        "the trend. Never add medical knowledge that is not in the notes."
    )
    # One-shot example so the model sees the expected behavior with small context.
    example_user = (
        "Question: What medication is the patient on?\n\n"
        "Patient notes:\n"
        "[Note 1]\nDate: 2026-09-01\n  Author: Dr. A\n  Note: Started on Metformin 500mg twice daily."
    )
    example_assistant = (
        "According to Dr. A's note from 2026-09-01, the patient was started on Metformin 500mg twice daily."
    )

    response = llm.create_chat_completion(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": example_user},
            {"role": "assistant", "content": example_assistant},
            {
                "role": "user",
                "content": f"Question: {question}\n\nPatient notes:\n{context}",
            },
        ],
        max_tokens=512,
        temperature=0.2,
    )
    answer = response["choices"][0]["message"]["content"].strip()
    return answer or "I don't have that information.", sources


def summarize_patient(patient_id: str) -> str:
    """Summarize all stored notes for one patient in date order."""
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """SELECT date, author, text, test_name, value, flag_for_review
               FROM notes WHERE patient_id = ? ORDER BY date ASC, id ASC""",
            (str(patient_id),),
        ).fetchall()
    if not rows:
        return "No notes are available for this patient."

    notes_text = "\n\n".join(
        f"Date: {row['date']} | Author: {row['author']}\n"
        f"Test: {row['test_name'] or 'Not specified'} | Value: {row['value'] if row['value'] is not None else 'Not specified'} | "
        f"Flag for review: {'yes' if row['flag_for_review'] else 'no'}\n"
        f"Note: {row['text']}"
        for row in rows
    )
    prompt = (
        "Summarize the patient record using only the notes below. Do not invent details. "
        "For each missing category, write 'Not documented'. Use these headings: "
        "Chief complaint; Current medications/treatment; Recent lab trends; Doctor's plan.\n\n"
        f"Patient notes in date order:\n{notes_text}\n\nSummary:"
    )
    response = llm.create_chat_completion(
        messages=[{"role": "user", "content": prompt}], max_tokens=700, temperature=0.1
    )
    return response["choices"][0]["message"]["content"].strip()


if __name__ == "__main__":
    init_db()
    patients_file = BASE_DIR / "patients.json"
    if not patients_file.is_file():
        raise FileNotFoundError(f"Add a JSON list of patient records at {patients_file}")
    with patients_file.open("r", encoding="utf-8") as file:
        patient_data = json.load(file)
    if isinstance(patient_data, dict):
        patient_data = patient_data.get("patients", [patient_data])
    for patient in patient_data:
        ingest_patient(patient)
    print(f"Patients ingested: {len(patient_data)}")

    if patient_data:
        first_patient_id = str(patient_data[0]["id"])
        print("\nPatient summary:")
        print(summarize_patient(first_patient_id))
        answer, used_sources = ask_chatbot(
            first_patient_id,
            "What is the latest creatinine level and is it trending up or down?",
        )
        print("\nChatbot answer:")
        print(answer)
        print("\nSources used:")
        for source in used_sources:
            print(f"- {source}")
    else:
        print("patients.json contains no patients; skipped the summary and chatbot examples.")
