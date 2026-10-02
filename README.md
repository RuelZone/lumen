# Lumen

Lumen is a local AI assistant prototype for a doctor's patient notes. Its Python backend stores patient and note data in SQLite, indexes notes in ChromaDB, and uses a local GGUF model to answer questions with retrieved record context. The Next.js frontend contains the patient dashboard, Ask Lumen chat, and a voice notes screen.

This is a hackathon/demo prototype, not a validated clinical system. Use synthetic or de-identified data for demos; do not rely on generated answers for diagnosis or treatment.

## Project layout

```text
backend/
  local_api.py       Local HTTP API used by the frontend
  rag_backend.py     SQLite, ChromaDB, embeddings, RAG and summaries
  models/            Optional location for the local Qwen GGUF model
  patients.json      Optional initial patient dataset
frontend/            Next.js web application
models/               Existing root-level local models, if present
hospital.db           Existing root-level SQLite data, if present
chroma_db/            Existing root-level vector index, if present
whisper/             Standalone microphone, wake phrase and transcription prototype
```

The backend checks both `backend/models/` and the project-root `models/` for the Qwen model. It reuses existing project-root `hospital.db` and `chroma_db/` stores when present; otherwise it creates new stores under `backend/`. Generated databases and model files should stay local and should not be committed.

## Requirements

- Windows, Python 3.10, and Node.js/npm
- The Qwen2.5 3B Instruct Q4_K_M GGUF file in either `backend/models/` or the project-root `models/` folder
- The `all-MiniLM-L6-v2` sentence-transformer model available in the local Hugging Face cache before starting the backend. The backend enables offline model loading.
- A microphone for the standalone Whisper prototype

From the repository root, create and activate a virtual environment, then install the Python dependencies:

```powershell
py -3.10 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

To cache the embedding model once while internet access is available:

```powershell
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"
```

To use local speaker separation, sign in to Hugging Face and accept the access conditions for [pyannote/speaker-diarization-community-1](https://huggingface.co/pyannote/speaker-diarization-community-1). Then cache the model once while online:

```powershell
hf auth login
python backend\download_diarization_model.py
```

The audio analysis runs on the local machine after the model is cached. The first download requires Hugging Face access for the gated model.

Install frontend packages:

```powershell
cd frontend
npm install
cd ..
```

## Patient data

Put `patients.json` in `backend/`. It can be a JSON array of patients or an object containing a `patients` array. Each patient has an `id`, `name`, `age`, and optional `notes` array. A note can contain `date`, `author`, `text`, and optional `test_name`, `value`, and `flag_for_review` fields.

Example using fictional data:

```json
[
  {
    "id": "P001",
    "name": "Example Patient",
    "age": 45,
    "notes": [
      {
        "date": "2026-09-28",
        "author": "Dr. Example",
        "text": "Reports fatigue for three days. Follow-up planned.",
        "test_name": "Hemoglobin",
        "value": 12.4,
        "flag_for_review": false
      }
    ]
  }
]
```

## Run the application

1. Seed/update the local database from `backend/patients.json` and run the backend smoke example:

   ```powershell
   cd backend
   python rag_backend.py
   ```

2. Start the local API in a separate terminal, with the virtual environment activated:

   ```powershell
   cd backend
   python local_api.py
   ```

   The API listens on `http://127.0.0.1:8765`. The frontend uses this address by default. To use another local address, set `LUMEN_BACKEND_URL` in the frontend environment.

3. Start the website in another terminal:

   ```powershell
   cd frontend
   npm run dev
   ```

   Open `http://localhost:3000`. Ask Lumen uses the local `/api/patients` and `/api/chat` routes, which proxy requests to the Python API.

## Voice consultation reports

The Voice Notes page records a complete consultation in the browser, sends the audio to the local Python service, and runs faster-whisper transcription plus pyannote two-speaker diarization. The doctor reviews and assigns the detected speaker labels to Doctor and Patient, then Qwen drafts an editable report. Saving the reviewed report stores it as a patient note in SQLite and indexes it in ChromaDB so Ask Lumen can retrieve it later.

The report is a draft until the doctor reviews and saves it. Speaker labels are estimates and do not automatically establish real-world identity. For recording, both participants should be audible; overlapping speech may be assigned imperfectly.

## Whisper voice prototype

The scripts in `whisper/` can record microphone audio, detect “Hey Lumen,” and transcribe WAV audio with faster-whisper. Run the command-line prototype from that directory:

```powershell
cd whisper
python voice_assistant.py
```

The standalone wake-word assistant detects “Hey Lumen,” transcribes dictation clips, and stops dictation when it hears the standalone word “bye.” Consultation recording on the website is a separate full-session flow.

## Current API

- `GET /health` — local backend health check
- `GET /patients` — list stored patients
- `POST /chat` — ask a question about one patient's indexed notes; JSON body: `{"patientId":"P001","question":"What was the latest result?"}`
- `POST /consultations/transcribe` — send raw browser audio with an `X-Patient-Id` header; returns timestamped transcript segments and speaker labels
- `POST /consultations/summarize` — send the selected patient, transcript segments, and doctor/patient speaker assignments; returns a Qwen report draft
- `POST /consultations/save` — save the doctor-reviewed report as a patient note in SQLite and ChromaDB

The diarization model and Whisper transcription model must be cached before running with network access disabled. Consultation processing and Qwen report generation run locally.
