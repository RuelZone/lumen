"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  ChevronDown,
  Moon,
  Sun,
} from "lucide-react";
import { usePathname } from "next/navigation";

const pageInfo: Record<
  string,
  {
    title: string;
    subtitle: string;
  }
> = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Your patient workspace",
  },
  "/patients": {
    title: "My Patients",
    subtitle: "Your personal patient records",
  },
  "/ai": {
    title: "Ask Lumen",
    subtitle: "Search documented patient information",
  },
  "/voice": {
    title: "Voice Notes",
    subtitle: "Capture notes directly into patient records",
  },
  "/settings": {
    title: "Settings",
    subtitle: "Manage your Lumen workspace",
  },
};

export default function Header() {
  const pathname = usePathname();
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("lumen-theme");

    if (saved === "dark") {
      document.documentElement.classList.add("dark");
      setDarkMode(true);
    }
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;

    setDarkMode(next);

    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("lumen-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("lumen-theme", "light");
    }
  };

  const current =
    Object.entries(pageInfo).find(([path]) =>
      pathname?.startsWith(path)
    )?.[1] ?? {
      title: "Lumen",
      subtitle: "Your private AI memory",
    };

  return (
    <header className="sticky top-0 z-30 flex h-[73px] items-center justify-between border-b border-[#E3E7E5] bg-white/95 px-8 backdrop-blur-md dark:border-[#29322F] dark:bg-[#0B1110]/95">
      <div>
        <h1 className="text-[17px] font-bold text-[#172033] dark:text-[#EEF2EF]">
          {current.title}
        </h1>

        <p className="mt-0.5 text-xs text-[#667085] dark:text-[#929C97]">
          {current.subtitle}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Theme */}
        <button
          onClick={toggleDarkMode}
          aria-label="Toggle theme"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E3E7E5] bg-white text-[#667085] hover:bg-[#F7F9F8] hover:text-[#4F806C] dark:border-[#29322F] dark:bg-[#121817] dark:text-[#929C97] dark:hover:bg-[#171F1D] dark:hover:text-[#7FA894]"
        >
          {darkMode ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Notifications */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#E3E7E5] bg-white text-[#667085] hover:bg-[#F7F9F8] hover:text-[#4F806C] dark:border-[#29322F] dark:bg-[#121817] dark:text-[#929C97] dark:hover:bg-[#171F1D] dark:hover:text-[#7FA894]">
          <Bell size={17} />

          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#4F806C] dark:bg-[#7FA894]" />
        </button>

        {/* Doctor */}
        <button className="hidden items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-[#F7F9F8] md:flex dark:hover:bg-[#171F1D]">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F0F3F1] text-xs font-bold text-[#4F806C] dark:bg-[#1A2521] dark:text-[#7FA894]">
            DA
          </div>

          <div className="text-left">
            <p className="text-xs font-semibold text-[#172033] dark:text-[#EEF2EF]">
              Dr. Arun
            </p>

            <p className="text-[10px] text-[#667085] dark:text-[#929C97]">
              My workspace
            </p>
          </div>

          <ChevronDown
            size={14}
            className="text-[#98A2B3] dark:text-[#71817A]"
          />
        </button>
      </div>
    </header>
  );
}
