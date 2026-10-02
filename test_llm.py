"""Minimal offline smoke test for a local Qwen GGUF using llama-cpp-python."""

from pathlib import Path

from llama_cpp import Llama


MODEL_PATH = Path(__file__).resolve().parent / "models" / "Qwen2.5-3B-Instruct-Q4_K_M.gguf"


def main() -> None:
    if not MODEL_PATH.is_file():
        raise FileNotFoundError(
            f"Model not found: {MODEL_PATH}\n"
            "Download the Q4_K_M GGUF into the project's models/ folder first."
        )

    # Keep CPU and memory use modest on the target 2–4 GB machines.
    llm = Llama(model_path=str(MODEL_PATH), n_ctx=1024, n_threads=2, verbose=False)
    result = llm.create_chat_completion(
        messages=[
            {"role": "system", "content": "You are a concise assistant."},
            {"role": "user", "content": "Reply with a short greeting and say you are running locally."},
        ],
        max_tokens=80,
        temperature=0.2,
    )
    print(result["choices"][0]["message"]["content"].strip())


if __name__ == "__main__":
    main()
