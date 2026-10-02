from wake_word import listen_for_wake_word
from recorder import record_command
from transcribe import transcribe_audio


def run_voice_assistant():

    print("=" * 60)
    print("LUMEN VOICE ASSISTANT")
    print("=" * 60)

    while True:

        # ----------------------------------------------------
        # WAIT FOR "HEY LUMEN"
        # ----------------------------------------------------

        detected = listen_for_wake_word()

        if not detected:
            break

        # ----------------------------------------------------
        # RECORD DOCTOR COMMAND
        # ----------------------------------------------------

        try:

            audio_file = record_command(
                filename="command.wav"
            )

        except RuntimeError as error:

            print(f"\nRecording error: {error}")
            print("Returning to wake-word listener...\n")

            continue

        # ----------------------------------------------------
        # TRANSCRIBE
        # ----------------------------------------------------

        print("\nTranscribing command...")

        transcript = transcribe_audio(
            audio_file
        )

        print("\n" + "=" * 60)
        print("LUMEN COMMAND")
        print("=" * 60)

        if transcript:

            print(transcript)

        else:

            print("[No speech detected]")

        print("=" * 60)

        # ----------------------------------------------------
        # TEMPORARY
        # ----------------------------------------------------

        print("\nWaiting for next command...")


if __name__ == "__main__":

    run_voice_assistant()