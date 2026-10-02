import Link from "next/link";
import {
  CalendarDays,
  FileText,
  ChevronRight,
} from "lucide-react";

type Patient = {
  id: string;
  name: string;
  age: number;
  lastUpdated: string;
  records: number;
};

export default function PatientCard({
  patient,
}: {
  patient: Patient;
}) {
  const initials = patient.name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link href={`/patients/${patient.id}`} className="block">
      <article className="group rounded-2xl border border-lumen-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-[1px] hover:bg-card-hover hover:shadow-md dark:hover:border-[#3a4541]">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-lumen-border bg-card-hover text-sm font-semibold text-lumen-green">
            {initials}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="min-w-0 break-words text-[15px] font-semibold leading-5 text-foreground">
                {patient.name}
              </h3>
              <span className="shrink-0 rounded-md border border-lumen-border bg-card-hover px-2 py-0.5 text-[10px] font-medium text-lumen-muted">
                {patient.id}
              </span>
            </div>

            <p className="mt-1 text-xs text-lumen-muted">
              {patient.age} years old
            </p>
          </div>

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent transition-all group-hover:border-lumen-border group-hover:bg-card">
            <ChevronRight
              size={17}
              className="text-lumen-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-foreground"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-lumen-border pt-4">
          <div className="flex items-center gap-1.5 text-xs text-lumen-muted">
            <FileText size={13} />
            <span>
              {patient.records} {patient.records === 1 ? "record" : "records"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-lumen-muted">
            <CalendarDays size={13} />
            <span>Updated {patient.lastUpdated}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
