"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";

const flaggedResults = [
  {
    id: "P001",
    name: "Rajesh Kumar",
    type: "Hemoglobin",
    value: "8.2 g/dL",
    date: "28 Sep 2026",
  },
  {
    id: "P004",
    name: "Priya Menon",
    type: "Blood Pressure",
    value: "165/102 mmHg",
    date: "27 Sep 2026",
  },
  {
    id: "P005",
    name: "Arjun Nair",
    type: "Glucose",
    value: "248 mg/dL",
    date: "26 Sep 2026",
  },
];

export default function FlaggedResults() {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Flagged Results
          </h3>

          <p className="mt-1 text-[11px] text-slate-400">
            Records requiring clinical review
          </p>
        </div>

        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
          <AlertTriangle
            size={16}
            className="text-amber-500"
            strokeWidth={1.8}
          />
        </div>
      </div>

      {/* Results */}
      <div>
        {flaggedResults.map((result, index) => (
          <Link
            key={result.id}
            href={`/patients/${result.id}`}
            className={`group flex items-center justify-between px-5 py-4 transition hover:bg-slate-50 ${
              index !== flaggedResults.length - 1
                ? "border-b border-slate-100"
                : ""
            }`}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">
                {result.name}
              </p>

              <p className="mt-1 text-[11px] text-slate-400">
                {result.type}
                <span className="mx-1.5 text-slate-300">•</span>
                {result.date}
              </p>
            </div>

            <div className="ml-4 flex items-center gap-3">
              <span className="whitespace-nowrap text-xs font-semibold text-amber-600">
                {result.value}
              </span>

              <ArrowRight
                size={16}
                className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500"
                strokeWidth={1.8}
              />
            </div>
          </Link>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3">
        <Link
          href="/patients"
          className="text-xs font-medium text-emerald-600 transition hover:text-emerald-700"
        >
          View all flagged records →
        </Link>
      </div>
    </section>
  );
}