"use client";

import { useState } from "react";
import {
  Bot,
  Send,
  X,
  FileText,
  Sparkles,
} from "lucide-react";

interface ChatWindowProps {
  patientName: string;
  onClose: () => void;
}

export default function ChatWindow({
  patientName,
  onClose,
}: ChatWindowProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [askedQuestion, setAskedQuestion] = useState("");

  const suggestions = [
    "Summarize this record",
    "Show latest recorded results",
    "Show recent clinical notes",
  ];

  function askLumen(text: string) {
    if (!text.trim()) return;

    setAskedQuestion(text);

    // Temporary mock response.
    // This will later call the FastAPI backend.
    setAnswer(
      "The latest recorded result is a hemoglobin value of 8.2. The patient also has a recent glucose value of 102. The most recent clinical note records fatigue for three days."
    );

    setQuestion("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2.5">
              <Bot
                size={20}
                className="text-emerald-400"
              />
            </div>

            <div>
              <h2 className="font-semibold text-white">
                Ask Lumen
              </h2>

              <p className="text-xs text-slate-500">
                Local AI · {patientName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-900 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto p-6">

          {!answer ? (
            <>
              <div className="mb-6">
                <h3 className="text-lg font-medium text-white">
                  What would you like to know?
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Ask about information already recorded in this patient's
                  local medical record.
                </p>
              </div>

              {/* Suggestions */}
              <div className="mb-6">
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-600">
                  Suggested questions
                </p>

                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => askLumen(suggestion)}
                      className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* User question */}
              <div className="mb-5">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-600">
                  You asked
                </p>

                <div className="rounded-lg bg-slate-900 px-4 py-3 text-sm text-slate-300">
                  {askedQuestion}
                </div>
              </div>

              {/* AI answer */}
              <div className="mb-6">
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles
                    size={15}
                    className="text-emerald-400"
                  />

                  <p className="text-xs font-medium uppercase tracking-wider text-emerald-400">
                    Lumen
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                  <p className="text-sm leading-7 text-slate-300">
                    {answer}
                  </p>
                </div>
              </div>

              {/* Sources */}
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <FileText
                    size={15}
                    className="text-slate-500"
                  />

                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Sources
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3">
                    <p className="text-xs font-medium text-slate-300">
                      28 Sep 2026 · Dr. Arun
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Hemoglobin: 8.2
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3">
                    <p className="text-xs font-medium text-slate-300">
                      20 Sep 2026 · Dr. Ravi
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Glucose: 102
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setAnswer("");
                  setAskedQuestion("");
                }}
                className="mt-5 text-xs text-slate-500 transition hover:text-white"
              >
                Ask another question
              </button>
            </>
          )}
        </div>

        {/* Input */}
        {!answer && (
          <div className="border-t border-slate-800 p-5">
            <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    askLumen(question);
                  }
                }}
                placeholder="Ask about this patient's record..."
                className="flex-1 bg-transparent py-2 text-sm text-white outline-none placeholder:text-slate-600"
              />

              <button
                onClick={() => askLumen(question)}
                className="rounded-lg bg-emerald-500 p-2.5 text-slate-950 transition hover:bg-emerald-400"
              >
                <Send size={17} />
              </button>
            </div>

            <p className="mt-2 text-center text-[11px] text-slate-600">
              Lumen only answers from the patient's available local record.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}