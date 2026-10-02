"""Local recording transcription, speaker diarization, and consultation reports."""

import io
import os
import sys
import tempfile
import wave
from pathlib import Path

import av

from rag_backend import add_note, get_patient_by_id, llm


PROJECT_ROOT = Path(__file__).resolve().parent.parent
WHISPER_DIR = PROJECT_ROOT / "whisper"
DIARIZATION_MODEL = "pyannote/speaker-diarization-community-1"
MAX_AUDIO_BYTES = 100 * 1024 * 1024

_diarization_pipeline = None


def _load_diarization_pipeline():
    global _diarization_pipeline
    if _diarization_pipeline is not None:
        return _diarization_pipeline

    try:
        from pyannote.audio import Pipeline
    except ImportError as exc:
        raise RuntimeError(
            "Speaker diarization is not installed. Install the project requirements, "
            "accept the Hugging Face model conditions, and cache the diarization model."
        ) from exc

    try:
        _diarization_pipeline = Pipeline.from_pretrained(
            DIARIZATION_MODEL,
            token=os.environ.get("HF_TOKEN") or True,
        )
    except Exception as exc:
        raise RuntimeError(
            "Could not load the local speaker-diarization model. Accept the model "
            "conditions and run backend/download_diarization_model.py once while online."
        ) from exc

    if _diarization_pipeline is None:
        raise RuntimeError("The local speaker-diarization model did not load.")
    return _diarization_pipeline


def _convert_audio_to_wav(audio_bytes: bytes, wav_path: Path) -> None:
    """Decode a browser recording and normalize it to mono, 16 kHz PCM WAV."""
    try:
        container = av.open(io.BytesIO(audio_bytes))
        audio_stream = next(
            (stream for stream in container.streams if stream.type == "audio"), None
        )
        if audio_stream is None:
            raise ValueError("The uploaded recording contains no audio stream.")

        resampler = av.AudioResampler(format="s16", layout="mono", rate=16000)
        with wave.open(str(wav_path), "wb") as output:
            output.setnchannels(1)
            output.setsampwidth(2)
            output.setframerate(16000)

            for packet in container.demux(audio_stream):
                for frame in packet.decode():
                    for converted in resampler.resample(frame):
                        output.writeframes(converted.to_ndarray().tobytes())
            for converted in resampler.resample(None):
                output.writeframes(converted.to_ndarray().tobytes())
        container.close()
    except ValueError:
        raise
    except Exception as exc:
        raise ValueError(
            "Could not read the audio recording. Try recording again in this browser."
        ) from exc


def process_consultation_audio(patient_id: str, audio_bytes: bytes) -> dict:
    """Transcribe and diarize a complete consultation recording locally."""
    if not patient_id or not get_patient_by_id(patient_id):
        raise ValueError("Choose a patient from the local patient list.")
    if not audio_bytes:
        raise ValueError("The recording is empty.")
    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise ValueError("The recording is too large. Keep it under 100 MB.")

    sys.path.insert(0, str(WHISPER_DIR))
    try:
        from transcribe import transcribe_audio_segments
    except ImportError as exc:
        raise RuntimeError(
            "Whisper transcription is unavailable. Install faster-whisper in the backend environment."
        ) from exc

    with tempfile.TemporaryDirectory(prefix="lumen-consultation-") as temp_dir:
        wav_path = Path(temp_dir) / "consultation.wav"
        _convert_audio_to_wav(audio_bytes, wav_path)

        transcript_segments = transcribe_audio_segments(str(wav_path))
        if not transcript_segments:
            raise ValueError("No speech was detected in the recording.")

        pipeline = _load_diarization_pipeline()
        result = pipeline(str(wav_path), num_speakers=2)
        diarization = getattr(result, "speaker_diarization", result)
        speaker_turns = [
            (turn.start, turn.end, str(speaker))
            for turn, _, speaker in diarization.itertracks(yield_label=True)
        ]

        labeled_segments = []
        for segment in transcript_segments:
            start = float(segment["start"])
            end = float(segment["end"])
            overlaps: dict[str, float] = {}
            for turn_start, turn_end, speaker in speaker_turns:
                overlap = max(0.0, min(end, turn_end) - max(start, turn_start))
                if overlap:
                    overlaps[speaker] = overlaps.get(speaker, 0.0) + overlap
            speaker = max(overlaps, key=overlaps.get) if overlaps else "UNKNOWN"
            labeled_segments.append(
                {
                    "start": round(start, 2),
                    "end": round(end, 2),
                    "speaker": speaker,
                    "text": str(segment["text"]).strip(),
                }
            )

    speakers = list(dict.fromkeys(
        segment["speaker"] for segment in labeled_segments if segment["speaker"] != "UNKNOWN"
    ))
    return {"segments": labeled_segments, "speakers": speakers}


def _transcript_lines(segments: list[dict], speaker_roles: dict[str, str]) -> list[str]:
    lines = []
    for segment in segments:
        speaker = str(segment.get("speaker", "UNKNOWN"))
        role = speaker_roles.get(speaker, "Unassigned speaker")
        text = str(segment.get("text", "")).strip()
        if text:
            start = max(0.0, float(segment.get("start", 0)))
            lines.append(f"[{int(start // 60):02d}:{int(start % 60):02d}] {role}: {text}")
    return lines


def _split_lines(lines: list[str], max_chars: int) -> list[str]:
    chunks = []
    current = []
    current_size = 0
    for line in lines:
        if current and current_size + len(line) + 1 > max_chars:
            chunks.append("\n".join(current))
            current = []
            current_size = 0
        current.append(line)
        current_size += len(line) + 1
    if current:
        chunks.append("\n".join(current))
    return chunks


def _summarize_text(text: str, system_prompt: str, max_tokens: int) -> str:
    response = llm.create_chat_completion(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text},
        ],
        max_tokens=max_tokens,
        temperature=0.1,
    )
    return response["choices"][0]["message"]["content"].strip()


def summarize_consultation(patient_id: str, segments: list[dict], speaker_roles: dict) -> str:
    """Use the local Qwen model to draft a report grounded in the transcript."""
    if not get_patient_by_id(patient_id):
        raise ValueError("Choose a patient from the local patient list.")
    if not isinstance(segments, list) or not segments:
        raise ValueError("A transcribed consultation is required.")
    if len(segments) > 10000:
        raise ValueError("The transcript is too long to summarize.")
    if not isinstance(speaker_roles, dict):
        raise ValueError("Assign a role to each speaker before generating the report.")

    roles = {str(speaker): str(role) for speaker, role in speaker_roles.items()}
    if any(role not in {"Doctor", "Patient", "Other"} for role in roles.values()):
        raise ValueError("Choose Doctor, Patient, or Other for each speaker.")
    if list(roles.values()).count("Doctor") != 1 or list(roles.values()).count("Patient") != 1:
        raise ValueError("Assign one speaker as Doctor and one as Patient.")
    detected_speakers = {str(segment.get("speaker", "UNKNOWN")) for segment in segments}
    if not any(role == "Doctor" and speaker in detected_speakers for speaker, role in roles.items()):
        raise ValueError("The selected Doctor speaker was not found in the transcript.")
    if not any(role == "Patient" and speaker in detected_speakers for speaker, role in roles.items()):
        raise ValueError("The selected Patient speaker was not found in the transcript.")

    lines = _transcript_lines(segments, roles)
    if not lines:
        raise ValueError("The transcript has no text to summarize.")

    system_prompt = (
        "Draft a concise clinical consultation report using only the provided transcript. "
        "Do not invent diagnoses, medications, measurements, or decisions. Keep patient-reported "
        "information separate from the doctor's statements. Preserve uncertainty and contradictions. "
        "If a section was not discussed, say 'Not documented in this consultation.'"
    )

    transcript = "\n".join(lines)
    if len(transcript) > 5200:
        summaries = [
            _summarize_text(
                f"Condense these consultation transcript lines into faithful clinical facts. "
                f"Retain which role said each fact and do not infer missing information.\n\n{chunk}",
                system_prompt,
                300,
            )
            for chunk in _split_lines(lines, 5200)
        ]
        while len("\n\n".join(summaries)) > 5200:
            summaries = [
                _summarize_text(
                    "Combine these chronological consultation notes without losing key facts, "
                    "speaker attribution, or uncertainty. Do not add information.\n\n" + chunk,
                    system_prompt,
                    300,
                )
                for chunk in _split_lines(summaries, 5200)
            ]
        transcript = "\n\n".join(summaries)

    report_prompt = (
        "Create a consultation report with these headings: Reason for visit; Patient-reported "
        "symptoms and history; Doctor's observations and assessment; Medications or treatment "
        "discussed; Plan and follow-up; Not documented or unclear. Use concise bullet points. "
        "Attribute statements to the patient or doctor when clear.\n\n"
        f"Transcript and speaker roles:\n{transcript}\n\nConsultation report:"
    )
    return _summarize_text(report_prompt, system_prompt, 900)


def save_consultation_report(patient_id: str, report: str) -> dict:
    """Save a doctor-reviewed report as a patient note for SQLite and ChromaDB."""
    patient = get_patient_by_id(patient_id)
    if not patient:
        raise ValueError("Choose a patient from the local patient list.")
    cleaned_report = report.strip()
    if not cleaned_report:
        raise ValueError("The report is empty.")
    if len(cleaned_report) > 100000:
        raise ValueError("The report is too long to save.")

    note = add_note(
        patient_id=patient_id,
        author="Doctor",
        text=f"Consultation report for {patient['name']}\n\n{cleaned_report}",
    )
    return {"noteId": note["id"], "patientName": patient["name"]}
