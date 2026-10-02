"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Mic,
  Settings,
  Users,
  Wifi,
} from "lucide-react";
import { PixelBulb } from "@/components/ui/pixel-bulb";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "My Patients",
    href: "/patients",
    icon: Users,
  },
  {
    name: "Ask Lumen",
    href: "/ai",
    icon: Bot,
  },
  {
    name: "Voice Notes",
    href: "/voice",
    icon: Mic,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return pathname?.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[250px] flex-col border-r border-[#E3E7E5] bg-white dark:border-[#29322F] dark:bg-[#0E1412]">
      {/* Logo */}
      <div className="flex h-[73px] items-center border-b border-[#EDEFEF] px-6 dark:border-[#29322F]">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[#172033] shadow-xs dark:bg-[#EEF2EF]">
            <PixelBulb size="sm" glow />
          </div>

          <div>
            <div className="text-[17px] font-bold tracking-tight text-[#172033] dark:text-[#EEF2EF]">
              LUMEN
            </div>

            <div className="text-[9px] font-medium uppercase tracking-[0.16em] text-[#98A2B3] dark:text-[#71817A]">
              Your private AI memory
            </div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-4 py-6">
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#98A2B3] dark:text-[#66756E]">
          Workspace
        </p>

        <div className="space-y-1">
          {navigation.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                  active
                    ? "bg-[#F0F3F1] text-[#172033] dark:bg-[#1A2521] dark:text-[#EEF2EF]"
                    : "text-[#667085] hover:bg-[#F7F9F8] hover:text-[#172033] dark:text-[#929C97] dark:hover:bg-[#171F1D] dark:hover:text-[#EEF2EF]"
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[#4F806C] dark:bg-[#7FA894]" />
                )}

                {item.name === "Ask Lumen" ? (
                  <PixelBulb size="xs" glow />
                ) : (
                  <Icon
                    size={17}
                    strokeWidth={active ? 2 : 1.8}
                  />
                )}

                <span>{item.name}</span>

                {active && (
                  <ChevronRight
                    size={14}
                    className="ml-auto opacity-50"
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Local AI */}
        <div className="mt-8">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#98A2B3] dark:text-[#66756E]">
            System
          </p>

          <div className="rounded-2xl border border-[#E1E7E3] bg-[#F7F9F8] p-4 dark:border-[#303B37] dark:bg-[#151C1A]">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EEF3F0] text-[#4F806C] dark:bg-[#1A2521] dark:text-[#7FA894]">
                <Bot size={15} />
              </div>

              <div>
                <p className="text-xs font-bold text-[#172033] dark:text-[#EEF2EF]">
                  Local AI
                </p>

                <p className="text-[10px] text-[#667085] dark:text-[#929C97]">
                  Running locally
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-lg bg-white px-2.5 py-2 dark:bg-[#0F1513]">
              <Wifi
                size={12}
                className="text-[#66756E] dark:text-[#929C97]"
              />

              <span className="text-[10px] font-medium text-[#667085] dark:text-[#929C97]">
                Internet not required
              </span>

              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#4F806C] dark:bg-[#7FA894]" />
            </div>
          </div>
        </div>
      </nav>

      <div className="border-t border-[#EDEFEF] p-4 dark:border-[#29322F]">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#667085] hover:bg-[#F7F9F8] hover:text-[#172033] dark:text-[#929C97] dark:hover:bg-[#171F1D] dark:hover:text-[#EEF2EF]"
        >
          <Settings size={17} />
          Settings
        </Link>

        <div className="mt-3 px-3 text-[10px] text-[#98A2B3] dark:text-[#66756E]">
          Lumen v1.0 · Local workspace
        </div>
      </div>
    </aside>
  );
}