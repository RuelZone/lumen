"use client";

import { useState } from "react";
import {
  Mic,
  Square,
  CheckCircle2,
  RotateCcw,
  Save,
  UserRound,
  Clock3,
  FileText,
  ShieldCheck,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

const patients = [
  { id: "P001", name: "Rajesh Kumar", age: 45 },
  { id: "P002", name: "Anjali Nair", age: 32 },
  { id: "P003", name: "Arjun Menon", age: 51 },
  { id: "P004", name: "Priya Menon", age: 39 },
  { id: "P005", name: "Vivek Nair", age: 48 },
];

export default function VoicePage() {
  const [selectedPatient, setSelectedPatient] = useState("P001");
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const patient = patients.find((p) => p.id === selectedPatient)!;

  const transcript =
    "Patient reports feeling fatigued for the past three days. No fever reported. Appetite remains normal. Follow-up advised after reviewing the latest laboratory results.";

  const startRecording = () => {
    setIsSaved(false);
    setHasRecording(false);
    setIsRecording(true);
  };

  const stopRecording = () => {
    setIsRecording(false);
    setHasRecording(true);
  };

  const transcribe = () => {
    setIsTranscribing(true);

    setTimeout(() => {
      setIsTranscribing(false);
    }, 1400);
  };

  const saveNote = () => {
    setIsSaved(true);
  };

  const reset = () => {
    setIsRecording(false);
    setHasRecording(false);
    setIsTranscribing(false);
    setIsSaved(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />

      <div className="ml-[250px] min-h-screen">
        <Header />

        <main className="px-8 py-8">
          <div className="mx-auto max-w-5xl">
            {/* Page header */}
            <div className="mb-8">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-lumen-border bg-card">
                  <Mic size={14} className="text-lumen-green" />
                </div>

                <span className="text-xs font-medium uppercase tracking-[0.14em] text-lumen-muted">
                  Voice Notes
                </span>
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Record a note
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-lumen-muted">
                Dictate a clinical note and save the transcription directly to
                the selected patient&apos;s local record.
              </p>
            </div>

            {/* Patient selector */}
            <section className="mb-6 rounded-2xl border border-lumen-border bg-card p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <UserRound size={16} className="text-lumen-muted" />

                <span className="text-sm font-medium text-foreground">
                  Patient
                </span>
              </div>

              <div className="relative max-w-md">
                <select
                  value={selectedPatient}
                  onChange={(e) => {
                    setSelectedPatient(e.target.value);
                    reset();
                  }}
                  className="w-full appearance-none rounded-xl border border-lumen-border bg-input px-4 py-3 pr-10 text-sm font-medium text-foreground outline-none transition focus:border-lumen-green"
                >
                  {patients.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} · {item.id} · {item.age} years
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lumen-muted"
                />
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs text-lumen-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-lumen-green" />
                Note will be stored under {patient.name}&apos;s local record.
              </div>
            </section>

            {/* Main recording card */}
            <section className="overflow-hidden rounded-2xl border border-lumen-border bg-card shadow-sm">
              {/* Top bar */}
              <div className="flex items-center justify-between border-b border-lumen-border px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Doctor&apos;s dictation
                  </p>

                  <p className="mt-0.5 text-xs text-lumen-muted">
                    {isRecording
                      ? "Recording locally..."
                      : hasRecording
                        ? "Recording captured"
                        : "Ready to record"}
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-full border border-lumen-border bg-card-hover px-3 py-1.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isRecording
                        ? "animate-pulse bg-red-500"
                        : "bg-lumen-green"
                    }`}
                  />

                  <span className="text-[11px] font-medium text-lumen-muted">
                    {isRecording ? "Recording" : "Local"}
                  </span>
                </div>
              </div>

              {/* Recorder */}
              <div className="px-6 py-10">
                <div className="mx-auto max-w-2xl">
                  {/* Waveform */}
                  <div className="flex h-28 items-center justify-center gap-[5px]">
                    {Array.from({ length: 48 }).map((_, index) => {
                      const heights = [
                        18, 28, 14, 36, 22, 44, 30, 20, 48, 26, 38, 18,
                        52, 32, 22, 42, 28, 56, 34, 20, 46, 30, 38, 24,
                        50, 28, 18, 42, 32, 54, 24, 40, 20, 48, 30, 22,
                        44, 28, 36, 18, 50, 26, 40, 22, 46, 30, 20, 34,
                      ];

                      return (
                        <span
                          key={index}
                          className={`w-[3px] rounded-full transition-all duration-300 ${
                            isRecording
                              ? "bg-lumen-green"
                              : hasRecording
                                ? "bg-lumen-green/60"
                                : "bg-lumen-border"
                          }`}
                          style={{
                            height: `${heights[index]}px`,
                            opacity: isRecording
                              ? 0.55 + ((index % 5) * 0.1)
                              : hasRecording
                                ? 0.7
                                : 1,
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Recording status */}
                  <div className="mb-8 text-center">
                    {isRecording ? (
                      <>
                        <p className="text-sm font-medium text-foreground">
                          Listening...
                        </p>

                        <div className="mt-2 flex items-center justify-center gap-2 text-xs text-lumen-muted">
                          <Clock3 size={13} />
                          Recording your note
                        </div>
                      </>
                    ) : hasRecording ? (
                      <>
                        <p className="text-sm font-medium text-foreground">
                          Recording ready
                        </p>

                        <p className="mt-2 text-xs text-lumen-muted">
                          Transcribe it to review the note before saving.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-foreground">
                          Start when you&apos;re ready
                        </p>

                        <p className="mt-2 text-xs text-lumen-muted">
                          Your voice stays on this device.
                        </p>
                      </>
                    )}
                  </div>

                  {/* Record button */}
                  <div className="flex justify-center">
                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        className="group flex h-16 w-16 items-center justify-center rounded-full bg-lumen-navy text-white shadow-lg transition hover:scale-[1.03] hover:shadow-xl dark:text-[#0B1110]"
                        aria-label="Start recording"
                      >
                        <Mic
                          size={25}
                          className="transition group-hover:scale-105"
                        />
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        className="group flex h-16 w-16 items-center justify-center rounded-full border-2 border-red-200 bg-red-50 text-red-600 shadow-sm transition hover:scale-[1.03] dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
                        aria-label="Stop recording"
                      >
                        <Square size={21} fill="currentColor" />
                      </button>
                    )}
                  </div>

                  <p className="mt-4 text-center text-[11px] text-lumen-muted">
                    {isRecording
                      ? "Click to stop"
                      : "Click the microphone to begin"}
                  </p>
                </div>
              </div>

              {/* Recording actions */}
              {hasRecording && !isSaved && (
                <div className="border-t border-lumen-border bg-card-hover px-6 py-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-lumen-border bg-card">
                        <Clock3 size={15} className="text-lumen-muted" />
                      </div>

                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Recording captured
                        </p>
                        <p className="text-xs text-lumen-muted">
                          Ready for local transcription
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={transcribe}
                      disabled={isTranscribing}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-lumen-navy px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 dark:text-[#0B1110]"
                    >
                      <Sparkles size={15} />

                      {isTranscribing
                        ? "Transcribing..."
                        : "Transcribe locally"}
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* Transcript */}
            {hasRecording && !isTranscribing && (
              <section className="mt-6 rounded-2xl border border-lumen-border bg-card shadow-sm">
                <div className="flex items-center justify-between border-b border-lumen-border px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-lumen-border bg-card-hover">
                      <FileText size={16} className="text-lumen-muted" />
                    </div>

                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Transcription
                      </p>

                      <p className="text-xs text-lumen-muted">
                        Review before saving to the patient record
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full border border-lumen-border bg-card-hover px-3 py-1 text-[11px] font-medium text-lumen-muted">
                    Local transcription
                  </span>
                </div>

                <div className="p-6">
                  <div className="rounded-xl border border-lumen-border bg-input p-5">
                    <p className="text-sm leading-7 text-foreground">
                      {transcript}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                      onClick={reset}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-lumen-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-card-hover"
                    >
                      <RotateCcw size={15} />
                      Record again
                    </button>

                    <button
                      onClick={saveNote}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-lumen-navy px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 dark:text-[#0B1110]"
                    >
                      <Save size={15} />
                      Save to record
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* Saved state */}
            {isSaved && (
              <section className="mt-6 rounded-2xl border border-lumen-border bg-card p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lumen-green-light">
                    <CheckCircle2
                      size={19}
                      className="text-lumen-green"
                    />
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      Note saved to {patient.name}&apos;s record
                    </p>

                    <p className="mt-1 text-sm leading-6 text-lumen-muted">
                      The transcription is now part of the patient&apos;s local
                      record and can be retrieved by Lumen.
                    </p>

                    <div className="mt-4 flex items-center gap-2 text-xs text-lumen-muted">
                      <FileText size={13} />
                      Voice note · Today
                    </div>
                  </div>

                  <button
                    onClick={reset}
                    className="rounded-lg border border-lumen-border px-3 py-2 text-xs font-medium text-foreground transition hover:bg-card-hover"
                  >
                    New note
                  </button>
                </div>
              </section>
            )}

            {/* Privacy / local AI note */}
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-lumen-border bg-card-hover px-5 py-4">
              <ShieldCheck
                size={17}
                className="mt-0.5 shrink-0 text-lumen-green"
              />

              <div>
                <p className="text-xs font-medium text-foreground">
                  Runs locally
                </p>

                <p className="mt-1 text-xs leading-5 text-lumen-muted">
                  Voice transcription is designed to run locally using
                  Whisper. No audio needs to leave the doctor&apos;s workspace.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}