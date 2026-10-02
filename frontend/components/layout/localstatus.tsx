"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, WifiOff } from "lucide-react";

export function LocalStatusBadge() {
  const [isHealthy, setIsHealthy] = useState(true);

  useEffect(() => {
    fetch("/api/patients")
      .then((res) => setIsHealthy(res.ok))
      .catch(() => setIsHealthy(false));
  }, []);

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-lumen-border bg-card-hover px-3 py-1.5 text-[10px] font-semibold tracking-wide text-lumen-muted">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isHealthy ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
        }`}
      />
      <span className="uppercase">
        {isHealthy ? "Local AI Active" : "Local Standby"}
      </span>
    </div>
  );
}

export default LocalStatusBadge;
