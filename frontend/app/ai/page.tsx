"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUp,
  ChevronDown,
  ChevronRight,
  FileText,
  FlaskConical,
  Mic,
  Sparkles,
  UserRound,
} from "lucide-react";

import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

type Patient = {
  id: string;
  name: string;
  age: number;
};

const patients: Patient[] = [
  { id: "P001", name: "Rajesh Kumar", age: 45 },
  { id: "P002", name: "Anjali Nair", age: 32 },
  { id: "P003", name: "Arjun Menon", age: 51 },
  { id: "P004", name: "Priya Menon", age: 39 },
  { id: "P005", name: "Vivek Nair", age: 48 },
];

const defaultQuestion = "Show recorded hemoglobin values";

export default function AskLumenPage() {
  const [selectedPatient, setSelectedPatient] =
    useState("P001");

  const [question, setQuestion] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [hasAnswer, setHasAnswer] = useState(false);

  const selected =
    patients.find((patient) => patient.id === selectedPatient) ??
    patients[0];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const patient = params.get("patient");
    const q = params.get("q");

    if (patient && patients.some((item) => item.id === patient)) {
      setSelectedPatient(patient);
    }

    if (q) {
      setQuestion(q);
    }
  }, []);

  const askQuestion = (value?: string) => {
    const finalQuestion = (value ?? question).trim();

    if (!finalQuestion || isSearching) return;

    setQuestion(finalQuestion);
    setHasAnswer(false);
    setIsSearching(true);

    setTimeout(() => {
      setIsSearching(false);
      setHasAnswer(true);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />

      <div className="ml-[250px] min-h-screen">
        <Header />

        <main className="px-8 py-7">
          <div className="mx-auto max-w-5xl">
            {/* Page heading */}
            <div className="mb-6">
              <div className="flex items-start gap-3">
                <div className="relative mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-lumen-green-light">
                  <Sparkles
                    size={17}
                    className="text-lumen-green"
                  />

                  <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-lumen-green" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-semibold text-foreground">
                      Ask Lumen
                    </h1>

                    <span className="rounded-full bg-lumen-green-light px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-lumen-green">
                      Local AI
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-lumen-muted">
                    Search, organize and summarize documented patient
                    information.
                  </p>
                </div>
              </div>
            </div>

            {/* Patient context */}
            <div className="mb-4">
              <label className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.15em] text-lumen-muted">
                Patient context
              </label>

              <div className="relative">
                <div className="absolute left-4 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-card-hover">
                  <UserRound
                    size={14}
                    className="text-lumen-muted"
                  />
                </div>

                <select
                  value={selectedPatient}
                  onChange={(e) => {
                    setSelectedPatient(e.target.value);
                    setHasAnswer(false);
                  }}
                  className="w-full appearance-none rounded-xl border border-lumen-border bg-card py-3.5 pl-14 pr-10 text-sm font-medium text-foreground outline-none transition focus:border-lumen-green"
                >
                  {patients.map((patient) => (
                    <option
                      key={patient.id}
                      value={patient.id}
                    >
                      {patient.name} · {patient.id} ·{" "}
                      {patient.age} years
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lumen-muted"
                />
              </div>
            </div>

            {/* Assistant */}
            <section className="overflow-hidden rounded-2xl border border-lumen-border bg-card shadow-sm">
              {/* Assistant header */}
              <div className="flex items-center justify-between border-b border-lumen-border px-5 py-4">
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Patient record assistant
                  </p>

                  <p className="mt-1 text-[10px] text-lumen-muted">
                    {isSearching
                      ? `Searching records for ${selected.name}`
                      : hasAnswer
                        ? `Found relevant records for ${selected.name}`
                        : `Search documented records for ${selected.name}`}
                  </p>
                </div>

                <span className="inline-flex items-center gap-1.5 rounded-full border border-lumen-border bg-card-hover px-3 py-1.5 text-[9px] font-medium text-lumen-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-lumen-green" />
                  LOCAL
                </span>
              </div>

              {/* Conversation area */}
              <div className="min-h-[480px] px-5 py-8">
                {!isSearching && !hasAnswer && (
                  <EmptyState
                    patient={selected}
                    onQuestion={askQuestion}
                  />
                )}

                {isSearching && (
                  <SearchingState patient={selected} />
                )}

                {hasAnswer && !isSearching && (
                  <AnswerState
                    patient={selected}
                    question={question}
                  />
                )}
              </div>

              {/* Input */}
              <div className="border-t border-lumen-border px-5 py-4">
                <div className="flex items-center gap-2 rounded-xl border border-lumen-border bg-input p-1.5 focus-within:border-lumen-green">
                  <input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        askQuestion();
                      }
                    }}
                    placeholder={`Ask about ${selected.name}'s records...`}
                    className="min-w-0 flex-1 bg-transparent px-3 py-2 text-xs text-foreground outline-none placeholder:text-lumen-muted"
                  />

                  <button
                    type="button"
                    aria-label="Voice input"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lumen-muted transition hover:bg-card-hover hover:text-foreground"
                  >
                    <Mic size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={() => askQuestion()}
                    disabled={!question.trim() || isSearching}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-lumen-navy text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 dark:text-[#0B1110]"
                  >
                    <ArrowUp size={16} />
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-between px-1">
                  <p className="text-[9px] text-lumen-muted">
                    Lumen retrieves and summarizes documented information
                    only.
                  </p>

                  <Link
                    href={`/patients/${selected.id}`}
                    className="text-[9px] font-medium text-lumen-green transition hover:opacity-80"
                  >
                    View patient record
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function EmptyState({
  patient,
  onQuestion,
}: {
  patient: Patient;
  onQuestion: (question: string) => void;
}) {
  const questions = [
    "Show the latest lab results",
    "Show recorded hemoglobin values",
    "What changed since the previous visit?",
    "Summarize the recent records",
  ];

  return (
    <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center">
      <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-lumen-green-light">
        <Sparkles
          size={22}
          className="text-lumen-green"
        />

        <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-lumen-green" />
      </div>

      <h2 className="mt-5 text-base font-semibold text-foreground">
        Ask your patient&apos;s memory.
      </h2>

      <p className="mt-2 max-w-md text-xs leading-5 text-lumen-muted">
        Ask Lumen questions about information already documented in{" "}
        {patient.name}&apos;s records.
      </p>

      <div className="mt-7 grid w-full max-w-[560px] grid-cols-1 gap-2 sm:grid-cols-2">
        {questions.map((item) => (
          <button
            key={item}
            onClick={() => onQuestion(item)}
            className="group flex items-center justify-between rounded-xl border border-lumen-border bg-card px-4 py-3 text-left text-[11px] text-foreground transition hover:bg-card-hover"
          >
            <span>{item}</span>

            <ChevronRight
              size={13}
              className="text-lumen-muted transition-transform group-hover:translate-x-0.5"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function SearchingState({
  patient,
}: {
  patient: Patient;
}) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-card-hover">
        <Sparkles
          size={21}
          className="animate-pulse text-lumen-green"
        />
      </div>

      <h2 className="mt-5 text-sm font-semibold text-foreground">
        Searching patient records
      </h2>

      <p className="mt-2 text-xs text-lumen-muted">
        Looking through documented information for {patient.name}.
      </p>

      <div className="mt-5 flex items-center gap-2 text-[10px] text-lumen-muted">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lumen-green" />
        Retrieving relevant records...
      </div>
    </div>
  );
}

function AnswerState({
  patient,
  question,
}: {
  patient: Patient;
  question: string;
}) {
  const isHemoglobin =
    question.toLowerCase().includes("hemoglobin");

  return (
    <div className="mx-auto max-w-3xl">
      {/* User question */}
      <div className="mb-6 flex justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-br-md bg-lumen-navy px-4 py-3 text-xs leading-5 text-white dark:text-[#0B1110]">
          {question}
        </div>
      </div>

      {/* Answer */}
      <div className="rounded-2xl border border-lumen-border bg-card-hover p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-lumen-green-light">
            <Sparkles
              size={15}
              className="text-lumen-green"
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-foreground">
                Lumen
              </p>

              <span className="rounded-full border border-lumen-border bg-card px-2 py-0.5 text-[8px] uppercase tracking-wide text-lumen-muted">
                Record grounded
              </span>
            </div>

            <p className="mt-3 text-xs leading-6 text-foreground">
              {isHemoglobin ? (
                <>
                  The documented hemoglobin values I found for{" "}
                  <strong>{patient.name}</strong> are:
                </>
              ) : (
                <>
                  I found the following documented information in{" "}
                  <strong>{patient.name}&apos;s</strong> recent records.
                </>
              )}
            </p>

            {isHemoglobin && (
              <div className="mt-4 overflow-hidden rounded-xl border border-lumen-border bg-card">
                <div className="grid grid-cols-2 border-b border-lumen-border px-4 py-2.5 text-[9px] font-semibold uppercase tracking-wide text-lumen-muted">
                  <span>Date</span>
                  <span>Hemoglobin</span>
                </div>

                <div className="grid grid-cols-2 px-4 py-3 text-xs text-foreground">
                  <span>28 Sep 2026</span>
                  <span>8.2 g/dL</span>
                </div>

                <div className="grid grid-cols-2 border-t border-lumen-border px-4 py-3 text-xs text-foreground">
                  <span>14 Sep 2026</span>
                  <span>9.1 g/dL</span>
                </div>
              </div>
            )}

            {!isHemoglobin && (
              <p className="mt-3 text-xs leading-6 text-foreground">
                The latest documented consultation notes fatigue for
                approximately three days. A hemoglobin result of 8.2 g/dL
                was recorded on 28 Sep 2026.
              </p>
            )}

            {/* Sources */}
            <div className="mt-5">
              <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-lumen-muted">
                Found in records
              </p>

              <div className="space-y-2">
                <SourceCard
                  icon="lab"
                  title="Hemoglobin"
                  date="28 Sep 2026"
                  detail="Hemoglobin: 8.2 g/dL"
                />

                <SourceCard
                  icon="lab"
                  title="Previous hemoglobin"
                  date="14 Sep 2026"
                  detail="Hemoglobin: 9.1 g/dL"
                />

                <SourceCard
                  icon="note"
                  title="Recent consultation"
                  date="28 Sep 2026"
                  detail="Patient reported feeling fatigued for approximately three days."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SourceCard({
  icon,
  title,
  date,
  detail,
}: {
  icon: "lab" | "note";
  title: string;
  date: string;
  detail: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-lumen-border bg-card px-3.5 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card-hover">
        {icon === "lab" ? (
          <FlaskConical
            size={14}
            className="text-lumen-muted"
          />
        ) : (
          <FileText
            size={14}
            className="text-lumen-muted"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-medium text-foreground">
            {title}
          </p>

          <span className="shrink-0 text-[9px] text-lumen-muted">
            {date}
          </span>
        </div>

        <p className="mt-1 truncate text-[10px] text-lumen-muted">
          {detail}
        </p>
      </div>
    </div>
  );
}