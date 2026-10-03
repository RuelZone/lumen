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
PROCEDURE_COLLECTION_NAME = "clinical_procedures"
PROCEDURE_LIBRARY_PATH = BASE_DIR / "procedure_library.json"

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
procedure_collection = chroma_client.get_or_create_collection(
    name=PROCEDURE_COLLECTION_NAME,
    metadata={"hnsw:space": "cosine", "data_scope": "general_clinical_procedures"},
    embedding_function=None,
)


def _load_procedure_library() -> list[dict]:
    try:
        records = json.loads(PROCEDURE_LIBRARY_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError("The local procedure reference library could not be loaded.") from exc
    if not isinstance(records, list) or not records:
        raise RuntimeError("The local procedure reference library is empty or invalid.")
    return records


def _index_procedure_library() -> None:
    """Keep curated, non-patient procedure references in their own vector collection."""
    records = _load_procedure_library()
    procedure_collection.upsert(
        ids=[str(record["id"]) for record in records],
        documents=[
            f"Procedure: {record['procedure']}\n"
            f"Title: {record['title']}\n"
            f"Audience: {record['audience']}\n"
            f"Guidance: {record['content']}"
            for record in records
        ],
        metadatas=[
            {
                "title": str(record["title"]),
                "procedure": str(record["procedure"]),
                "audience": str(record["audience"]),
                "organization": str(record["organization"]),
                "source_title": str(record["source_title"]),
                "source_url": str(record["source_url"]),
                "source_checked_on": str(record["source_checked_on"]),
            }
            for record in records
        ],
        embeddings=[
            _embed(
                f"{record['procedure']} {record['title']} {record['audience']} {record['content']}"
            )
            for record in records
        ],
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


_index_procedure_library()


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
    """Return all patients with count and date of their latest note."""
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """SELECT p.id, p.name, p.age, COUNT(n.id) AS records,
                      MAX(n.date) AS lastUpdated
               FROM patients AS p LEFT JOIN notes AS n ON n.patient_id = p.id
               GROUP BY p.id, p.name, p.age ORDER BY p.name, p.id"""
        ).fetchall()
    return [dict(row) for row in rows]


def sync_patients_from_json() -> int:
    """Load local patient data, or the bundled synthetic fixture, and index notes."""
    patient_file = ROOT_DIR / "patients.json"
    if not patient_file.is_file():
        patient_file = ROOT_DIR / "patients.example.json"
    if not patient_file.is_file():
        return 0
    records = json.loads(patient_file.read_text(encoding="utf-8"))
    if isinstance(records, dict):
        records = records.get("patients", [])
    if not isinstance(records, list):
        raise ValueError("patients.json must contain a list of patient records.")
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        for record in records:
            if isinstance(record, dict) and record.get("id"):
                conn.execute(
                    """INSERT INTO patients (id, name, age) VALUES (?, ?, ?)
                       ON CONFLICT(id) DO UPDATE SET name=excluded.name, age=excluded.age""",
                    (str(record["id"]), record.get("name"), record.get("age")),
                )
    for record in records:
        if not isinstance(record, dict) or not record.get("id"):
            continue
        patient_id = str(record["id"])
        for source_note in record.get("notes", []):
            if not isinstance(source_note, dict) or not str(source_note.get("text", "")).strip():
                continue
            note = dict(source_note)
            note["patient_id"] = patient_id
            note["id"] = _stable_note_id(patient_id, note)
            _save_note(note)
    return len(records)


def get_patient_by_id(patient_id: str) -> dict | None:
    """Return one patient by ID without scanning the full patient list."""
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT id, name, age FROM patients WHERE id = ?",
            (str(patient_id),),
        ).fetchone()
    return dict(row) if row else None


def get_patient_record(patient_id: str) -> dict | None:
    """Return one patient and their saved notes for the chart page."""
    patient = get_patient_by_id(patient_id)
    if patient is None:
        return None
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        notes = conn.execute(
            """SELECT id, date, author, text, test_name, value, flag_for_review
               FROM notes WHERE patient_id = ? ORDER BY date DESC, id DESC""",
            (str(patient_id),),
        ).fetchall()
    patient["notes"] = [dict(note) for note in notes]
    return patient


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


def ask_procedure_guide(question: str, n_results: int = 3) -> tuple[str, list[dict[str, str]]]:
    """Answer a general procedure question from the separate local reference index."""
    question = str(question).strip()
    if not question:
        raise ValueError("question is required")
    if n_results < 1:
        raise ValueError("n_results must be at least 1")

    result = procedure_collection.query(
        query_embeddings=[_embed(question)],
        n_results=min(n_results, procedure_collection.count()),
        include=["documents", "metadatas", "distances"],
    )
    documents = result.get("documents", [[]])[0] or []
    metadatas = result.get("metadatas", [[]])[0] or []
    distances = result.get("distances", [[]])[0] or []
    matches = [
        (document, metadata, distance)
        for document, metadata, distance in zip(documents, metadatas, distances)
        if document and metadata and distance is not None and float(distance) < 0.85
    ]
    if not matches:
        return "I don't have that procedure information in the local reference library.", []

    context = "\n\n---\n\n".join(
        f"[Reference {index}]\n{document}"
        for index, (document, _, _) in enumerate(matches, start=1)
    )
    response = llm.create_chat_completion(
        messages=[
            {
                "role": "system",
                "content": (
                    "You are Lumen's general procedure reference assistant. Answer only from the "
                    "provided locally stored references. Do not use or infer from patient records. "
                    "State the intended audience and important limits when the reference provides them. "
                    "If the references do not answer the question, say you do not have that information. "
                    "Do not invent steps or dosing. These summaries are educational references, not a "
                    "replacement for current training, clinician judgment, emergency services, or local protocols."
                ),
            },
            {
                "role": "user",
                "content": f"General procedure question: {question}\n\nLocal references:\n{context}",
            },
        ],
        max_tokens=512,
        temperature=0.1,
    )
    answer = response["choices"][0]["message"]["content"].strip()
    citations = [
        {
            "title": str(metadata.get("source_title", metadata.get("title", "Procedure reference"))),
            "procedure": str(metadata.get("procedure", "")),
            "organization": str(metadata.get("organization", "")),
            "url": str(metadata.get("source_url", "")),
            "sourceCheckedOn": str(metadata.get("source_checked_on", "")),
        }
        for _, metadata, _ in matches
    ]
    return answer or "I don't have that information in the local reference library.", citations


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
    patients_file = ROOT_DIR / "patients.json"
    if not patients_file.is_file():
        patients_file = ROOT_DIR / "patients.example.json"
    if not patients_file.is_file():
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
