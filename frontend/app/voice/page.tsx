"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AudioLines,
  CheckCircle2,
  ChevronDown,
  FileText,
  LoaderCircle,
  Mic,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Square,
  UserRound,
} from "lucide-react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

type Patient = { id: string; name: string; age: number | null };
type TranscriptSegment = {
  start: number;
  end: number;
  speaker: string;
  text: string;
};

function publishConsultationActive(
  active: boolean,
  recording = active,
  processing = false,
): Promise<void> {
  return fetch("/api/voice-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ consultationActive: active, recording, processing }),
    keepalive: true,
  })
    .then(() => undefined)
    .catch(() => {
      // The voice assistant handoff is optional when only the website is running.
    });
}

export default function VoicePage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [autoStartRequested, setAutoStartRequested] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isStartingRecording, setIsStartingRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [speakers, setSpeakers] = useState<string[]>([]);
  const [speakerRoles, setSpeakerRoles] = useState<Record<string, string>>({});
  const [report, setReport] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const discardRecordingRef = useRef(false);
  const autoTranscribeOnStopRef = useRef(false);
  const autoStartConsumedRef = useRef(false);
  const consultationModeRef = useRef(false);
  const recordingAttemptRef = useRef(0);

  const patient = useMemo(
    () => patients.find((item) => item.id === selectedPatient),
    [patients, selectedPatient],
  );
  const assignedRoles = Object.values(speakerRoles);
  const canSummarize =
    assignedRoles.filter((role) => role === "Doctor").length === 1 &&
    assignedRoles.filter((role) => role === "Patient").length === 1;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/patients", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not load patients.");
        return data as Patient[];
      })
      .then((data) => {
        if (cancelled) return;
        setPatients(data);
        setSelectedPatient(data[0]?.id ?? "");
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : "Could not load patients.");
        }
      })
      .finally(() => {
        if (!cancelled) setPatientsLoading(false);
      });

    return () => {
      cancelled = true;
      recordingAttemptRef.current += 1;
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => () => {
    if (consultationModeRef.current) {
      consultationModeRef.current = false;
      void publishConsultationActive(false);
    }
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("startConsultation") === "1") {
      url.searchParams.delete("startConsultation");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      autoStartConsumedRef.current = false;
      setAutoStartRequested(true);
    }

    const requestAutoStart = () => {
      autoStartConsumedRef.current = false;
      setAutoStartRequested(true);
    };
    window.addEventListener("lumen-start-consultation", requestAutoStart);
    return () => window.removeEventListener("lumen-start-consultation", requestAutoStart);
  }, []);

  useEffect(() => {
    if (!autoStartRequested || patientsLoading || autoStartConsumedRef.current) return;
    if (!selectedPatient) {
      autoStartConsumedRef.current = true;
      setAutoStartRequested(false);
      setError("Choose a patient before starting a consultation by voice.");
      consultationModeRef.current = false;
      void publishConsultationActive(false);
      return;
    }
    if (isRecording || isStartingRecording || isProcessing) {
      setAutoStartRequested(false);
      setError("Finish the current consultation before starting another one by voice.");
      return;
    }
    autoStartConsumedRef.current = true;
    setAutoStartRequested(false);
    void startRecording({ autoTranscribeAfterStop: true });
  }, [autoStartRequested, isProcessing, isRecording, isStartingRecording, patientsLoading, selectedPatient, startRecording]);

  function clearConsultation() {
    recordingAttemptRef.current += 1;
    autoTranscribeOnStopRef.current = false;
    consultationModeRef.current = false;
    void publishConsultationActive(false);
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      discardRecordingRef.current = true;
      recorder.onstop = null;
      recorder.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    recorderRef.current = null;
    streamRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
    setIsStartingRecording(false);
    setAudioBlob(null);
    setSegments([]);
    setSpeakers([]);
    setSpeakerRoles({});
    setReport("");
    setSaved(false);
    setError("");
  }

  async function startRecording(options: { autoTranscribeAfterStop?: boolean } = {}) {
    const attempt = ++recordingAttemptRef.current;
    setError("");
    setSaved(false);
    setIsStartingRecording(true);
    autoTranscribeOnStopRef.current = Boolean(options.autoTranscribeAfterStop);
    consultationModeRef.current = true;
    void publishConsultationActive(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("This browser does not support local audio recording.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (attempt !== recordingAttemptRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      chunksRef.current = [];
      discardRecordingRef.current = false;

      const supportedType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
        .find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = supportedType
        ? new MediaRecorder(stream, { mimeType: supportedType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        void publishConsultationActive(true, false, false);
        if (!discardRecordingRef.current) {
          const recording = new Blob(chunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });
          if (recording.size > 0) {
            setAudioBlob(recording);
            if (autoTranscribeOnStopRef.current) {
              autoTranscribeOnStopRef.current = false;
              void transcribeConsultation(recording);
            }
          } else {
            setError("No audio was captured. Please try recording again.");
            consultationModeRef.current = false;
            void publishConsultationActive(false);
          }
        }
        setIsRecording(false);
      };
      recorder.start(1000);
      setIsStartingRecording(false);
      setAudioBlob(null);
      setSegments([]);
      setSpeakers([]);
      setSpeakerRoles({});
      setReport("");
      setIsRecording(true);
    } catch (reason) {
      if (attempt !== recordingAttemptRef.current) return;
      autoTranscribeOnStopRef.current = false;
      consultationModeRef.current = false;
      void publishConsultationActive(false);
      setIsStartingRecording(false);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      setError(reason instanceof Error ? reason.message : "Could not start recording.");
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  async function transcribeConsultation(recording: Blob | null = audioBlob) {
    if (!recording || !selectedPatient) {
      consultationModeRef.current = false;
      void publishConsultationActive(false);
      setError("Choose a patient and make a recording before transcription.");
      return;
    }
    setIsProcessing(true);
    void publishConsultationActive(true, false, true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch("/api/consultations/transcribe", {
        method: "POST",
        headers: {
          "Content-Type": recording.type || "audio/webm",
          "X-Patient-Id": selectedPatient,
        },
        body: recording,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not process the recording.");
      setSegments(data.segments as TranscriptSegment[]);
      setSpeakers(data.speakers as string[]);
      setSpeakerRoles(Object.fromEntries((data.speakers as string[]).map((speaker) => [speaker, ""])));
      setReport("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not process the recording.");
    } finally {
      setIsProcessing(false);
      consultationModeRef.current = false;
      void publishConsultationActive(false);
    }
  }

  async function generateReport() {
    if (!selectedPatient || !canSummarize) return;
    setIsSummarizing(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch("/api/consultations/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: selectedPatient, segments, speakerRoles }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not draft the report.");
      setReport(data.report as string);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not draft the report.");
    } finally {
      setIsSummarizing(false);
    }
  }

  async function saveReport() {
    if (!selectedPatient || !report.trim()) return;
    setIsSaving(true);
    setError("");
    try {
      const response = await fetch("/api/consultations/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: selectedPatient, report }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save the report.");
      setSaved(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save the report.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="ml-[250px] min-h-screen">
        <Header />
        <main className="px-8 py-8">
          <div className="mx-auto max-w-5xl">
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
                Record a consultation
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-lumen-muted">
                Record locally, separate the speakers, correct any labels, then review Lumen&apos;s draft before saving it to the patient record.
              </p>
            </div>

            {error && (
              <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-rose-300/40 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <section className="mb-6 rounded-2xl border border-lumen-border bg-card p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <UserRound size={16} className="text-lumen-muted" />
                <span className="text-sm font-medium text-foreground">Patient</span>
              </div>
              <div className="relative max-w-md">
                <select
                  value={selectedPatient}
                  disabled={patientsLoading || patients.length === 0 || isRecording || isStartingRecording || isProcessing || isSummarizing || isSaving}
                  onChange={(event) => {
                    setSelectedPatient(event.target.value);
                    clearConsultation();
                  }}
                  className="w-full appearance-none rounded-xl border border-lumen-border bg-input px-4 py-3 pr-10 text-sm font-medium text-foreground outline-none transition focus:border-lumen-green disabled:opacity-60"
                >
                  {patientsLoading ? <option value="">Loading patients…</option> : null}
                  {!patientsLoading && patients.length === 0 ? <option value="">No local patients</option> : null}
                  {patients.map((item) => (
                    <option key={item.id} value={item.id}>{item.name} · {item.id}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lumen-muted" />
              </div>
              {patient && (
                <div className="mt-3 flex items-center gap-2 text-xs text-lumen-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-lumen-green" />
                  Report will be saved under {patient.name}&apos;s patient record.
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-lumen-border bg-card shadow-sm">
              <div className="flex items-center justify-between border-b border-lumen-border px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Consultation recording</p>
                  <p className="mt-0.5 text-xs text-lumen-muted">
                    {isStartingRecording ? "Waiting for microphone access…" : isRecording ? "Recording the full conversation locally…" : isProcessing ? "Transcribing and separating speakers locally…" : audioBlob ? "Recording captured" : "Ready to record"}
                  </p>
                </div>
                <span className="flex items-center gap-2 rounded-full border border-lumen-border bg-card-hover px-3 py-1.5 text-[11px] font-medium text-lumen-muted">
                  <span className={`h-1.5 w-1.5 rounded-full ${isRecording ? "animate-pulse bg-red-500" : isStartingRecording || isProcessing ? "animate-pulse bg-lumen-green" : "bg-lumen-green"}`} />
                  {isStartingRecording ? "Microphone" : isRecording ? "Recording" : isProcessing ? "Processing" : "Local"}
                </span>
              </div>
              <div className="px-6 py-10 text-center">
                <div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full ${isRecording ? "bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300" : "bg-lumen-green-light text-lumen-green"}`}>
                  {isRecording ? <AudioLines size={34} className="animate-pulse" /> : isStartingRecording || isProcessing ? <LoaderCircle size={32} className="animate-spin" /> : <Mic size={32} />}
                </div>
                <p className="mt-5 text-sm font-medium text-foreground">
                  {isStartingRecording ? "Allow microphone access to begin…" : isRecording ? "Listening to the consultation…" : isProcessing ? "Transcription and speaker separation are running…" : audioBlob ? "Full consultation ready" : "Start when the doctor and patient are ready"}
                </p>
                <p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-lumen-muted">
                  Keep both speakers audible. Lumen labels voices as Speaker 1 and Speaker 2; you will confirm which is the doctor and patient before drafting the report.
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  {!isRecording ? (
                    <button type="button" onClick={() => void startRecording()} disabled={!patient || patientsLoading || isStartingRecording || isProcessing || isSummarizing || isSaving} className="inline-flex items-center gap-2 rounded-xl bg-lumen-navy px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:text-[#0B1110]">
                      {isStartingRecording ? <LoaderCircle size={16} className="animate-spin" /> : <Mic size={16} />} {isStartingRecording ? "Starting…" : "Start consultation"}
                    </button>
                  ) : (
                    <button type="button" onClick={stopRecording} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-rose-700">
                      <Square size={15} fill="currentColor" /> Stop recording
                    </button>
                  )}
                  {audioBlob && !isRecording && (
                    <button type="button" onClick={clearConsultation} className="inline-flex items-center gap-2 rounded-xl border border-lumen-border px-4 py-3 text-sm font-medium text-foreground transition hover:bg-card-hover">
                      <RotateCcw size={15} /> Discard
                    </button>
                  )}
                </div>
              </div>
              {audioBlob && !segments.length && (
                <div className="flex flex-col gap-3 border-t border-lumen-border bg-card-hover px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Ready for local analysis</p>
                    <p className="mt-1 text-xs text-lumen-muted">Whisper transcribes; the diarization model labels the two voices.</p>
                  </div>
                  <button type="button" onClick={() => void transcribeConsultation()} disabled={isProcessing} className="inline-flex items-center justify-center gap-2 rounded-xl bg-lumen-navy px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60 dark:text-[#0B1110]">
                    {isProcessing ? <LoaderCircle size={15} className="animate-spin" /> : <Sparkles size={15} />}
                    {isProcessing ? "Transcribing and separating voices…" : "Transcribe and identify speakers"}
                  </button>
                </div>
              )}
            </section>

            {segments.length > 0 && !report && (
              <section className="mt-6 rounded-2xl border border-lumen-border bg-card shadow-sm">
                <div className="border-b border-lumen-border px-6 py-4">
                  <p className="text-sm font-medium text-foreground">Confirm who is speaking</p>
                  <p className="mt-1 text-xs text-lumen-muted">Speaker labels are estimated from voice characteristics and may need correction. Set each speaker&apos;s role and review the line labels before asking Lumen to draft the report.</p>
                </div>
                <div className="grid gap-4 border-b border-lumen-border p-5 sm:grid-cols-2">
                  {speakers.map((speaker, index) => (
                    <label key={speaker} className="text-xs font-medium text-lumen-muted">
                      {`Speaker ${index + 1} · ${speaker}`}
                      <select value={speakerRoles[speaker] ?? ""} onChange={(event) => setSpeakerRoles((current) => ({ ...current, [speaker]: event.target.value }))} className="mt-2 w-full rounded-xl border border-lumen-border bg-input px-3 py-2.5 text-sm text-foreground outline-none focus:border-lumen-green">
                        <option value="">Choose role…</option>
                        <option value="Doctor">Doctor</option>
                        <option value="Patient">Patient</option>
                        <option value="Other">Other participant</option>
                      </select>
                    </label>
                  ))}
                </div>
                {speakers.length < 2 && (
                  <div className="border-b border-lumen-border px-5 py-3 text-xs text-amber-700 dark:text-amber-300">
                    Lumen detected fewer than two distinct voices. Check that both speakers are audible, then discard and record again.
                  </div>
                )}
                <div className="max-h-80 space-y-2 overflow-y-auto p-5">
                  {segments.map((segment, index) => (
                    <div key={`${segment.start}-${index}`} className="grid grid-cols-[56px_132px_1fr] gap-3 rounded-lg bg-card-hover px-3 py-2.5 text-xs">
                      <span className="font-mono text-lumen-muted">{`${Math.floor(segment.start / 60)}:${String(Math.floor(segment.start % 60)).padStart(2, "0")}`}</span>
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-lumen-green">{speakerRoles[segment.speaker] || segment.speaker}</span>
                        <select
                          aria-label={`Correct speaker for transcript line ${index + 1}`}
                          value={segment.speaker}
                          onChange={(event) => {
                            const speaker = event.target.value;
                            setSegments((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, speaker } : item));
                          }}
                          className="w-full rounded border border-lumen-border bg-input px-1.5 py-1 text-[10px] text-foreground"
                        >
                          {segment.speaker === "UNKNOWN" && <option value="UNKNOWN">Unassigned</option>}
                          {speakers.map((speaker, speakerIndex) => (
                            <option key={speaker} value={speaker}>{`Speaker ${speakerIndex + 1}`}</option>
                          ))}
                        </select>
                      </div>
                      <span className="leading-5 text-foreground">{segment.text}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-3 border-t border-lumen-border bg-card-hover px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-lumen-muted">Check the labels and transcript before generating a report.</p>
                  <button type="button" onClick={generateReport} disabled={!canSummarize || isSummarizing} className="inline-flex items-center justify-center gap-2 rounded-xl bg-lumen-navy px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:text-[#0B1110]">
                    {isSummarizing ? <LoaderCircle size={15} className="animate-spin" /> : <Sparkles size={15} />}
                    {isSummarizing ? "Lumen is drafting…" : "Draft report with Lumen"}
                  </button>
                </div>
              </section>
            )}

            {report && (
              <section className="mt-6 rounded-2xl border border-lumen-border bg-card shadow-sm">
                <div className="flex items-center justify-between border-b border-lumen-border px-6 py-4">
                  <div className="flex items-center gap-3">
                    <FileText size={17} className="text-lumen-green" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Consultation report draft</p>
                      <p className="mt-0.5 text-xs text-lumen-muted">Generated locally with Lumen · Review and edit before saving</p>
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <textarea value={report} onChange={(event) => setReport(event.target.value)} rows={16} aria-label="Review and edit consultation report" className="w-full resize-y rounded-xl border border-lumen-border bg-input p-4 text-sm leading-6 text-foreground outline-none focus:border-lumen-green" />
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-lumen-muted">Save this reviewed report to {patient?.name ?? "the selected patient"}&apos;s record? It will then be available in Ask Lumen for that patient.</p>
                    <button type="button" onClick={saveReport} disabled={!report.trim() || isSaving || saved} className="inline-flex items-center justify-center gap-2 rounded-xl bg-lumen-navy px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:text-[#0B1110]">
                      {isSaving ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}
                      {saved ? "Saved to patient record" : isSaving ? "Saving…" : `Save to ${patient?.name ?? "patient"}'s record`}
                    </button>
                  </div>
                </div>
              </section>
            )}

            {saved && patient && (
              <div role="status" className="mt-5 flex items-start gap-3 rounded-xl border border-lumen-border bg-lumen-green-light p-4 text-sm text-foreground">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-lumen-green" />
                <span>The reviewed consultation report is saved and searchable under {patient.name}&apos;s record.</span>
              </div>
            )}

            <div className="mt-6 flex items-start gap-3 rounded-xl border border-lumen-border bg-card-hover px-5 py-4">
              <ShieldCheck size={17} className="mt-0.5 shrink-0 text-lumen-green" />
              <div>
                <p className="text-xs font-medium text-foreground">Local processing with clinician review</p>
                <p className="mt-1 text-xs leading-5 text-lumen-muted">Audio is sent only to this device&apos;s local Python service for transcription and speaker separation. Review the generated report before saving it to the patient record.</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
