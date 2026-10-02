"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarDays, FileText, Mic, MessageSquare, UserRound } from "lucide-react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

type Note = { id: string; date: string | null; author: string | null; text: string; test_name: string | null; value: number | null; flag_for_review: number };
type Patient = { id: string; name: string; age: number | null; notes: Note[] };

export default function PatientDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/patients/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Patient not found."); return data as Patient; })
      .then((data) => { if (!cancelled) setPatient(data); })
      .catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load patient."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);
  const initials = patient?.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return <div className="min-h-screen bg-background text-foreground"><Sidebar /><div className="ml-[250px] min-h-screen"><Header /><main className="px-8 py-7"><div className="mx-auto max-w-5xl">
    <Link href="/patients" className="mb-6 inline-flex items-center gap-2 text-xs font-medium text-lumen-muted hover:text-foreground"><ArrowLeft size={14} />Back to My Patients</Link>
    {loading ? <div className="rounded-2xl border border-lumen-border bg-card p-8 text-sm text-lumen-muted">Loading patient record…</div> : error || !patient ? <div role="alert" className="rounded-2xl border border-rose-300/40 bg-rose-50 p-6 text-sm text-rose-700">{error || "Patient not found."}</div> : <>
      <section className="mb-5 rounded-2xl border border-lumen-border bg-card p-5 shadow-sm"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div className="flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-full bg-card-hover text-sm font-semibold text-lumen-green">{initials}</div><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-semibold">{patient.name}</h1><span className="rounded-md border border-lumen-border bg-card-hover px-2 py-0.5 text-[10px] font-medium text-lumen-green">{patient.id}</span></div><p className="mt-2 flex items-center gap-2 text-xs text-lumen-muted"><UserRound size={13} />{patient.age == null ? "Age not recorded" : `${patient.age} years old`} · <FileText size={13} />{patient.notes.length} saved notes</p></div></div><div className="flex gap-2"><Link href={`/voice?patient=${encodeURIComponent(patient.id)}`} className="inline-flex items-center gap-2 rounded-xl border border-lumen-border px-3 py-2 text-xs font-medium"><Mic size={14} />Voice note</Link><Link href={`/ai?patient=${encodeURIComponent(patient.id)}`} className="inline-flex items-center gap-2 rounded-xl bg-lumen-green px-3 py-2 text-xs font-medium text-white"><MessageSquare size={14} />Ask Lumen</Link></div></div></section>
      <section className="rounded-2xl border border-lumen-border bg-card p-5 shadow-sm"><div className="mb-4 flex items-center gap-2"><FileText size={16} className="text-lumen-green" /><h2 className="text-sm font-semibold">Patient notes and reports</h2></div>{patient.notes.length === 0 ? <div className="rounded-xl border border-dashed border-lumen-border py-12 text-center text-sm text-lumen-muted">No notes have been saved for this patient yet.</div> : <div className="space-y-3">{patient.notes.map((note) => <article key={note.id} className="rounded-xl border border-lumen-border bg-background p-4"><div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-lumen-muted"><span className="inline-flex items-center gap-1.5"><CalendarDays size={13} />{note.date || "Date not recorded"}</span><span>{note.author || "Author not recorded"}</span></div>{note.test_name && <p className="mb-1 text-xs font-semibold">{note.test_name}{note.value != null ? `: ${note.value}` : ""}</p>}<p className="whitespace-pre-wrap text-sm leading-6">{note.text}</p>{note.flag_for_review ? <p className="mt-2 text-xs font-medium text-amber-700">Flagged for review</p> : null}</article>)}</div>}</section>
    </>}
  </div></main></div></div>;
}
