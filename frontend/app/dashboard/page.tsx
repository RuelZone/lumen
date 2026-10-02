"use client";

import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  FileText,
  Mic,
  Users,
  Wifi,
} from "lucide-react";

import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { PixelBulb } from "@/components/ui/pixel-bulb";
import CountUp from "@/components/ui/count-up";

const patients = [
  {
    id: "P001",
    name: "Rajesh Kumar",
    age: 45,
    records: 6,
    updated: "28 Sep 2026",
    initials: "RK",
  },
  {
    id: "P002",
    name: "Anjali Nair",
    age: 32,
    records: 4,
    updated: "27 Sep 2026",
    initials: "AN",
  },
  {
    id: "P003",
    name: "Arjun Menon",
    age: 51,
    records: 8,
    updated: "26 Sep 2026",
    initials: "AM",
  },
];

const recentRecords = [
  {
    patient: "Rajesh Kumar",
    patientId: "P001",
    type: "Lab Result",
    title: "Hemoglobin",
    detail: "8.2 g/dL",
    date: "28 Sep 2026",
  },
  {
    patient: "Rajesh Kumar",
    patientId: "P001",
    type: "Clinical Note",
    title: "Recent consultation",
    detail: "Fatigue reported for approximately 3 days",
    date: "28 Sep 2026",
  },
  {
    patient: "Anjali Nair",
    patientId: "P002",
    type: "Clinical Note",
    title: "Follow-up consultation",
    detail: "Patient observations documented",
    date: "27 Sep 2026",
  },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#F8FAF9] dark:bg-[#0B1110]">
      <Sidebar />

      <div className="ml-[250px] min-h-screen">
        <Header />

        <main className="px-8 py-7">
          {/* Welcome */}
          <section className="rounded-3xl border border-[#E1E7E3] bg-white p-7 dark:border-[#29322F] dark:bg-[#121817]">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#E1E7E3] bg-[#F7F9F8] px-3 py-1.5 dark:border-[#303B37] dark:bg-[#151C1A]">
                  <PixelBulb size="xs" glow />

                  <span className="text-[10px] font-semibold tracking-wide text-[#66756E] dark:text-[#929C97]">
                    LUMEN PRIVATE AI MEMORY
                  </span>
                </div>

                <h1 className="text-3xl font-bold tracking-tight text-[#172033] dark:text-[#EEF2EF]">
                  Good morning, Dr. Arun.
                </h1>

                <p className="mt-2 max-w-xl text-sm leading-6 text-[#667085] dark:text-[#929C97]">
                  Everything you&apos;ve documented about your patients,
                  organized and searchable in one private workspace.
                </p>
              </div>

            </div>
          </section>

          {/* Stats */}
          <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              {
                icon: Users,
                value: 24,
                label: "Patients",
                meta: "My workspace",
              },
              {
                icon: FileText,
                value: 186,
                label: "Documented records",
                meta: "+12 recently",
              },
              {
                icon: Mic,
                value: 6,
                label: "Voice notes",
                meta: "Local",
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[#E3E7E5] bg-white p-5 dark:border-[#29322F] dark:bg-[#121817]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0F3F1] text-[#66756E] dark:bg-[#1A2521] dark:text-[#929C97]">
                      <Icon size={18} />
                    </div>

                    <span className="text-[10px] text-[#98A2B3] dark:text-[#71817A]">
                      {item.meta}
                    </span>
                  </div>

                  <p className="mt-5 text-3xl font-bold text-[#172033] dark:text-[#EEF2EF]">
                    <CountUp value={item.value} />
                  </p>

                  <p className="mt-1 text-sm text-[#667085] dark:text-[#929C97]">
                    {item.label}
                  </p>
                </div>
              );
            })}
          </section>

          {/* Main */}
          <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
            {/* Patients */}
            <div className="rounded-2xl border border-[#E3E7E5] bg-white dark:border-[#29322F] dark:bg-[#121817]">
              <div className="flex items-center justify-between border-b border-[#EEF0F0] px-6 py-5 dark:border-[#29322F]">
                <div>
                  <h2 className="text-base font-bold text-[#172033] dark:text-[#EEF2EF]">
                    Recent Patients
                  </h2>

                  <p className="mt-1 text-xs text-[#667085] dark:text-[#929C97]">
                    Recently updated patient records
                  </p>
                </div>

                <Link
                  href="/patients"
                  className="text-xs font-semibold text-[#4F806C] hover:underline dark:text-[#7FA894]"
                >
                  View all
                </Link>
              </div>

              <div className="divide-y divide-[#EEF0F0] dark:divide-[#29322F]">
                {patients.map((patient) => (
                  <Link
                    key={patient.id}
                    href={`/patients/${patient.id}`}
                    className="group flex items-center justify-between px-6 py-4 hover:bg-[#F8FAF9] dark:hover:bg-[#171F1D]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F0F3F1] text-xs font-bold text-[#4F806C] dark:bg-[#1A2521] dark:text-[#7FA894]">
                        {patient.initials}
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-[#172033] dark:text-[#EEF2EF]">
                          {patient.name}
                        </p>

                        <div className="mt-1 flex items-center gap-2 text-xs text-[#667085] dark:text-[#929C97]">
                          <span>{patient.id}</span>
                          <span>·</span>
                          <span>{patient.age} years</span>
                          <span>·</span>
                          <span>{patient.records} records</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="hidden text-xs text-[#98A2B3] sm:block dark:text-[#71817A]">
                        {patient.updated}
                      </span>

                      <ChevronRight
                        size={16}
                        className="text-[#98A2B3] group-hover:text-[#4F806C] dark:text-[#71817A] dark:group-hover:text-[#7FA894]"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Memory */}
            <div className="rounded-2xl border border-[#E1E7E3] bg-white p-6 dark:border-[#29322F] dark:bg-[#121817]">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 dark:bg-amber-500/15">
                  <PixelBulb size="sm" glow />
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-bold text-[#172033] dark:text-[#EEF2EF]">
                      Lumen Memory
                    </h2>
                  </div>

                  <p className="mt-1 text-xs text-[#667085] dark:text-[#929C97]">
                    Your records, always searchable.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2">
                {[
                  { value: 186, label: "Records" },
                  { value: 24, label: "Patients" },
                  { value: 12, label: "Lab results" },
                  { value: 6, label: "Voice notes" },
                ].map(({ value, label }) => (
                  <div
                    key={label}
                    className="rounded-xl bg-[#F7F9F8] p-3 dark:bg-[#171F1D]"
                  >
                    <p className="text-lg font-bold text-[#172033] dark:text-[#EEF2EF]">
                      <CountUp value={value} />
                    </p>

                    <p className="mt-0.5 text-[10px] text-[#667085] dark:text-[#929C97]">
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-[#E3E7E5] bg-[#FAFBFA] p-4 dark:border-[#303B37] dark:bg-[#151C1A]">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#4F806C] dark:bg-[#7FA894]" />

                  <span className="text-xs font-semibold text-[#66756E] dark:text-[#929C97]">
                    Local AI ready
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2 text-[11px] text-[#667085] dark:text-[#929C97]">
                  <Wifi size={12} />
                  No internet connection required
                </div>
              </div>

            </div>
          </section>

          {/* Recent records */}
          <section className="mt-6 rounded-2xl border border-[#E3E7E5] bg-white dark:border-[#29322F] dark:bg-[#121817]">
            <div className="flex items-center justify-between border-b border-[#EEF0F0] px-6 py-5 dark:border-[#29322F]">
              <div>
                <h2 className="text-base font-bold text-[#172033] dark:text-[#EEF2EF]">
                  Recently Documented
                </h2>

                <p className="mt-1 text-xs text-[#667085] dark:text-[#929C97]">
                  Latest information added to your workspace
                </p>
              </div>

              <Link
                href="/patients"
                className="text-xs font-semibold text-[#4F806C] hover:underline dark:text-[#7FA894]"
              >
                Browse records
              </Link>
            </div>

            <div className="grid grid-cols-1 divide-y divide-[#EEF0F0] md:grid-cols-3 md:divide-x md:divide-y-0 dark:divide-[#29322F]">
              {recentRecords.map((record) => (
                <Link
                  key={`${record.patientId}-${record.date}-${record.title}`}
                  href={`/patients/${record.patientId}`}
                  className="group p-5 hover:bg-[#F8FAF9] dark:hover:bg-[#171F1D]"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-[#F0F3F1] px-2.5 py-1 text-[10px] font-semibold text-[#66756E] dark:bg-[#1A2521] dark:text-[#929C97]">
                      {record.type}
                    </span>

                    <span className="text-[10px] text-[#98A2B3] dark:text-[#71817A]">
                      {record.date}
                    </span>
                  </div>

                  <h3 className="mt-4 text-sm font-semibold text-[#172033] dark:text-[#EEF2EF]">
                    {record.title}
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-[#667085] dark:text-[#929C97]">
                    {record.detail}
                  </p>

                  <div className="mt-4 flex items-center gap-1 text-[11px] font-medium text-[#4F806C] dark:text-[#7FA894]">
                    {record.patient}
                    <ArrowRight size={12} />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
