"""Turn a transcribed phrase into a local Lumen navigation or chat action."""

from dataclasses import asdict, dataclass
import json
import re
from pathlib import Path
from typing import Any


@dataclass
class VoiceCommand:
    type: str
    value: str | None = None
    route: str | None = None
    patientName: str | None = None
    error: str | None = None


def command_to_dict(command: VoiceCommand) -> dict[str, Any]:
    return {key: value for key, value in asdict(command).items() if value is not None}


def _normalize(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.casefold()).strip()


def _local_patients() -> list[dict[str, Any]]:
    roster = Path(__file__).resolve().parents[1] / "patients.json"
    try:
        data = json.loads(roster.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            data = data.get("patients", [])
        return data if isinstance(data, list) else []
    except (OSError, json.JSONDecodeError):
        return []


def route_command(transcript: str, patients: list[dict[str, Any]] | None = None) -> VoiceCommand:
    """Route page commands and open-patient requests; otherwise send to chat."""
    spoken = transcript.strip()
    normalized = _normalize(spoken)
    if not normalized:
        return VoiceCommand(type="error", error="I didn't hear a command.")

    roster = patients if patients is not None else _local_patients()
    open_intent = re.search(r"\b(open|show|find|bring up|go to|navigate to)\b", normalized)
    asks_for_record_info = re.search(
        r"\b(what|when|where|how|why|is|was|were|did|has|have|latest|last|recent|report|reports|result|results|note|notes|lab|labs|medication|treatment|diagnosis|trend|level)\b",
        normalized,
    )
    if open_intent and not asks_for_record_info:
        matches: list[dict[str, Any]] = []
        for patient in roster:
            name = str(patient.get("name", "")).strip()
            normalized_name = _normalize(name)
            if normalized_name and re.search(rf"(?<![a-z0-9]){re.escape(normalized_name)}(?![a-z0-9])", normalized):
                matches.append(patient)

        # If the user gives only one unambiguous name part, allow that too.
        if not matches:
            tokens = normalized.split()
            name_parts: dict[str, list[dict[str, Any]]] = {}
            for patient in roster:
                for part in set(_normalize(str(patient.get("name", ""))).split()):
                    if len(part) > 2:
                        name_parts.setdefault(part, []).append(patient)
            mentioned = [token for token in tokens if token in name_parts]
            candidates = {str(item.get("id")): item for token in mentioned for item in name_parts[token]}
            if len(candidates) == 1:
                matches = list(candidates.values())

        unique = {str(item.get("id")): item for item in matches if item.get("id")}
        if len(unique) == 1:
            patient = next(iter(unique.values()))
            return VoiceCommand(type="open_patient", value=str(patient.get("name", "")), patientName=str(patient.get("name", "")))
        if len(unique) > 1:
            return VoiceCommand(type="error", error="That name matches more than one patient. Please say the full name.")

    destinations = (
        (r"\b(patient list|patients|my patients)\b", "/patients"),
        (r"\b(voice notes|voice note|dictation|recording page)\b", "/voice"),
        (r"\b(ask lumen|chat|chatbot|assistant)\b", "/ai"),
        (r"\b(dashboard|home|main page)\b", "/dashboard"),
    )
    if open_intent:
        for pattern, route in destinations:
            if re.search(pattern, normalized):
                return VoiceCommand(type="navigate", route=route)

    return VoiceCommand(type="query", value=spoken, route="/ai")
