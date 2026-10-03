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


def publish_voice_activity(
    *, recording: bool, processing: bool = False, transcript: str | None = None
) -> None:
    """Publish microphone activity and completed transcript to the local UI."""
    payload = {"recording": recording, "processing": processing}
    if transcript is not None:
        payload["transcript"] = transcript
    request = urllib.request.Request(
        f"{BACKEND_URL}/voice-status",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=2):
            pass
    except (urllib.error.URLError, TimeoutError):
        # The voice assistant remains usable if the website backend is offline.
        pass


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

        publish_voice_activity(recording=True, transcript="")

        print("Dictation started. Say 'bye' to stop and return to wake-word listening.")

        while True:
            # ----------------------------------------------------
            # RECORD DOCTOR COMMAND
            # ----------------------------------------------------
            try:
                publish_voice_activity(recording=True, processing=False)
                audio_file = record_command(filename="command.wav")

            except RuntimeError as error:
                publish_voice_activity(recording=False, processing=False)
                print(f"\nRecording stopped: {error}")
                print("Returning to wake-word listener...\n")
                break

            # ----------------------------------------------------
            # TRANSCRIBE THIS CLIP
            # ----------------------------------------------------
            print("\nTranscribing command...")
            publish_voice_activity(recording=False, processing=True)
            try:
                transcript = transcribe_audio(audio_file)
            except Exception as error:
                publish_voice_activity(recording=False, processing=False)
                print(f"Could not transcribe this clip: {error}")
                continue

            if is_sleep_word(transcript):
                publish_voice_activity(
                    recording=False,
                    processing=False,
                    transcript="Dictation paused (Bye Lumen).",
                )
                print("\nSleep word 'bye' detected. Dictation stopped.")
                print("Say 'Hey Lumen' when you want to start again.\n")
                break

            print("\n" + "=" * 60)
            print("LUMEN COMMAND")
            print("=" * 60)

            if transcript:
                print(transcript)
                publish_voice_activity(
                    recording=False,
                    processing=False,
                    transcript=transcript,
                )
                send_command_to_backend(transcript)
            else:
                publish_voice_activity(recording=False, processing=False)
                print("[No speech detected]")

            print("=" * 60)
            print("\nListening for the next dictation clip. Say 'bye' to stop.")


if __name__ == "__main__":
    try:
        run_voice_assistant()
    except KeyboardInterrupt:
        print("\nVoice assistant stopped.")
    finally:
        publish_voice_activity(
            recording=False,
            processing=False,
            transcript="",
        )
