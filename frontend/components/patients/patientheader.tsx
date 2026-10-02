import {
  ArrowLeft,
  Bot,
  FileText,
  Plus,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

interface PatientHeaderProps {
  id: string;
  name: string;
  age: number;
  onAskLumen: () => void;
}

export default function PatientHeader({
  id,
  name,
  age,
  onAskLumen,
}: PatientHeaderProps) {
  return (
    <div className="mb-6">
      <Link
        href="/patients"
        className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-white"
      >
        <ArrowLeft size={16} />
        Back to patients
      </Link>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-start justify-between">

          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800">
              <span className="text-lg font-semibold text-slate-300">
                {name
                  .split(" ")
                  .map((word) => word[0])
                  .join("")}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-white">
                  {name}
                </h1>

                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-xs text-emerald-400">
                  Local Record
                </span>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                {id} · {age} years old
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white">
              <Plus size={17} />
              Add Note
            </button>

            <button className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white">
              <FileText size={17} />
              Summarize
            </button>

            <button
              onClick={onAskLumen}
              className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400"
            >
              <Bot size={17} />
              Ask Lumen
            </button>
          </div>

        </div>

        <div className="mt-5 flex items-center gap-2 border-t border-slate-800 pt-4 text-xs text-slate-500">
          <ShieldCheck
            size={15}
            className="text-emerald-400"
          />

          Patient data is stored and processed locally.
        </div>
      </div>
    </div>
  );
}