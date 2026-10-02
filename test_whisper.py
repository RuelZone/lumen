from pywhispercpp.model import Model

print("Loading whisper model...")
model = Model('base')  # multilingual, needed for Malayalam later too

print("Transcribing...")
segments = model.transcribe('./models/test_english.wav', language='en')

print("\n--- TRANSCRIPT ---")
full_text = " ".join([seg.text for seg in segments])
print(full_text)