"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  FileText,
  FlaskConical,
  Mic,
  MessageSquare,
  Plus,
  Sparkles,
  UserRound,
} from "lucide-react";

import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

type RecordItem = {
  id: number;
  title: string;
  type: "Clinical Note" | "Lab Result";
  date: string;
  content: string;
  icon: "note" | "lab";
  latest?: boolean;
};

type Patient = {
  id: string;
  name: string;
  age: number;
  gender: string;
  updated: string;
  records: number;
  labs: number;
  notes: number;
  voice: number;
  summary: string;
  recordsList: RecordItem[];
};

const patients: Record<string, Patient> = {
  P001: {
    id: "P001",
    name: "Rajesh Kumar",
    age: 45,
    gender: "Male",
    updated: "28 Sep 2026",
    records: 5,
    labs: 3,
    notes: 2,
    voice: 0,
    summary:
      "Recent records document fatigue for approximately three days, with a recorded hemoglobin value of 8.2 g/dL. Previous documented hemoglobin was 9.1 g/dL on 14 Sep 2026.",
    recordsList: [
      {
        id: 1,
        title: "Recent consultation",
        type: "Clinical Note",
        date: "28 Sep 2026",
        content:
          "Patient reported feeling fatigued for approximately three days.",
        icon: "note",
        latest: true,
      },
      {
        id: 2,
        title: "Hemoglobin",
        type: "Lab Result",
        date: "28 Sep 2026",
        content: "Hemoglobin: 8.2 g/dL",
        icon: "lab",
      },
      {
        id: 3,
        title: "Follow-up note",
        type: "Clinical Note",
        date: "25 Sep 2026",
        content:
          "Follow-up consultation recorded. Patient history and recent observations documented.",
        icon: "note",
      },
      {
        id: 4,
        title: "Blood glucose",
        type: "Lab Result",
        date: "20 Sep 2026",
        content: "Glucose: 102 mg/dL",
        icon: "lab",
      },
      {
        id: 5,
        title: "Previous hemoglobin",
        type: "Lab Result",
        date: "14 Sep 2026",
        content: "Hemoglobin: 9.1 g/dL",
        icon: "lab",
      },
    ],
  },

  P002: {
    id: "P002",
    name: "Anjali Nair",
    age: 32,
    gender: "Female",
    updated: "27 Sep 2026",
    records: 4,
    labs: 2,
    notes: 2,
    voice: 0,
    summary:
      "Recent documented records include two laboratory results and two clinical notes.",
    recordsList: [],
  },

  P003: {
    id: "P003",
    name: "Arjun Menon",
    age: 51,
    gender: "Male",
    updated: "26 Sep 2026",
    records: 8,
    labs: 4,
    notes: 4,
    voice: 0,
    summary:
      "The patient has eight documented records in the local workspace.",
    recordsList: [],
  },

  P004: {
    id: "P004",
    name: "Priya Menon",
    age: 39,
    gender: "Female",
    updated: "24 Sep 2026",
    records: 5,
    labs: 3,
    notes: 2,
    voice: 0,
    summary:
      "The patient has five documented records in the local workspace.",
    recordsList: [],
  },
};

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();

  const id = String(params?.id ?? "P001");
  const patient = patients[id] ?? patients.P001;

  const initials = patient.name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />

      <div className="ml-[250px] min-h-screen">
        <Header />

        <main className="px-8 py-7">
          <div className="mx-auto max-w-5xl">
            {/* Back */}
            <button
              onClick={() => router.push("/patients")}
              className="mb-6 inline-flex items-center gap-2 text-xs font-medium text-lumen-muted transition hover:text-foreground"
            >
              <ArrowLeft size={14} />
              Back to My Patients
            </button>

            {/* Patient header */}
            <section className="mb-5 rounded-2xl border border-lumen-border bg-card p-5 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-card-hover text-sm font-semibold text-lumen-green">
                    {initials}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-xl font-semibold tracking-tight text-foreground">
                        {patient.name}
                      </h1>

                      <span className="rounded-md border border-lumen-border bg-card-hover px-2 py-0.5 text-[10px] font-medium text-lumen-green">
                        {patient.id}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-lumen-muted">
                      <span>{patient.age} years</span>
                      <span>•</span>
                      <span>{patient.gender}</span>
                      <span>•</span>

                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays size={12} />
                        Updated {patient.updated}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/ai?patient=${patient.id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-lumen-navy px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 dark:text-[#0B1110]"
                  >
                    <MessageSquare size={15} />
                    Ask Lumen
                  </Link>

                  <Link
                    href={`/voice?patient=${patient.id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-lumen-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-card-hover"
                  >
                    <Mic size={15} />
                    Add Voice Note
                  </Link>
                </div>
              </div>
            </section>

            {/* Lumen Memory */}
            <section className="mb-7 rounded-2xl border border-lumen-border bg-card p-4 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lumen-green-light">
                    <Sparkles
                      size={16}
                      className="text-lumen-green"
                    />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Lumen Memory
                    </p>

                    <p className="text-[11px] text-lumen-muted">
                      Everything currently documented for this patient.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <MemoryStat
                    value={patient.records}
                    label="Records"
                  />

                  <MemoryStat
                    value={patient.labs}
                    label="Labs"
                  />

                  <MemoryStat
                    value={patient.notes}
                    label="Notes"
                  />

                  <MemoryStat
                    value={patient.voice}
                    label="Voice"
                  />
                </div>
              </div>
            </section>

            {/* Timeline */}
            <section>
              <div className="mb-4">
                <h2 className="text-base font-semibold text-foreground">
                  Record Timeline
                </h2>

                <p className="mt-1 text-xs text-lumen-muted">
                  A chronological view of documented information.
                </p>
              </div>

              {patient.recordsList.length > 0 ? (
                <div className="relative">
                  <div className="absolute bottom-4 left-[17px] top-4 w-px bg-lumen-border" />

                  <div className="space-y-3">
                    {patient.recordsList.map((item) => (
                      <RecordCard
                        key={item.id}
                        item={item}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-lumen-border bg-card p-10 text-center">
                  <FileText
                    size={22}
                    className="mx-auto text-lumen-muted"
                  />

                  <p className="mt-3 text-sm font-medium text-foreground">
                    No records to display
                  </p>

                  <p className="mt-1 text-xs text-lumen-muted">
                    Documented patient information will appear here.
                  </p>
                </div>
              )}
            </section>

            {/* Summary */}
            <section className="mt-8 rounded-2xl border border-lumen-border bg-card p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-card-hover">
                  <Sparkles
                    size={16}
                    className="text-lumen-green"
                  />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-foreground">
                      Lumen Summary
                    </h2>

                    <span className="rounded-full border border-lumen-border bg-card-hover px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-lumen-muted">
                      Record grounded
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-lumen-muted">
                    {patient.summary}
                  </p>

                  <div className="mt-4 flex items-center gap-2 text-[11px] text-lumen-muted">
                    <FileText size={12} />
                    Based only on documented patient records
                  </div>
                </div>
              </div>
            </section>

            {/* Suggested questions */}
            <section className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Suggested questions
                  </h2>

                  <p className="mt-1 text-xs text-lumen-muted">
                    Ask Lumen about information already in this record.
                  </p>
                </div>

                <Link
                  href={`/ai?patient=${patient.id}`}
                  className="hidden items-center gap-1 text-xs font-medium text-lumen-green transition hover:opacity-80 sm:flex"
                >
                  Open Ask Lumen
                  <ArrowRight size={13} />
                </Link>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <QuestionCard
                  text="What were the previous hemoglobin values?"
                  patientId={patient.id}
                />

                <QuestionCard
                  text="What was documented during the latest visit?"
                  patientId={patient.id}
                />

                <QuestionCard
                  text="Show the latest laboratory results."
                  patientId={patient.id}
                />

                <QuestionCard
                  text="Summarize the recent records."
                  patientId={patient.id}
                />
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function MemoryStat({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div className="min-w-[58px] rounded-xl bg-card-hover px-4 py-2.5 text-center">
      <p className="text-sm font-semibold text-foreground">
        {value}
      </p>

      <p className="mt-0.5 text-[9px] text-lumen-muted">
        {label}
      </p>
    </div>
  );
}

function RecordCard({
  item,
}: {
  item: RecordItem;
}) {
  const isLab = item.icon === "lab";

  return (
    <div className="relative pl-12">
      <div className="absolute left-0 top-5 flex h-[34px] w-[34px] items-center justify-center rounded-full border border-lumen-border bg-card text-lumen-green">
        {isLab ? (
          <FlaskConical size={14} />
        ) : (
          <FileText size={14} />
        )}
      </div>

      <article className="rounded-2xl border border-lumen-border bg-card p-5 shadow-sm transition hover:bg-card-hover">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                {item.title}
              </h3>

              {item.latest && (
                <span className="rounded-full bg-lumen-green-light px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-lumen-green">
                  Latest
                </span>
              )}
            </div>

            <p className="mt-1 text-[10px] text-lumen-muted">
              {item.type}
            </p>
          </div>

          <span className="text-[10px] text-lumen-muted">
            {item.date}
          </span>
        </div>

        <p className="mt-4 text-xs leading-6 text-foreground">
          {item.content}
        </p>

        <div className="mt-4 flex items-center gap-1.5 text-[10px] text-lumen-green">
          <FileText size={11} />
          Source: patient record
        </div>
      </article>
    </div>
  );
}

function QuestionCard({
  text,
  patientId,
}: {
  text: string;
  patientId: string;
}) {
  return (
    <Link
      href={`/ai?patient=${patientId}&q=${encodeURIComponent(text)}`}
      className="group flex items-center justify-between rounded-xl border border-lumen-border bg-card px-4 py-3 transition hover:bg-card-hover"
    >
      <span className="text-xs text-foreground">
        {text}
      </span>

      <ChevronRight
        size={14}
        className="text-lumen-muted transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
      />
    </Link>
  );
}