from pathlib import Path

from transcribe import transcribe_audio


BASE_DIR = Path(__file__).resolve().parent
AUDIO_FILE = BASE_DIR / "audio" / "test.wav"


def main():

    print("=" * 60)
    print("LUMEN LOCAL WHISPER TEST")
    print("=" * 60)

    if not AUDIO_FILE.exists():

        print("\nERROR: test audio not found.")
        print(f"Expected:\n{AUDIO_FILE}")

        return

    print("\nAudio file:")
    print(AUDIO_FILE)

    print("\nStarting transcription...")

    transcript = transcribe_audio(
        str(AUDIO_FILE)
    )

    print("\n" + "=" * 60)
    print("TRANSCRIPT")
    print("=" * 60)

    if transcript:
        print(transcript)
    else:
        print("[No speech detected]")

    print("=" * 60)


if __name__ == "__main__":
    main()
