"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  FileText,
  FlaskConical,
  LoaderCircle,
  Mic,
  RotateCcw,
  Sparkles,
  Square,
  UserRound,
} from "lucide-react";

import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { PixelBulb } from "@/components/ui/pixel-bulb";

const subscribeToNothing = () => () => {};
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

type Patient = {
  id: string;
  name: string;
  age: number | null;
};

type SimilarRecord = {
  noteId: string;
  patientId: string;
  patientName: string;
  patientAge: number | null;
  date: string;
  author: string | null;
  testName: string | null;
  value: number | string | null;
  text: string;
  similarityDistance: number;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  patientName?: string;
  patientId?: string;
  question?: string;
  sources?: string[];
  timestamp: string;
  status?: "sent" | "loading" | "error";
};

type PatientIndex = {
  byFullName: Map<string, Patient[]>;
  byNamePart: Map<string, Patient[]>;
  byId: Map<string, Patient>;
  firstPatient?: Patient;
  maxNameParts: number;
};

function normalizePatientText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/['’]s\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function addPatientToIndex(index: Map<string, Patient[]>, key: string, patient: Patient) {
  if (!key) return;
  const matches = index.get(key);
  if (matches) matches.push(patient);
  else index.set(key, [patient]);
}

function buildPatientIndex(patients: Patient[]): PatientIndex {
  const index: PatientIndex = {
    byFullName: new Map(),
    byNamePart: new Map(),
    byId: new Map(),
    firstPatient: patients[0],
    maxNameParts: 1,
  };

  for (const patient of patients) {
    const normalizedName = normalizePatientText(patient.name);
    const nameParts = normalizedName.split(" ").filter(Boolean);
    index.byId.set(patient.id, patient);
    index.maxNameParts = Math.max(index.maxNameParts, nameParts.length);
    addPatientToIndex(index.byFullName, normalizedName, patient);

    for (const part of new Set(nameParts.filter((token) => token.length > 2))) {
      addPatientToIndex(index.byNamePart, part, patient);
    }
  }

  return index;
}

function findUnmatchedPatientName(question: string): string | null {
  const patterns = [
    /\b([A-Za-z][A-Za-z'-]{2,})['’]s\b/gi,
    /\b(?:for|about|on|regarding|patient(?:\s+named)?)\s+(?:the\s+)?(?:(?:dr|doctor|mr|mrs|ms|miss)\.?\s+)?([A-Za-z][A-Za-z'-]{2,})/gi,
  ];
  const nonNames = new Set([
    "the", "a", "an", "my", "our", "her", "his", "their", "this", "that",
    "these", "those", "latest", "recent", "last", "previous", "older", "new",
    "patient", "patients", "record", "records", "report", "reports", "result",
    "results", "lab", "labs", "note", "notes", "chart", "visit", "visits",
    "medication", "medications", "treatment", "diagnosis", "today", "yesterday",
    "week", "month", "year", "someone", "anyone", "him", "them", "me", "you",
    "creatinine", "hemoglobin", "haemoglobin", "tsh", "glucose", "sodium", "potassium",
    "cholesterol", "blood", "pressure", "fatigue", "pain", "cough", "fever", "thyroid",
    "diabetes", "hypertension", "anemia", "anaemia", "insulin", "levothyroxine",
  ]);

  for (const pattern of patterns) {
    for (const match of question.matchAll(pattern)) {
      const candidate = match[1].replace(/[’']s$/i, "");
      if (!nonNames.has(candidate.toLocaleLowerCase())) return candidate;
    }
  }
  return null;
}

function resolvePatientForQuestion(
  question: string,
  index: PatientIndex,
  currentPatientId: string,
): { patient?: Patient; error?: string } {
  const questionParts = normalizePatientText(question).split(" ").filter(Boolean);
  const fullNameMatches = new Map<string, Patient>();

  for (let start = 0; start < questionParts.length; start += 1) {
    for (
      let count = 1;
      count <= index.maxNameParts && start + count <= questionParts.length;
      count += 1
    ) {
      const phrase = questionParts.slice(start, start + count).join(" ");
      for (const patient of index.byFullName.get(phrase) ?? []) {
        fullNameMatches.set(patient.id, patient);
        if (fullNameMatches.size > 1) {
          const matches = [...fullNameMatches.values()];
          return {
            error: `I found multiple patients matching the name: ${matches.slice(0, 5).map((item) => `${item.name} (${item.id})`).join(", ")}. Please clarify which patient you mean.`,
          };
        }
      }
    }
  }

  if (fullNameMatches.size === 1) return { patient: fullNameMatches.values().next().value };

  const nameTokenMatches = new Map<string, Patient>();
  for (const part of new Set(questionParts)) {
    for (const patient of index.byNamePart.get(part) ?? []) {
      nameTokenMatches.set(patient.id, patient);
      if (nameTokenMatches.size > 1) {
        const matches = [...nameTokenMatches.values()];
        return {
          error: `I found multiple patients matching that name: ${matches.slice(0, 5).map((item) => `${item.name} (${item.id})`).join(", ")}. Please clarify the full name or choose a patient from Active patient context.`,
        };
      }
    }
  }

  if (nameTokenMatches.size === 1) return { patient: nameTokenMatches.values().next().value };

  const unmatchedName = findUnmatchedPatientName(question);
  if (unmatchedName) {
    return {
      error: `I couldn't find “${unmatchedName}” in your local patient list. Check the name or choose a patient from Active patient context.`,
    };
  }

  return { patient: index.byId.get(currentPatientId) ?? index.firstPatient };
}

export default function AskLumenPage() {
  const hasHydrated = useSyncExternalStore(
    subscribeToNothing,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );
  const [selectedPatient, setSelectedPatient] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const patientIndex = useMemo(() => buildPatientIndex(patients), [patients]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [backendError, setBackendError] = useState("");

  // Input state - strictly isolated from rendered messages
  const [inputText, setInputText] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [similarRecords, setSimilarRecords] = useState<Record<string, SimilarRecord[]>>({});
  const [similarLoadingId, setSimilarLoadingId] = useState<string | null>(null);
  const pendingSimilarSearchRef = useRef(false);
  const [pendingAutoSubmit, setPendingAutoSubmit] = useState<{
    question: string;
    id: number;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const autoSubmitSequenceRef = useRef(0);
  const handledAutoSubmitRef = useRef<number | null>(null);

  const selected =
    patients.find((patient) => patient.id === selectedPatient) ??
    patients[0] ?? { id: "", name: "No patient records", age: 0 };

  useEffect(() => () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedPatient = params.get("patient");
    const query = params.get("q");
    const shouldAutoSubmit = params.get("send") === "1";
    const shouldFindSimilar = params.get("similar") === "1";

    let cancelled = false;
    fetch("/api/patients", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error ?? "Could not load local patients");
        return data as Patient[];
      })
      .then((data) => {
        if (cancelled) return;
        setPatients(data);
        const activeId = data.some((item) => item.id === requestedPatient)
          ? requestedPatient ?? ""
          : data[0]?.id ?? "";
        setSelectedPatient(activeId);
        setBackendError("");

        if (query) {
          setInputText(query);
          if (shouldAutoSubmit) {
            setPendingAutoSubmit({
              question: query,
              id: ++autoSubmitSequenceRef.current,
            });
          }
        }
        if (shouldFindSimilar) pendingSimilarSearchRef.current = true;
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setBackendError(
            reason instanceof Error
              ? reason.message
              : "Could not load local patients",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setPatientsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handlePrefillQuestion = (event: Event) => {
      const detail = (event as CustomEvent<
        string | { question: string; autoSubmit?: boolean }
      >).detail;
      const question = typeof detail === "string" ? detail : detail?.question;
      if (!question) return;
      setInputText(question);
      inputRef.current?.focus();
      if (typeof detail !== "string" && detail.autoSubmit) {
        setPendingAutoSubmit({
          question,
          id: ++autoSubmitSequenceRef.current,
        });
      }
    };

    window.addEventListener("lumen-prefill-question", handlePrefillQuestion);
    return () =>
      window.removeEventListener("lumen-prefill-question", handlePrefillQuestion);
  }, []);

  // Auto-scroll when messages change or while searching
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSearching]);

  const handleSendMessage = async (promptToSend?: string) => {
    const finalQuestion = (promptToSend ?? inputText).trim();

    if (!finalQuestion || isSearching || !selected.id) return;

    const routing = resolvePatientForQuestion(finalQuestion, patientIndex, selectedPatient);
    if (!routing.patient) {
      setBackendError(routing.error ?? "Please choose a patient before asking.");
      return;
    }
    const routedPatient = routing.patient;

    if (routedPatient.id !== selected.id) {
      setSelectedPatient(routedPatient.id);
      setMessages([]);
    }

    // Immediately clear the input dialogue to prevent stale text or backspace sync bugs
    setInputText("");

    const now = new Date();
    const timeString = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      role: "user",
      content: finalQuestion,
      patientName: routedPatient.name,
      timestamp: timeString,
      status: "sent",
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsSearching(true);
    setBackendError("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: routedPatient.id,
          question: finalQuestion,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Lumen could not answer this question");
      }

      const assistantMessage: ChatMessage = {
        id: `asst-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        role: "assistant",
        content:
          data.answer ?? "I don't have that information in documented records.",
        patientName: routedPatient.name,
        patientId: routedPatient.id,
        question: finalQuestion,
        sources: Array.isArray(data.sources) ? data.sources : [],
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: "sent",
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (reason: unknown) {
      const errMsg =
        reason instanceof Error
          ? reason.message
          : "Could not reach the local assistant";
      setBackendError(errMsg);

      const errorMessage: ChatMessage = {
        id: `asst-err-${Date.now()}`,
        role: "assistant",
        content: `Error: ${errMsg}. Please ensure the local Python backend is running on port 8765.`,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: "error",
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSearching(false);
      inputRef.current?.focus();
    }
  };

  const transcribeAndSendVoiceQuestion = async (audio: Blob) => {
    setIsTranscribing(true);
    setBackendError("");
    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": audio.type || "audio/webm" },
        body: audio,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not transcribe the recording.");

      const transcript = String(data.transcript ?? "").trim();
      if (!transcript) throw new Error("No speech was detected. Please try again.");
      setInputText(transcript);
      setIsTranscribing(false);
      await handleSendMessage(transcript);
    } catch (reason) {
      setBackendError(reason instanceof Error ? reason.message : "Could not transcribe the recording.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const startVoiceRecording = async () => {
    setBackendError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("This browser does not support audio recording.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
        .find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setIsRecording(false);
        const audio = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        audioChunksRef.current = [];
        if (!audio.size) {
          setBackendError("No audio was captured. Please try recording again.");
          return;
        }
        void transcribeAndSendVoiceQuestion(audio);
      };
      recorder.start(500);
      setIsRecording(true);
    } catch (reason) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setIsRecording(false);
      setBackendError(reason instanceof Error ? reason.message : "Could not start recording.");
    }
  };

  const stopVoiceRecording = () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  };

  useEffect(() => {
    if (
      !pendingAutoSubmit ||
      patientsLoading ||
      isSearching ||
      !selected.id ||
      handledAutoSubmitRef.current === pendingAutoSubmit.id
    ) {
      return;
    }

    handledAutoSubmitRef.current = pendingAutoSubmit.id;
    setPendingAutoSubmit(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("q");
    url.searchParams.delete("send");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    void handleSendMessage(pendingAutoSubmit.question);
  }, [handleSendMessage, isSearching, patientsLoading, pendingAutoSubmit, selected.id]);

  const clearChat = () => {
    setMessages([]);
    setInputText("");
    setBackendError("");
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const findSimilarRecords = async (message: ChatMessage) => {
    if (!message.patientId || !message.question || similarLoadingId) return;

    setSimilarLoadingId(message.id);
    setBackendError("");
    try {
      const response = await fetch("/api/similar-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: message.patientId,
          queryText: message.question,
          limit: 5,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Could not find similar records");
      }
      setSimilarRecords((previous) => ({
        ...previous,
        [message.id]: Array.isArray(data.records) ? data.records : [],
      }));
    } catch (reason: unknown) {
      setBackendError(
        reason instanceof Error
          ? reason.message
          : "Could not retrieve similar documented records",
      );
    } finally {
      setSimilarLoadingId(null);
    }
  };

  const startSimilarRecordsSearch = async () => {
    if (patientsLoading || !selected.id || similarLoadingId) return;

    const latestAssistant = [...messages]
      .reverse()
      .find(
        (message) =>
          message.role === "assistant" &&
          message.patientId === selected.id &&
          message.question,
      );
    const queryText =
      latestAssistant?.question ??
      `documented medical records for ${selected.name}`;
    const similarMessage: ChatMessage = {
      id: `similar-${Date.now()}`,
      role: "assistant",
      content: "",
      patientName: selected.name,
      patientId: selected.id,
      question: queryText,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "sent",
    };

    setMessages((previous) => [...previous, similarMessage]);
    await findSimilarRecords(similarMessage);
  };

  useEffect(() => {
    const url = new URL(window.location.href);
    if (!pendingSimilarSearchRef.current && url.searchParams.get("similar") !== "1") return;
    if (patientsLoading || !selected.id) {
      pendingSimilarSearchRef.current = true;
      return;
    }

    pendingSimilarSearchRef.current = false;
    url.searchParams.delete("similar");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    void startSimilarRecordsSearch();
  }, [patientsLoading, selected.id, startSimilarRecordsSearch]);

  useEffect(() => {
    const handleFindSimilarRecords = () => {
      if (patientsLoading || !selected.id) {
        pendingSimilarSearchRef.current = true;
        return;
      }
      void startSimilarRecordsSearch();
    };

    window.addEventListener("lumen-find-similar-records", handleFindSimilarRecords);
    return () => {
      window.removeEventListener("lumen-find-similar-records", handleFindSimilarRecords);
    };
  }, [patientsLoading, selected.id, startSimilarRecordsSearch]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />

      <div className="ml-[250px] min-h-screen">
        <Header />

        <main className="px-8 py-7">
          <div className="mx-auto max-w-5xl">
            {/* Page heading */}
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <div className="relative mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-lumen-green-light">
                  <Sparkles size={17} className="text-lumen-green" />
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
                  <p className="mt-0.5 text-xs text-lumen-muted">
                    Search, organize and summarize documented patient records.
                  </p>
                </div>
              </div>

              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={clearChat}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-lumen-border bg-card px-3 py-1.5 text-xs font-medium text-lumen-muted transition-colors hover:bg-card-hover hover:text-foreground"
                >
                  <RotateCcw size={13} />
                  New consultation
                </button>
              )}
            </div>

            {/* Patient selector */}
            <div className="mb-4">
              <label className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.15em] text-lumen-muted">
                Active patient context
              </label>

              <div className="relative">
                <div className="absolute left-4 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-card-hover">
                  <UserRound size={14} className="text-lumen-muted" />
                </div>

                <select
                  value={selectedPatient}
                  onChange={(e) => {
                    setSelectedPatient(e.target.value);
                    setMessages([]);
                    setInputText("");
                    setBackendError("");
                  }}
                  disabled={!hasHydrated || patientsLoading || patients.length === 0 || isRecording || isTranscribing || isSearching}
                  className="w-full appearance-none rounded-xl border border-lumen-border bg-card py-3.5 pl-14 pr-10 text-sm font-medium text-foreground outline-none transition focus:border-lumen-green"
                >
                  {patientsLoading ? (
                    <option value="">Loading local patients…</option>
                  ) : null}
                  {!patientsLoading && patients.length === 0 ? (
                    <option value="">No patients in local database</option>
                  ) : null}
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name} · {patient.id} ·{" "}
                      {patient.age
                        ? `${patient.age} years`
                        : "Age not recorded"}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lumen-muted"
                />
              </div>
            </div>

            {/* Assistant workspace */}
            <section className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-lumen-border bg-card shadow-sm">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-lumen-border px-5 py-3.5">
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Patient record assistant
                  </p>
                  <p className="mt-0.5 text-[10px] text-lumen-muted">
                    {isSearching
                      ? `Searching documented records for ${selected.name}...`
                      : messages.length > 0
                        ? `Consulting records for ${selected.name} (${messages.length} messages)`
                        : `Grounded in documented records for ${selected.name}`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-lumen-border bg-card-hover px-2.5 py-1 text-[9px] font-medium text-lumen-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-lumen-green" />
                    LOCAL MODEL
                  </span>
                </div>
              </div>

              {/* Chat messages feed */}
              <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
                {backendError && (
                  <div
                    role="alert"
                    className="mx-auto max-w-3xl rounded-xl border border-rose-300/30 bg-rose-50 p-3.5 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
                  >
                    {backendError}
                  </div>
                )}

                {messages.length === 0 && !isSearching && (
                  <EmptyState
                    patient={selected}
                    onQuestion={(q) => handleSendMessage(q)}
                  />
                )}

                {messages.map((msg) => (
                  <div key={msg.id} className="mx-auto max-w-3xl">
                    {msg.role === "user" ? (
                      /* Doctor message bubble */
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-medium text-lumen-muted">
                            Dr. Arun
                          </span>
                          <span className="text-[9px] text-lumen-green">
                            For {msg.patientName ?? selected.name}
                          </span>
                          <span className="text-[9px] text-lumen-muted/70">
                            {msg.timestamp}
                          </span>
                        </div>
                        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-lumen-navy px-4 py-3 text-xs leading-5 text-white dark:text-[#0B1110] shadow-sm">
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      /* Assistant response */
                      <div className="flex flex-col items-start">
                        <div className="w-full rounded-2xl border border-lumen-border bg-card-hover p-5 shadow-xs">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-lumen-green-light">
                                <Sparkles
                                  size={14}
                                  className="text-lumen-green"
                                />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-semibold text-foreground">
                                    Lumen
                                  </p>
                                  <span className="rounded-full border border-lumen-border bg-card px-2 py-0.5 text-[8px] uppercase tracking-wide text-lumen-muted">
                                    {`Records: ${msg.patientName ?? selected.name}`}
                                  </span>
                                </div>
                                <span className="text-[9px] text-lumen-muted/70">
                                  {msg.timestamp}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => copyToClipboard(msg.content, msg.id)}
                              aria-label="Copy response"
                              className="flex h-7 w-7 items-center justify-center rounded-md border border-lumen-border bg-card text-lumen-muted transition hover:bg-card-hover hover:text-foreground"
                              title="Copy answer"
                            >
                              {copiedId === msg.id ? (
                                <Check size={12} className="text-emerald-500" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>

                          <div className="mt-3.5 pl-9">
                            <p className="whitespace-pre-wrap text-xs leading-6 text-foreground">
                              {msg.content}
                            </p>

                            {/* Source citations */}
                            {msg.sources && msg.sources.length > 0 && (
                              <div className="mt-5 border-t border-lumen-border/60 pt-4">
                                <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-lumen-muted">
                                  Documented records cited ({msg.sources.length})
                                </p>
                                <div className="space-y-2">
                                  {msg.sources.map((source, index) => {
                                    const date =
                                      source.match(/Date:\s*([^|\n]+)/)?.[1]?.trim() ??
                                      "Date not recorded";
                                    const test = source
                                      .match(/Test:\s*([^|\n]+)/)?.[1]
                                      ?.trim();
                                    const detail =
                                      source
                                        .split("\n")
                                        .slice(1)
                                        .join(" ")
                                        .replace(/^Note:\s*/, "") || source;

                                    return (
                                      <SourceCard
                                        key={`${index}-${source.slice(0, 20)}`}
                                        icon={test ? "lab" : "note"}
                                        title={
                                          test ?? `Clinical record note #${index + 1}`
                                        }
                                        date={date}
                                        detail={detail}
                                      />
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {msg.role === "assistant" && msg.status !== "error" && (
                              <div className="mt-5 border-t border-lumen-border/60 pt-4">
                                {similarRecords[msg.id] === undefined ? (
                                  <div className="flex flex-col gap-3 rounded-xl border border-lumen-border bg-card px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                      <p className="text-[10px] font-semibold text-foreground">
                                        Similar documented records
                                      </p>
                                      <p className="mt-1 text-[9px] leading-relaxed text-lumen-muted">
                                        Search other patients’ notes for records related to this question.
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => void findSimilarRecords(msg)}
                                      disabled={similarLoadingId !== null}
                                      className="shrink-0 rounded-lg border border-lumen-border bg-card px-3 py-2 text-[9px] font-semibold text-lumen-green transition hover:border-lumen-green/50 hover:bg-card-hover disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {similarLoadingId === msg.id
                                        ? "Searching…"
                                        : "Find similar records"}
                                    </button>
                                  </div>
                                ) : (
                                  <SimilarRecordsPanel records={similarRecords[msg.id]} />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Live searching indicator inside thread */}
                {isSearching && (
                  <div className="mx-auto max-w-3xl">
                    <div className="rounded-2xl border border-lumen-border bg-card-hover/80 p-5 animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-lumen-green-light">
                          <Sparkles size={14} className="text-lumen-green animate-spin" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-foreground">
                            Lumen is reviewing records...
                          </p>
                          <p className="text-[10px] text-lumen-muted">
                            Querying local vector database for {selected.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-lumen-green animate-bounce" />
                          <span className="h-1.5 w-1.5 rounded-full bg-lumen-green animate-bounce [animation-delay:0.2s]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-lumen-green animate-bounce [animation-delay:0.4s]" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input dialogue box */}
              <div className="border-t border-lumen-border bg-card px-5 py-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2 rounded-xl border border-lumen-border bg-input p-1.5 focus-within:border-lumen-green"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Ask about ${selected.name}'s records (e.g. lab results, consultations)...`}
                    disabled={!hasHydrated || isSearching || isRecording || isTranscribing || !selected.id}
                    className="min-w-0 flex-1 bg-transparent px-3 py-2 text-xs text-foreground outline-none placeholder:text-lumen-muted disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={() => (isRecording ? stopVoiceRecording() : void startVoiceRecording())}
                    disabled={!hasHydrated || !selected.id || isTranscribing || isSearching}
                    aria-label={isRecording ? "Stop voice recording" : "Record a voice question"}
                    aria-pressed={isRecording}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-40 ${isRecording ? "bg-rose-100 text-rose-600 hover:bg-rose-200 dark:bg-rose-950/40 dark:text-rose-300" : "text-lumen-muted hover:bg-card-hover hover:text-foreground"}`}
                    title={isRecording ? "Stop recording and send question" : isTranscribing ? "Transcribing locally…" : "Record a voice question"}
                  >
                    {isRecording ? <Square size={14} fill="currentColor" /> : isTranscribing ? <LoaderCircle size={15} className="animate-spin" /> : <Mic size={15} />}
                  </button>

                  <button
                    type="submit"
                    disabled={!inputText.trim() || isSearching || isRecording || isTranscribing || !selected.id}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-lumen-navy text-white transition hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 dark:text-[#0B1110]"
                    aria-label="Send prompt"
                    title="Send prompt"
                  >
                    <ArrowUp size={16} />
                  </button>
                </form>

                <div className="mt-2 flex items-center justify-between px-1">
                  <p className="text-[9px] text-lumen-muted">
                    {isRecording
                      ? "Recording… Click the mic again to stop."
                      : isTranscribing
                        ? "Transcribing locally; Lumen will send the question automatically."
                        : "Lumen runs locally within your hospital network. All queries remain strictly private."}
                  </p>

                  <Link
                    href={`/patients/${selected.id}`}
                    className="text-[9px] font-medium text-lumen-green transition hover:underline"
                  >
                    View patient chart
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
    "Summarize the recent consultation notes",
  ];

  return (
    <div className="flex h-full min-h-[380px] flex-col items-center justify-center text-center px-4 py-8">
      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-lumen-green-light shadow-xs">
        <Sparkles size={22} className="text-lumen-green" />
        <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-lumen-green" />
      </div>

      <h2 className="mt-5 text-base font-semibold text-foreground">
        Ask your patient&apos;s memory.
      </h2>

      <p className="mt-2 max-w-md text-xs leading-5 text-lumen-muted">
        Ask questions about documented laboratory results, vitals, and consultation notes in{" "}
        <span className="font-semibold text-foreground">{patient.name}&apos;s</span> records.
      </p>

      <div className="mt-7 grid w-full max-w-[560px] grid-cols-1 gap-2.5 sm:grid-cols-2">
        {questions.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onQuestion(item)}
            className="group flex items-center justify-between rounded-xl border border-lumen-border bg-card px-4 py-3 text-left text-[11px] text-foreground transition-all hover:border-lumen-green/50 hover:bg-card-hover"
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
    <div className="flex items-start gap-3 rounded-xl border border-lumen-border bg-card px-3.5 py-2.5 transition-colors">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-card-hover">
        {icon === "lab" ? (
          <FlaskConical size={13} className="text-lumen-muted" />
        ) : (
          <FileText size={13} className="text-lumen-muted" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold text-foreground">{title}</p>
          <span className="shrink-0 font-mono text-[9px] text-lumen-muted">{date}</span>
        </div>
        <p className="mt-0.5 text-[10px] leading-relaxed text-lumen-muted line-clamp-2">
          {detail}
        </p>
      </div>
    </div>
  );
}

function SimilarRecordsPanel({ records }: { records: SimilarRecord[] }) {
  return (
    <div className="rounded-xl border border-lumen-border bg-card px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground">
            Similar documented records
          </p>
          <p className="mt-1 text-[9px] text-lumen-muted">
            Reference notes from other patients. Verify details against the active patient’s chart.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-lumen-border bg-card-hover px-2 py-1 text-[8px] font-medium text-lumen-muted">
          {records.length} found
        </span>
      </div>

      {records.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-lumen-border px-3 py-4 text-center text-[10px] text-lumen-muted">
          No similar documented records were found.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {records.map((record) => (
            <article
              key={record.noteId}
              className="rounded-xl border border-lumen-border bg-card-hover px-3.5 py-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="text-[11px] font-semibold text-foreground">
                  {record.patientName}
                  {record.patientAge != null ? ` · ${record.patientAge} years` : ""}
                </p>
                <span className="font-mono text-[9px] text-lumen-muted">{record.date}</span>
              </div>
              {(record.testName || record.value != null) && (
                <p className="mt-1 text-[9px] font-medium text-lumen-green">
                  {[record.testName, record.value != null ? `Value: ${record.value}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
              <p className="mt-2 whitespace-pre-wrap text-[10px] leading-relaxed text-lumen-muted">
                {record.text}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
