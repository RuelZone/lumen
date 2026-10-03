"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

type VoiceCommand = {
  type: string;
  value?: string;
  route?: string | null;
  patientName?: string;
  error?: string;
};

type VoiceActivity = {
  recording: boolean;
  processing: boolean;
  transcript: string;
  transcriptAt: number;
  updatedAt?: number;
};

type VoiceCommandResponse = {
  pending?: boolean;
  command?: VoiceCommand;
  voiceActivity?: VoiceActivity;
};

const ALLOWED_ROUTES = new Set(["/dashboard", "/patients", "/voice", "/ai"]);

export default function VoiceCommandListener() {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const lastActivityRef = useRef("");

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let stopped = false;
    let timer = 0;
    let controller: AbortController | undefined;

    const poll = async () => {
      if (stopped) return;
      controller = new AbortController();
      try {
        const response = await fetch("/api/voice-command", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.ok) {
          const data = (await response.json()) as VoiceCommandResponse;
          if (data.voiceActivity) {
            const activity = data.voiceActivity;
            const signature = JSON.stringify(activity);
            if (signature !== lastActivityRef.current) {
              lastActivityRef.current = signature;
              window.dispatchEvent(new CustomEvent("lumen-voice-activity", { detail: activity }));
            }
          }
          const command = data.pending ? data.command : undefined;
          if (command?.error) {
            console.warn("[Lumen voice command]", command.error);
          } else if (command?.type === "start_consultation") {
            if (pathnameRef.current === "/voice") {
              window.dispatchEvent(new CustomEvent("lumen-start-consultation"));
            } else {
              router.push("/voice?startConsultation=1");
            }
          } else if (command?.type === "similar_records") {
            if (pathnameRef.current === "/ai") {
              window.dispatchEvent(new CustomEvent("lumen-find-similar-records"));
            } else {
              router.push("/ai?similar=1");
            }
          } else if (command?.type === "navigate" && command.route && ALLOWED_ROUTES.has(command.route)) {
            router.push(command.route);
          } else if (command?.type === "open_patient" && command.value) {
            router.push(`/patients/${encodeURIComponent(command.value)}`);
          } else if (command?.type === "query" && command.value) {
            const question = command.value;
            if (pathnameRef.current === "/ai") {
              window.dispatchEvent(new CustomEvent("lumen-prefill-question", {
                detail: { question, autoSubmit: true },
              }));
            } else {
              router.push(`/ai?q=${encodeURIComponent(question)}&send=1`);
            }
          }
        } else {
          const inactive: VoiceActivity = {
            recording: false,
            processing: false,
            transcript: "",
            transcriptAt: 0,
          };
          lastActivityRef.current = JSON.stringify(inactive);
          window.dispatchEvent(new CustomEvent("lumen-voice-activity", { detail: inactive }));
        }
      } catch {
        // The backend may be stopped; retry silently on the next interval.
      } finally {
        if (!stopped) timer = window.setTimeout(poll, 500);
      }
    };

    void poll();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      controller?.abort();
    };
  }, [router]);

  return null;
}
