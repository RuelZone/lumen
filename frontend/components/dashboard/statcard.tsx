import {
  Users,
  AlertTriangle,
  Database,
  ShieldCheck,
  LucideIcon,
} from "lucide-react";

type StatCardProps = {
  title: string;
  value: string;
  subtitle: string;
  type: "patients" | "flagged" | "records" | "privacy";
};

const iconMap: Record<StatCardProps["type"], LucideIcon> = {
  patients: Users,
  flagged: AlertTriangle,
  records: Database,
  privacy: ShieldCheck,
};

export default function StatCard({
  title,
  value,
  subtitle,
  type,
}: StatCardProps) {
  const Icon = iconMap[type];
  const isPrivacy = type === "privacy";
  const isFlagged = type === "flagged";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.03)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{title}</p>

          <p
            className={`mt-2 text-[27px] font-semibold tracking-tight ${
              isPrivacy ? "text-emerald-600" : "text-slate-900"
            }`}
          >
            {value}
          </p>

          <p className="mt-1 text-[11px] text-slate-400">{subtitle}</p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            isPrivacy
              ? "bg-emerald-50 text-emerald-600"
              : isFlagged
                ? "bg-amber-50 text-amber-600"
                : "bg-slate-50 text-slate-500"
          }`}
        >
          <Icon size={19} strokeWidth={1.8} />
        </div>
      </div>
    </div>
  );
}