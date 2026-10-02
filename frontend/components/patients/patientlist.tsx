"use client";

import PatientCard from "./patientcard";

type Patient = {
  id: string;
  name: string;
  age: number;
  lastUpdated: string;
  records: number;
};

type PatientListProps = {
  patients: Patient[];
};

export default function PatientList({
  patients,
}: PatientListProps) {
  if (patients.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-lumen-border bg-card p-10 text-center">
        <p className="text-sm font-medium text-foreground">
          No patients found
        </p>

        <p className="mt-1 text-xs text-lumen-muted">
          Try changing your search or filter.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {patients.map((patient) => (
        <PatientCard
          key={patient.id}
          patient={patient}
        />
      ))}
    </div>
  );
}