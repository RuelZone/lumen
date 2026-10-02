"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  Search,
  SlidersHorizontal,
  Users,
} from "lucide-react";

import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import PatientCard from "@/components/patients/patientcard";

type Patient = {
  id: string;
  name: string;
  age: number;
  lastUpdated: string;
  records: number;
};

const patients: Patient[] = [
  {
    id: "P001",
    name: "Rajesh Kumar",
    age: 45,
    lastUpdated: "28 Sep 2026",
    records: 6,
  },
  {
    id: "P002",
    name: "Anjali Nair",
    age: 32,
    lastUpdated: "27 Sep 2026",
    records: 4,
  },
  {
    id: "P003",
    name: "Arjun Menon",
    age: 51,
    lastUpdated: "26 Sep 2026",
    records: 8,
  },
  {
    id: "P004",
    name: "Priya Menon",
    age: 39,
    lastUpdated: "24 Sep 2026",
    records: 5,
  },
  {
    id: "P005",
    name: "Vivek Nair",
    age: 48,
    lastUpdated: "22 Sep 2026",
    records: 7,
  },
];

export default function PatientsPage() {
  const [search, setSearch] = useState("");

  const filteredPatients = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) return patients;

    return patients.filter(
      (patient) =>
        patient.name.toLowerCase().includes(query) ||
        patient.id.toLowerCase().includes(query)
    );
  }, [search]);

  return (
    <div className="min-h-screen bg-[#F8FAF9] dark:bg-[#0B1110]">
      <Sidebar />

      <div className="ml-[250px] min-h-screen">
        <Header />

        <main className="px-8 py-7">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="flex items-center gap-2">
                <Users
                  size={19}
                  className="text-[#4F806C] dark:text-[#7FA894]"
                />

                <h1 className="text-xl font-bold text-[#172033] dark:text-[#EEF2EF]">
                  My Patients
                </h1>
              </div>

              <p className="mt-1 text-sm text-[#667085] dark:text-[#929C97]">
                Your private collection of patient records.
              </p>
            </div>

            <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#172033] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#253149] dark:bg-[#EEF2EF] dark:text-[#0B1110] dark:hover:bg-white">
              <Plus size={16} />
              Add Patient
            </button>
          </div>

          {/* Search */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search
                size={17}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#98A2B3] dark:text-[#71817A]"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search patients by name or ID..."
                className="h-11 w-full rounded-xl border border-[#E3E7E5] bg-white pl-11 pr-4 text-sm text-[#172033] outline-none placeholder:text-[#98A2B3] focus:border-[#BFCBC5] dark:border-[#29322F] dark:bg-[#121817] dark:text-[#EEF2EF] dark:placeholder:text-[#71817A] dark:focus:border-[#46534D]"
              />
            </div>

            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#E3E7E5] bg-white px-4 text-sm font-medium text-[#667085] hover:bg-[#F7F9F8] dark:border-[#29322F] dark:bg-[#121817] dark:text-[#929C97] dark:hover:bg-[#171F1D]">
              <SlidersHorizontal size={16} />
              Filters
            </button>
          </div>

          {/* Patient count */}
          <div className="mt-6 flex items-center justify-between">
            <p className="text-xs text-[#667085] dark:text-[#929C97]">
              Showing{" "}
              <span className="font-semibold text-[#172033] dark:text-[#EEF2EF]">
                {filteredPatients.length}
              </span>{" "}
              patients
            </p>
          </div>

          {/* Grid */}
          {filteredPatients.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredPatients.map((patient) => (
                <PatientCard
                  key={patient.id}
                  patient={patient}
                />
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-[#D9DFDC] bg-white py-16 text-center dark:border-[#35413D] dark:bg-[#121817]">
              <Users
                size={25}
                className="mx-auto text-[#98A2B3] dark:text-[#71817A]"
              />

              <h3 className="mt-3 text-sm font-semibold text-[#172033] dark:text-[#EEF2EF]">
                No patients found
              </h3>

              <p className="mt-1 text-xs text-[#667085] dark:text-[#929C97]">
                Try a different name or patient ID.
              </p>
            </div>
          )}

          {/* Privacy note */}
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-[#E3E7E5] bg-white px-4 py-3 dark:border-[#29322F] dark:bg-[#121817]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4F806C] dark:bg-[#7FA894]" />

            <p className="text-xs text-[#667085] dark:text-[#929C97]">
              Patient records stay inside your local Lumen workspace.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}