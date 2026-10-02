"use client";

import Link from "next/link";
import { ArrowRight, UserRound } from "lucide-react";

const recentPatients = [
  {
    id: "P001",
    name: "Rajesh Kumar",
    age: 45,
    date: "28 Sep 2026",
  },
  {
    id: "P002",
    name: "Anjali Nair",
    age: 32,
    date: "27 Sep 2026",
  },
  {
    id: "P003",
    name: "Arjun Menon",
    age: 51,
    date: "26 Sep 2026",
  },
];

export default function RecentPatients() {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
      {/* Header */}
      <div className="border-b border-slate-100 px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Recent Patients
        </h3>

        <p className="mt-1 text-[11px] text-slate-400">
          Recently accessed patient records
        </p>
      </div>

      {/* Patients */}
      <div>
        {recentPatients.map((patient, index) => (
          <Link
            key={patient.id}
            href={`/patients/${patient.id}`}
            className={`group flex items-center justify-between px-5 py-4 transition hover:bg-slate-50 ${
              index !== recentPatients.length - 1
                ? "border-b border-slate-100"
                : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <UserRound size={16} strokeWidth={1.7} />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {patient.name}
                </p>

                <p className="mt-0.5 text-[11px] text-slate-400">
                  {patient.id}
                  <span className="mx-1.5 text-slate-300">•</span>
                  Age {patient.age}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-400">
                {patient.date}
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
          Browse all patients →
        </Link>
      </div>
    </section>
  );
}