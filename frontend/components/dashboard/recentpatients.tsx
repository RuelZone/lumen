import { ArrowRight, UserRound } from "lucide-react";

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

export default function RecentPatients() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50">
      <div className="border-b border-slate-800 px-5 py-4">
        <h2 className="font-medium text-white">
          Recent Patients
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          Recently accessed patient records
        </p>
      </div>

      <div className="divide-y divide-slate-800">
        {patients.map((patient) => (
          <div
            key={patient.id}
            className="flex items-center justify-between px-5 py-4"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-slate-800 p-2">
                <UserRound
                  size={17}
                  className="text-slate-400"
                />
              </div>

              <div>
                <p className="text-sm font-medium text-white">
                  {patient.name}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {patient.id} · Age {patient.age}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">
                {patient.lastVisit}
              </span>

              <ArrowRight
                size={17}
                className="text-slate-600"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}