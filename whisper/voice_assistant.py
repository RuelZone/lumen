import re
import json
import urllib.error
import urllib.request

from wake_word import listen_for_wake_word
from recorder import record_command
from transcribe import transcribe_audio
from command_router import command_to_dict, route_command

BACKEND_URL = "http://127.0.0.1:8765"


def is_sleep_word(transcript: str) -> bool:
    """Stop dictation only when Whisper hears the standalone word 'bye'."""
    words = re.findall(r"[a-z]+", transcript.lower())
    return "bye" in words


def send_command_to_backend(transcript: str) -> None:
    """Submit the transcript to the local API for validation and delivery."""
    command = command_to_dict(route_command(transcript))
    payload = json.dumps({"transcript": transcript, "command": command}).encode("utf-8")
    request = urllib.request.Request(
        f"{BACKEND_URL}/voice-command",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=3) as response:
            result = json.loads(response.read().decode("utf-8"))
        print("Voice command sent to Lumen:", result.get("command", command))
    except urllib.error.URLError as error:
        print(f"Could not reach the Lumen backend: {error}")
        print("Start backend/local_api.py, then try the voice command again.")


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

        print("Dictation started. Say 'bye' to stop and return to wake-word listening.")

        while True:
            # ----------------------------------------------------
            # RECORD DOCTOR COMMAND
            # ----------------------------------------------------
            try:
                audio_file = record_command(filename="command.wav")

            except RuntimeError as error:
                print(f"\nRecording stopped: {error}")
                print("Returning to wake-word listener...\n")
                break

            # ----------------------------------------------------
            # TRANSCRIBE THIS CLIP
            # ----------------------------------------------------
            print("\nTranscribing command...")
            transcript = transcribe_audio(audio_file)

            if is_sleep_word(transcript):
                print("\nSleep word 'bye' detected. Dictation stopped.")
                print("Say 'Hey Lumen' when you want to start again.\n")
                break

            print("\n" + "=" * 60)
            print("LUMEN COMMAND")
            print("=" * 60)

            if transcript:
                print(transcript)
                send_command_to_backend(transcript)
            else:
                print("[No speech detected]")

            print("=" * 60)
            print("\nListening for the next dictation clip. Say 'bye' to stop.")


if __name__ == "__main__":

    run_voice_assistant()
