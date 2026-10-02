import time
from pathlib import Path

import numpy as np
import sounddevice as sd
from scipy.io.wavfile import write


# ============================================================
# CONFIG
# ============================================================

SAMPLE_RATE = 16000
CHANNELS = 1

# How long we wait for the doctor to start speaking
MAX_WAIT_TIME = 5

# How much silence is required to stop recording
SILENCE_DURATION = 1.2

# Audio volume threshold
SILENCE_THRESHOLD = 0.008

# Small chunks make silence detection responsive
CHUNK_DURATION = 0.1


BASE_DIR = Path(__file__).resolve().parent
AUDIO_DIR = BASE_DIR / "audio"

AUDIO_DIR.mkdir(exist_ok=True)


# ============================================================
# RECORD COMMAND
# ============================================================

def record_command(
    filename: str = "command.wav",
) -> str:

    output_file = AUDIO_DIR / filename

    chunk_samples = int(
        SAMPLE_RATE * CHUNK_DURATION
    )

    print("\n" + "=" * 60)
    print("LUMEN")
    print("=" * 60)

    print("\nListening for your command...")

    audio_chunks = []

    speech_started = False
    silence_time = 0.0
    start_time = time.time()

    try:

        with sd.InputStream(
            samplerate=SAMPLE_RATE,
            channels=CHANNELS,
            dtype="float32",
            blocksize=chunk_samples,
        ) as stream:

            while True:

                audio, overflowed = stream.read(
                    chunk_samples
                )

                audio = audio.copy().flatten()

                volume = np.abs(audio).mean()

                # ------------------------------------------------
                # Waiting for speech
                # ------------------------------------------------

                if not speech_started:

                    if volume >= SILENCE_THRESHOLD:

                        speech_started = True

                        print("Speech detected...")

                        audio_chunks.append(audio)

                    elif (
                        time.time() - start_time
                        > MAX_WAIT_TIME
                    ):

                        print(
                            "No speech detected."
                        )

                        break

                # ------------------------------------------------
                # Recording speech
                # ------------------------------------------------

                else:

                    audio_chunks.append(audio)

                    if volume < SILENCE_THRESHOLD:

                        silence_time += CHUNK_DURATION

                    else:

                        silence_time = 0.0

                    if (
                        silence_time
                        >= SILENCE_DURATION
                    ):

                        print(
                            "Silence detected. "
                            "Stopping recording."
                        )

                        break

    except KeyboardInterrupt:

        print(
            "\nRecording interrupted."
        )

    # ========================================================
    # SAVE AUDIO
    # ========================================================

    if not audio_chunks:

        raise RuntimeError(
            "No speech was recorded."
        )

    recording = np.concatenate(
        audio_chunks
    )

    # Convert float32 → int16 WAV
    recording = np.clip(
        recording,
        -1.0,
        1.0,
    )

    recording = (
        recording * 32767
    ).astype(np.int16)

    write(
        str(output_file),
        SAMPLE_RATE,
        recording,
    )

    print(
        f"Audio saved: {output_file}"
    )

    return str(output_file)


# ============================================================
# TEST
# ============================================================

if __name__ == "__main__":

    record_command()