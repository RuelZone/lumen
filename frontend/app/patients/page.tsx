"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Plus, Search, SlidersHorizontal, Users } from "lucide-react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import PatientCard from "@/components/patients/patientcard";

type Patient = { id: string; name: string; age: number | null; lastUpdated: string | null; records: number };

export default function PatientsPage() {
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/patients", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not load patients.");
        return data as Patient[];
      })
      .then((data) => { if (!cancelled) setPatients(data); })
      .catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load patients."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filteredPatients = useMemo(() => {
    const query = search.toLowerCase().trim();
    return query ? patients.filter((patient) => patient.name.toLowerCase().includes(query) || patient.id.toLowerCase().includes(query)) : patients;
  }, [patients, search]);

  return <div className="min-h-screen bg-[#F8FAF9] dark:bg-[#0B1110]"><Sidebar /><div className="ml-[250px] min-h-screen"><Header /><main className="px-8 py-7">
    <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><div className="flex items-center gap-2"><Users size={19} className="text-[#4F806C] dark:text-[#7FA894]" /><h1 className="text-xl font-bold text-[#172033] dark:text-[#EEF2EF]">My Patients</h1></div><p className="mt-1 text-sm text-[#667085] dark:text-[#929C97]">Your private collection of patient records.</p></div><button className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#172033] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#253149] dark:bg-[#EEF2EF] dark:text-[#0B1110]"><Plus size={16} /> Add Patient</button></div>
    <div className="mt-6 flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#98A2B3] dark:text-[#71817A]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patients by name or ID..." className="h-11 w-full rounded-xl border border-[#E3E7E5] bg-white pl-11 pr-4 text-sm text-[#172033] outline-none dark:border-[#29322F] dark:bg-[#121817] dark:text-[#EEF2EF]" /></div><button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#E3E7E5] bg-white px-4 text-sm font-medium text-[#667085] dark:border-[#29322F] dark:bg-[#121817] dark:text-[#929C97]"><SlidersHorizontal size={16} /> Filters</button></div>
    <p className="mt-6 text-xs text-[#667085] dark:text-[#929C97]">Showing <span className="font-semibold text-[#172033] dark:text-[#EEF2EF]">{loading ? "…" : filteredPatients.length}</span> patients</p>
    {error && <div role="alert" className="mt-5 flex items-center gap-2 rounded-xl border border-rose-300/40 bg-rose-50 p-4 text-sm text-rose-700"><AlertCircle size={16} />{error}</div>}
    {loading ? <div className="mt-6 rounded-2xl border border-dashed border-[#D9DFDC] bg-white py-16 text-center text-sm text-[#667085]">Loading patients from the local records…</div> : filteredPatients.length ? <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredPatients.map((patient) => <PatientCard key={patient.id} patient={patient} />)}</div> : <div className="mt-6 rounded-2xl border border-dashed border-[#D9DFDC] bg-white py-16 text-center dark:border-[#35413D] dark:bg-[#121817]"><Users size={25} className="mx-auto text-[#98A2B3]" /><h3 className="mt-3 text-sm font-semibold">No patients found</h3><p className="mt-1 text-xs text-[#667085]">Try a different name or patient ID.</p></div>}
    <div className="mt-6 flex items-center gap-2 rounded-xl border border-[#E3E7E5] bg-white px-4 py-3 dark:border-[#29322F] dark:bg-[#121817]"><span className="h-1.5 w-1.5 rounded-full bg-[#4F806C]" /><p className="text-xs text-[#667085] dark:text-[#929C97]">Patient records stay inside your local Lumen workspace.</p></div>
  </main></div></div>;
}
