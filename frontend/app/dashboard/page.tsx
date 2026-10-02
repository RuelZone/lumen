import {
  Users,
  AlertTriangle,
  Database,
  ShieldCheck,
} from "lucide-react";

import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import StatCard from "@/components/dashboard/statcard";
import FlaggedResults from "@/components/dashboard/flaggedresults";
import RecentPatients from "@/components/dashboard/recentpatients";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar />
      <Header />

      <main className="ml-64 pt-20">
        <div className="p-8">

          {/* Welcome */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-white">
              Good morning, Dr. Arun
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Here's what's happening in your hospital today.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard
              title="Total Patients"
              value="124"
              description="Stored locally"
              icon={<Users size={20} />}
            />

            <StatCard
              title="Flagged Results"
              value="8"
              description="Require review"
              icon={<AlertTriangle size={20} />}
            />

            <StatCard
              title="Local Records"
              value="1,248"
              description="Available offline"
              icon={<Database size={20} />}
            />

            <StatCard
              title="Privacy Status"
              value="Secure"
              description="No cloud AI calls"
              icon={<ShieldCheck size={20} />}
            />
          </div>

          {/* Main sections */}
          <div className="mt-6 grid grid-cols-2 gap-6">
            <FlaggedResults />
            <RecentPatients />
          </div>

        </div>
      </main>
    </div>
  );
}