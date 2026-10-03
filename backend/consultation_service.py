"""Local recording transcription, speaker diarization, and consultation reports."""

import io
import os
import sys
import tempfile
import warnings
import wave
from pathlib import Path

import av

from rag_backend import add_note, get_patient_by_id, llm


PROJECT_ROOT = Path(__file__).resolve().parent.parent
WHISPER_DIR = PROJECT_ROOT / "whisper"
DIARIZATION_MODEL = "pyannote/speaker-diarization-community-1"
MAX_AUDIO_BYTES = 100 * 1024 * 1024
MAX_SPEAKER_ALIGNMENT_GAP = 0.35

_diarization_pipeline = None


def _load_diarization_pipeline():
    global _diarization_pipeline
    if _diarization_pipeline is not None:
        return _diarization_pipeline

    try:
        # Pyannote warns at import when TorchCodec's FFmpeg DLLs are missing.
        # This service decodes recordings with PyAV and passes pyannote an
        # in-memory waveform, so its TorchCodec file decoder is not used.
        with warnings.catch_warnings():
            warnings.filterwarnings(
                "ignore",
                message=r"(torchcodec is not installed correctly so built-in audio decoding will fail|Could not load libtorchcodec).*",
                category=UserWarning,
            )
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


def _read_wav_as_waveform(wav_path: Path):
    """Read the normalized WAV into memory, avoiding pyannote's TorchCodec decoder."""
    import torch

    with wave.open(str(wav_path), "rb") as source:
        channels = source.getnchannels()
        sample_rate = source.getframerate()
        pcm = source.readframes(source.getnframes())

    if channels != 1:
        raise ValueError("The normalized consultation audio must be mono.")
    if sample_rate != 16000:
        raise ValueError("The normalized consultation audio must be 16 kHz.")
    if not pcm:
        raise ValueError("The recording contains no audio samples.")

    # Pyannote accepts a (channels, samples) tensor directly. Feeding this
    # decoded waveform avoids its file decoder, which needs TorchCodec's native
    # FFmpeg DLLs and currently fails in the Windows venv.
    waveform = torch.frombuffer(bytearray(pcm), dtype=torch.int16)
    waveform = waveform.to(dtype=torch.float32).div_(32768.0).unsqueeze(0)
    return waveform, sample_rate


def _speaker_for_interval(
    start: float, end: float, speaker_turns: list[tuple[float, float, str]]
) -> str:
    """Choose the diarized voice with the greatest overlap with a word."""
    overlaps: dict[str, float] = {}
    for turn_start, turn_end, speaker in speaker_turns:
        overlap = max(0.0, min(end, turn_end) - max(start, turn_start))
        if overlap:
            overlaps[speaker] = overlaps.get(speaker, 0.0) + overlap
    if overlaps:
        return max(overlaps, key=overlaps.get)

    # Diarization may leave tiny gaps at turn boundaries. Assign only when a
    # nearby voice turn is close; otherwise preserve an explicit unknown label.
    midpoint = (start + end) / 2
    nearest = min(
        speaker_turns,
        key=lambda turn: min(abs(midpoint - turn[0]), abs(midpoint - turn[1])),
        default=None,
    )
    if nearest:
        distance = min(abs(midpoint - nearest[0]), abs(midpoint - nearest[1]))
        if distance <= MAX_SPEAKER_ALIGNMENT_GAP:
            return nearest[2]
    return "UNKNOWN"


def _label_transcript_segments(
    transcript_segments: list[dict],
    speaker_turns: list[tuple[float, float, str]],
) -> list[dict]:
    """Align Whisper words to pyannote turns, splitting turns inside sentences."""
    labeled_segments = []
    for segment in transcript_segments:
        words = segment.get("words") or []
        if not words:
            start = float(segment["start"])
            end = float(segment["end"])
            labeled_segments.append({
                "start": round(start, 2),
                "end": round(end, 2),
                "speaker": _speaker_for_interval(start, end, speaker_turns),
                "text": str(segment["text"]).strip(),
            })
            continue

        group = []
        group_speaker = None

        def flush_group() -> None:
            if not group:
                return
            text = "".join(word["text"] for word in group).strip()
            if text:
                labeled_segments.append({
                    "start": round(group[0]["start"], 2),
                    "end": round(group[-1]["end"], 2),
                    "speaker": group_speaker or "UNKNOWN",
                    "text": text,
                })

        for word in words:
            word_start = float(word["start"])
            word_end = float(word["end"])
            speaker = _speaker_for_interval(word_start, word_end, speaker_turns)
            if group and speaker != group_speaker:
                flush_group()
                group = []
            if not group:
                group_speaker = speaker
            group.append({
                "start": word_start,
                "end": word_end,
                "text": str(word["text"]),
            })
        flush_group()

    return labeled_segments


def transcribe_uploaded_audio(audio_bytes: bytes) -> dict:
    """Transcribe one Ask Lumen voice question locally, without diarization."""
    if not audio_bytes:
        raise ValueError("The recording is empty.")
    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise ValueError("The recording is too large. Keep it under 100 MB.")

    sys.path.insert(0, str(WHISPER_DIR))
    try:
        from transcribe import transcribe_audio
    except ImportError as exc:
        raise RuntimeError(
            "Whisper transcription is unavailable. Install faster-whisper in the backend environment."
        ) from exc

    with tempfile.TemporaryDirectory(prefix="lumen-question-") as temp_dir:
        wav_path = Path(temp_dir) / "question.wav"
        _convert_audio_to_wav(audio_bytes, wav_path)
        transcript = transcribe_audio(str(wav_path)).strip()

    if not transcript:
        raise ValueError("No speech was detected. Please try recording again.")
    return {"transcript": transcript}


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

        transcript_segments = transcribe_audio_segments(
            str(wav_path), word_timestamps=True
        )
        if not transcript_segments:
            raise ValueError("No speech was detected in the recording.")

        pipeline = _load_diarization_pipeline()
        waveform, sample_rate = _read_wav_as_waveform(wav_path)
        result = pipeline(
            {"waveform": waveform, "sample_rate": sample_rate},
            num_speakers=2,
        )
        diarization = getattr(result, "speaker_diarization", result)
        speaker_turns = [
            (turn.start, turn.end, str(speaker))
            for turn, _, speaker in diarization.itertracks(yield_label=True)
        ]

        labeled_segments = _label_transcript_segments(
            transcript_segments, speaker_turns
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
