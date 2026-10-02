from pathlib import Path

from faster_whisper import WhisperModel


# ============================================================
# LUMEN WHISPER CONFIG
# ============================================================

MODEL_SIZE = "small"

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models"


# ============================================================
# LOAD WHISPER
# ============================================================

def load_model():

    print("=" * 60)
    print("LUMEN WHISPER")
    print("=" * 60)

    # --------------------------------------------------------
    # Try NVIDIA GPU first
    # --------------------------------------------------------

    print("\nChecking for NVIDIA GPU...")

    try:

        print("Trying GPU mode...")

        model = WhisperModel(
            MODEL_SIZE,
            device="cuda",
            compute_type="float16",
            download_root=str(MODEL_DIR),
        )

        print("\nGPU acceleration: ENABLED")
        print("Device: NVIDIA CUDA")
        print("Compute type: float16")

        return model

    except Exception as gpu_error:

        print("\nGPU unavailable.")
        print(f"GPU reason: {gpu_error}")

        print("\nFalling back to CPU...")

        # ----------------------------------------------------
        # CPU fallback
        # ----------------------------------------------------

        model = WhisperModel(
            MODEL_SIZE,
            device="cpu",
            compute_type="int8",
            download_root=str(MODEL_DIR),
        )

        print("\nCPU mode: ENABLED")
        print("Device: CPU")
        print("Compute type: int8")

        return model


model = load_model()


# ============================================================
# TRANSCRIPTION
# ============================================================

def transcribe_audio_segments(audio_path: str) -> list[dict]:

    audio_file = Path(audio_path)

    if not audio_file.exists():
        raise FileNotFoundError(
            f"Audio file not found: {audio_file}"
        )

    segments, info = model.transcribe(
        str(audio_file),
        beam_size=5,
        vad_filter=True,
    )

    transcript_segments = []

    for segment in segments:

        text = segment.text.strip()

        if text:
            transcript_segments.append(
                {
                    "start": float(segment.start),
                    "end": float(segment.end),
                    "text": text,
                }
            )

    return transcript_segments


def transcribe_audio(audio_path: str) -> str:
    """Return a plain transcript for the standalone voice assistant."""
    return " ".join(
        segment["text"] for segment in transcribe_audio_segments(audio_path)
    ).strip()


# ============================================================
# DIRECT TEST
# ============================================================

if __name__ == "__main__":

    test_audio = BASE_DIR / "audio" / "test.wav"

    print("\nAudio:")
    print(test_audio)

    print("\nTranscribing...\n")

    transcript = transcribe_audio(
        str(test_audio)
    )

    print("=" * 60)
    print("TRANSCRIPT")
    print("=" * 60)

    if transcript:
        print(transcript)
    else:
        print("[No speech detected]")

    print("=" * 60)
