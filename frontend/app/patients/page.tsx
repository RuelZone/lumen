import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import PatientList from "@/components/patients/patientlist";

export default function PatientsPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar />
      <Header />

      <main className="ml-64 pt-20">
        <div className="p-8">

          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-white">
              Patients
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Access locally stored patient records.
            </p>
          </div>

          <PatientList />

        </div>
      </main>
    </div>
  );
}