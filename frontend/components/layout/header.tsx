"use client";

import { WifiOff, Bell, UserCircle } from "lucide-react";

export default function Header() {
  return (
    <header className="fixed left-64 right-0 top-0 z-10 flex h-20 items-center justify-between border-b border-slate-800 bg-slate-950/95 px-8 backdrop-blur">
      
      {/* Page heading */}
      <div>
        <h2 className="text-lg font-semibold text-white">
          Hospital Dashboard
        </h2>
        <p className="text-sm text-slate-500">
          Overview of your local hospital environment
        </p>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-5">

        {/* Local status */}
        <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />

          <span className="text-xs font-medium text-emerald-400">
            LOCAL MODE
          </span>
        </div>

        {/* Offline indicator */}
        <div className="flex items-center gap-2 text-slate-500">
          <WifiOff size={17} />
          <span className="text-xs">
            Offline capable
          </span>
        </div>

        {/* Notification */}
        <button className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-900 hover:text-white">
          <Bell size={20} />
        </button>

        {/* User */}
        <div className="flex items-center gap-2 border-l border-slate-800 pl-5">
          <UserCircle size={30} className="text-slate-500" />

          <div>
            <p className="text-sm font-medium text-white">
              Dr. Arun
            </p>
            <p className="text-xs text-slate-500">
              Physician
            </p>
          </div>
        </div>

      </div>
    </header>
  );
}
