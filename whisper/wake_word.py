import difflib
import time
from pathlib import Path

import numpy as np
import sounddevice as sd
from faster_whisper import WhisperModel


# ============================================================
# CONFIG
# ============================================================

SAMPLE_RATE = 16000
CHUNK_SECONDS = 3

WAKE_PHRASE = "hey lumen"

# Phrases Whisper commonly produces for "Hey Lumen"
WAKE_VARIANTS = [
    "hey lumen",
    "hey, lumen",
    "hey luman",
    "hey, luman",
    "hey luhman",
    "hey, luhman",
    "hey luemann",
    "hey, luemann",
]

# Similarity threshold
SIMILARITY_THRESHOLD = 0.78

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models"


# ============================================================
# LOAD LIGHTWEIGHT MODEL
# ============================================================

print("=" * 60)
print("LUMEN WAKE WORD")
print("=" * 60)

print("\nLoading lightweight wake-word model...")

wake_model = WhisperModel(
    "tiny.en",
    device="cpu",
    compute_type="int8",
    download_root=str(MODEL_DIR),
)

print("Wake-word model ready.")
print(f'\nWaiting for "{WAKE_PHRASE}"...')
print("Say: Hey Lumen\n")


# ============================================================
# TEXT NORMALIZATION
# ============================================================

def normalize_text(text: str) -> str:

    text = text.lower()

    punctuation = ",.!?;:'\""

    for char in punctuation:
        text = text.replace(char, "")

    return " ".join(text.split())


# ============================================================
# WAKE WORD CHECK
# ============================================================

def command_after_wake_word(text: str) -> str | None:

    normalized = normalize_text(text)
    words = normalized.split()

    if len(words) >= 2:

        for i in range(len(words) - 1):

            candidate = (
                words[i] + " " + words[i + 1]
            )

            similarity = difflib.SequenceMatcher(
                None,
                candidate,
                WAKE_PHRASE,
            ).ratio()

            if similarity >= SIMILARITY_THRESHOLD:

                # Make sure the first word actually resembles "hey"
                hey_similarity = difflib.SequenceMatcher(
                    None,
                    words[i],
                    "hey",
                ).ratio()

                # Make sure the second resembles "lumen"
                lumen_similarity = difflib.SequenceMatcher(
                    None,
                    words[i + 1],
                    "lumen",
                ).ratio()

                if (
                    hey_similarity >= 0.60
                    and lumen_similarity >= 0.55
                ):
                    # Keep anything spoken after the wake phrase in this same
                    # audio chunk so commands like "Hey Lumen start consultation"
                    # are not lost when wake-word detection returns.
                    return " ".join(words[i + 2:])

    return None


def is_wake_word(text: str) -> bool:
    return command_after_wake_word(text) is not None


# ============================================================
# LISTEN
# ============================================================

def listen_for_wake_word() -> str | None:

    while True:

        try:

            audio = sd.rec(
                int(CHUNK_SECONDS * SAMPLE_RATE),
                samplerate=SAMPLE_RATE,
                channels=1,
                dtype="float32",
            )

            sd.wait()

            audio = audio.flatten()

            # Skip extremely quiet audio
            volume = np.abs(audio).mean()

            if volume < 0.002:
                continue

            segments, _ = wake_model.transcribe(
                audio,
                language="en",
                beam_size=1,
                vad_filter=True,
            )

            transcript = " ".join(
                segment.text.strip().lower()
                for segment in segments
                if segment.text.strip()
            )

            if not transcript:
                continue

            print(f"Heard: {transcript}")

            command = command_after_wake_word(transcript)
            if command is not None:

                print("\n" + "=" * 60)
                print("WAKE WORD DETECTED")
                print("=" * 60)
                print("Hey Lumen detected!")
                print("=" * 60)

                return command

            time.sleep(0.05)

        except KeyboardInterrupt:

            print("\n\nWake-word listener stopped.")

            return False


# ============================================================
# TEST
# ============================================================

if __name__ == "__main__":

    listen_for_wake_word()
