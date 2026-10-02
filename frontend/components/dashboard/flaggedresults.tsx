import { AlertTriangle, ArrowRight } from "lucide-react";

const flaggedResults = [
  {
    patient: "Rajesh Kumar",
    test: "Hemoglobin",
    value: "8.2 g/dL",
    date: "28 Sep 2026",
  },
  {
    patient: "Priya Menon",
    test: "Blood Pressure",
    value: "165/102 mmHg",
    date: "27 Sep 2026",
  },
  {
    patient: "Arjun Nair",
    test: "Glucose",
    value: "248 mg/dL",
    date: "26 Sep 2026",
  },
];

export default function FlaggedResults() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50">
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <div>
          <h2 className="font-medium text-white">
            Flagged Results
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Records requiring clinical review
          </p>
        </div>

        <AlertTriangle size={19} className="text-amber-400" />
      </div>

      <div className="divide-y divide-slate-800">
        {flaggedResults.map((result) => (
          <div
            key={`${result.patient}-${result.test}`}
            className="flex items-center justify-between px-5 py-4"
          >
            <div>
              <p className="text-sm font-medium text-white">
                {result.patient}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {result.test} · {result.date}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-amber-400">
                {result.value}
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