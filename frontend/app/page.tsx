"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Database,
  Lock,
  Server,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { LoadingAnimationSvg } from "@/components/ui/loading-animation-svg";
import { PixelBulb } from "@/components/ui/pixel-bulb";

export default function Home() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [statusStage, setStatusStage] = useState(0);

  const statusMessages = [
    "Connecting to private hospital network",
    "Initializing local vector memory",
    "Verifying doctor cryptographic session",
    "Workspace ready",
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        const next = prev + 4;
        if (next > 75) setStatusStage(3);
        else if (next > 45) setStatusStage(2);
        else if (next > 20) setStatusStage(1);
        return next;
      });
    }, 45);

    return () => clearInterval(timer);
  }, []);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#F8FAF9] px-6 py-12 dark:bg-[#0B1110]">
      {/* Background radial gradient */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[120px] dark:bg-emerald-500/15" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-amber-500/10 blur-[140px] dark:bg-amber-500/15" />

      {/* Main card */}
      <div className="relative z-10 flex w-full max-w-md flex-col items-center rounded-3xl border border-[#E1E7E3] bg-white/90 p-8 text-center shadow-[0_12px_45px_rgba(0,0,0,0.06)] backdrop-blur-md dark:border-[#24302C] dark:bg-[#121917]/95 dark:shadow-[0_16px_50px_rgba(0,0,0,0.35)]">
        {/* Top badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#DCE4DF] bg-[#F2F6F4] px-3.5 py-1 text-[10px] font-semibold tracking-wider text-[#4F806C] uppercase dark:border-[#2D3B35] dark:bg-[#16221D] dark:text-[#7FA894]">
          <PixelBulb size="xs" glow />
          Lumen · Private Clinical Intelligence
        </div>

        {/* Pixel-art SVG Heartbeat animation from care_fe */}
        <div className="my-2 flex items-center justify-center">
          <LoadingAnimationSvg
            size="lg"
            text="Illuminating Lumen"
            showText={false}
          />
        </div>

        {/* Brand identity */}
        <div className="mt-6 flex items-center justify-center gap-2.5">
          <PixelBulb size="md" glow />
          <h1 className="text-2xl font-bold tracking-tight text-[#172033] dark:text-[#EEF2EF]">
            Lumen
          </h1>
        </div>
        <p className="mt-1 text-xs text-[#667085] dark:text-[#929C97]">
          Local intelligence. Private by design.
        </p>

        {/* Progress bar */}
        <div className="mt-7 w-full">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E8EDE9] dark:bg-[#1F2B26]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 transition-all duration-150 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] font-medium text-[#667085] dark:text-[#929C97]">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {statusMessages[statusStage]}
            </span>
            <span className="font-mono text-[10px]">{progress}%</span>
          </div>
        </div>

        {/* Action button */}
        <div className="mt-8 flex w-full flex-col gap-2.5">
          <button
            onClick={() => router.push("/dashboard")}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#172033] py-3 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#202d47] active:scale-[0.99] dark:bg-[#EEF2EF] dark:text-[#0B1110] dark:hover:bg-white"
          >
            <span>Enter Doctor Workspace</span>
            <ArrowRight
              size={14}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </button>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Link
              href="/ai"
              className="flex items-center justify-center gap-1.5 rounded-xl border border-[#E1E7E3] bg-[#F7F9F8] py-2.5 text-[11px] font-medium text-[#172033] transition-colors hover:bg-white dark:border-[#29342F] dark:bg-[#17211E] dark:text-[#EEF2EF] dark:hover:bg-[#1F2C28]"
            >
              <PixelBulb size="xs" glow />
              Ask Lumen AI
            </Link>

            <Link
              href="/patients"
              className="flex items-center justify-center gap-1.5 rounded-xl border border-[#E1E7E3] bg-[#F7F9F8] py-2.5 text-[11px] font-medium text-[#172033] transition-colors hover:bg-white dark:border-[#29342F] dark:bg-[#17211E] dark:text-[#EEF2EF] dark:hover:bg-[#1F2C28]"
            >
              <Users size={13} className="text-[#4F806C] dark:text-[#7FA894]" />
              My Patients
            </Link>
          </div>
        </div>

        {/* Telemetry pill row */}
        <div className="mt-8 flex items-center justify-center gap-4 border-t border-[#E8EDE9] pt-4 text-[10px] text-[#84928B] dark:border-[#232F2B] dark:text-[#74857D]">
          <div className="flex items-center gap-1">
            <ShieldCheck size={12} className="text-emerald-500" />
            <span>Air-gapped</span>
          </div>
          <span className="text-[#D0D9D4] dark:text-[#32413C]">•</span>
          <div className="flex items-center gap-1">
            <Database size={12} className="text-emerald-500" />
            <span>Local ChromaDB</span>
          </div>
          <span className="text-[#D0D9D4] dark:text-[#32413C]">•</span>
          <div className="flex items-center gap-1">
            <Server size={12} className="text-emerald-500" />
            <span>Port 8765</span>
          </div>
        </div>
      </div>
    </main>
  );
}