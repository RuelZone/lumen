"use client";

import { Search } from "lucide-react";
import PatientCard from "./patientcard";

const patients = [
  {
    id: "P001",
    name: "Rajesh Kumar",
    age: 45,
    lastVisit: "28 Sep 2026",
  },
  {
    id: "P002",
    name: "Anjali Nair",
    age: 32,
    lastVisit: "27 Sep 2026",
  },
  {
    id: "P003",
    name: "Arjun Menon",
    age: 51,
    lastVisit: "26 Sep 2026",
  },
];

export default function PatientList() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">

      {/* Search */}
      <div className="border-b border-slate-800 p-4">
        <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
          <Search
            size={18}
            className="text-slate-500"
          />

          <input
            type="text"
            placeholder="Search patients..."
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* Patient list */}
      <div>
        {patients.map((patient) => (
          <PatientCard
            key={patient.id}
            {...patient}
          />
        ))}
      </div>

    </div>
  );
}