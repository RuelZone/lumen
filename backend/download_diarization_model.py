"""Download the gated diarization model once before running Lumen offline."""

import os


def main() -> None:
    # rag_backend.py sets offline mode at runtime; this one-time setup needs Hub access.
    os.environ.pop("HF_HUB_OFFLINE", None)
    os.environ.pop("TRANSFORMERS_OFFLINE", None)

    try:
        from pyannote.audio import Pipeline
    except ImportError as exc:
        raise SystemExit(
            "Install project requirements first: python -m pip install -r requirements.txt"
        ) from exc

    model = "pyannote/speaker-diarization-community-1"
    print("Loading the speaker-diarization model into the local Hugging Face cache...")
    print("Your Hugging Face account must have accepted this model's access conditions.")
    pipeline = Pipeline.from_pretrained(model, token=True)
    if pipeline is None:
        raise SystemExit("The model did not load. Check model access and your Hugging Face login.")
    print("Diarization model cached. Lumen can now use it locally while offline.")


if __name__ == "__main__":
    main()
