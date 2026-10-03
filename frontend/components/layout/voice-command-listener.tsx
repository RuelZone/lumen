"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

type VoiceCommand = {
  type: string;
  value?: string;
  route?: string | null;
  patientName?: string;
  error?: string;
};

type VoiceCommandResponse = { pending?: boolean; command?: VoiceCommand };

const ALLOWED_ROUTES = new Set(["/dashboard", "/patients", "/voice", "/ai"]);

export default function VoiceCommandListener() {
  const router = useRouter();
  const pathname = usePathname();

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
          const command = data.pending ? data.command : undefined;
          if (command?.error) {
            console.warn("[Lumen voice command]", command.error);
          } else if (command?.type === "navigate" && command.route && ALLOWED_ROUTES.has(command.route)) {
            router.push(command.route);
          } else if (command?.type === "open_patient" && command.value) {
            router.push(`/patients/${encodeURIComponent(command.value)}`);
          } else if (command?.type === "query" && command.value) {
            const question = command.value;
            if (pathname === "/ai") {
              window.dispatchEvent(new CustomEvent("lumen-prefill-question", {
                detail: { question, autoSubmit: true },
              }));
            } else {
              router.push(`/ai?q=${encodeURIComponent(question)}&send=1`);
            }
          }
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
  }, [pathname, router]);

  return null;
}
