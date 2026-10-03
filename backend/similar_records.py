"""Semantic retrieval of similar documented records for Lumen."""

from __future__ import annotations

import sqlite3
from typing import Any

from rag_backend import DB_PATH, _embed, collection


def find_similar_records(
    patient_id: str,
    note_id: str | None = None,
    query_text: str | None = None,
    limit: int = 5,
) -> list[dict[str, Any]]:
    """Find semantically similar notes belonging to other patients."""
    patient_id = str(patient_id).strip()
    if not patient_id:
        raise ValueError("patient_id is required")

    try:
        limit = max(1, min(int(limit), 10))
    except (TypeError, ValueError) as exc:
        raise ValueError("limit must be an integer") from exc

    if note_id:
        with sqlite3.connect(DB_PATH) as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute(
                """SELECT id, patient_id, date, text, test_name, value
                   FROM notes WHERE id = ? AND patient_id = ?""",
                (str(note_id), patient_id),
            ).fetchone()
        if not row:
            raise ValueError("Source record was not found.")
        query_text = (
            f"Date: {row['date'] or 'Not recorded'} | "
            f"Test: {row['test_name'] or 'Not specified'} | "
            f"Value: {row['value'] if row['value'] is not None else 'Not specified'} | "
            f"{row['text']}"
        )

    query_text = (query_text or "").strip()
    if not query_text:
        raise ValueError("query_text or note_id is required")

    result = collection.query(
        query_embeddings=[_embed(query_text)],
        n_results=min(limit + 10, 50),
        include=["documents", "metadatas", "distances"],
    )
    ids = result.get("ids", [[]])[0] or []
    distances = result.get("distances", [[]])[0] or []
    candidates = [(str(record_id), float(distance)) for record_id, distance in zip(ids, distances)]
    if not candidates:
        return []

    note_ids = [record_id for record_id, _ in candidates]
    placeholders = ",".join("?" for _ in note_ids)
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            f"""SELECT n.id, n.patient_id, n.date, n.author, n.text,
                       n.test_name, n.value, p.name AS patient_name, p.age AS patient_age
                FROM notes AS n
                LEFT JOIN patients AS p ON p.id = n.patient_id
                WHERE n.id IN ({placeholders})""",
            note_ids,
        ).fetchall()

    by_id = {str(row["id"]): row for row in rows}
    output = []
    for record_id, distance in candidates:
        row = by_id.get(record_id)
        if not row or str(row["patient_id"]) == patient_id:
            continue
        output.append(
            {
                "noteId": str(row["id"]),
                "patientId": str(row["patient_id"]),
                "patientName": row["patient_name"] or "Unknown patient",
                "patientAge": row["patient_age"],
                "date": row["date"] or "Not recorded",
                "author": row["author"] or "Not recorded",
                "testName": row["test_name"],
                "value": row["value"],
                "text": row["text"],
                "similarityDistance": round(distance, 4),
            }
        )
        if len(output) >= limit:
            break
    return output
