import Link from "next/link";
import { ArrowRight, UserRound } from "lucide-react";

interface PatientCardProps {
  id: string;
  name: string;
  age: number;
  lastVisit: string;
}

export default function PatientCard({
  id,
  name,
  age,
  lastVisit,
}: PatientCardProps) {
  return (
    <Link
      href={`/patients/${id}`}
      className="group flex items-center justify-between border-b border-slate-800 px-5 py-4 transition hover:bg-slate-900/60"
    >
      <div className="flex items-center gap-4">
        <div className="rounded-full bg-slate-800 p-2.5">
          <UserRound
            size={18}
            className="text-slate-400"
          />
        </div>

        <div>
          <p className="text-sm font-medium text-white">
            {name}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {id} · Age {age}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-xs text-slate-500">
          Last visit · {lastVisit}
        </span>

        <ArrowRight
          size={17}
          className="text-slate-600 transition group-hover:translate-x-1 group-hover:text-slate-300"
        />
      </div>
    </Link>
  );
}