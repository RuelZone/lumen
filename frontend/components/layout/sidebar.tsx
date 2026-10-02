"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Bot,
  ArrowLeftRight,
  ClipboardList,
  Settings,
} from "lucide-react";

const navItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Patients",
    href: "/patients",
    icon: Users,
  },
  {
    name: "AI Assistant",
    href: "/ai",
    icon: Bot,
  },
  {
    name: "Transfers",
    href: "/transfers",
    icon: ArrowLeftRight,
  },
  {
    name: "Audit Log",
    href: "/audit",
    icon: ClipboardList,
  },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-950 text-white">
      
      {/* Logo */}
      <div className="flex h-20 items-center border-b border-slate-800 px-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">LUMEN</h1>
          <p className="text-xs text-slate-500">
            Local intelligence
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6">
        <p className="mb-3 px-3 text-xs font-medium uppercase tracking-wider text-slate-500">
          Workspace
        </p>

        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
              >
                <Icon size={19} strokeWidth={1.8} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom */}
      <div className="border-t border-slate-800 p-3">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
        >
          <Settings size={19} strokeWidth={1.8} />
          <span>Settings</span>
        </Link>

        <div className="mt-3 rounded-lg bg-slate-900 p-3">
          <p className="text-xs text-slate-500">Hospital</p>
          <p className="mt-1 text-sm font-medium text-white">
            Hospital A
          </p>
        </div>
      </div>
    </aside>
  );
}