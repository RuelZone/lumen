
import sounddevice as sd
from scipy.io.wavfile import write

SAMPLE_RATE = 16000
DURATION = 8

print("========================================")
print("LUMEN TEST RECORDER")
print("========================================")

print(f"\nRecording for {DURATION} seconds...")
print("Speak now!")

audio = sd.rec(
    int(DURATION * SAMPLE_RATE),
    samplerate=SAMPLE_RATE,
    channels=1,
    dtype="int16",
)

sd.wait()

output_file = "audio/test.wav"

write(
    output_file,
    SAMPLE_RATE,
    audio,
)

print("\nRecording finished.")
print(f"Saved to: {output_file}")
