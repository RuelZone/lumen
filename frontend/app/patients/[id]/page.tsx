"use client";

import { useState } from "react";

import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import PatientHeader from "@/components/patients/patientheader";
import PatientTimeline from "@/components/patients/patienttimeline";
import ChatWindow from "@/components/ai/chatwindow";

const patient = {
  id: "P001",
  name: "Rajesh Kumar",
  age: 45,
  notes: [
    {
      id: "N001",
      date: "28 Sep 2026",
      author: "Dr. Arun",
      text: "Patient reported fatigue for three days.",
      test_name: "Hemoglobin",
      value: 8.2,
      flag_for_review: true,
    },
    {
      id: "N002",
      date: "25 Sep 2026",
      author: "Dr. Meera",
      text: "Follow-up consultation completed.",
      test_name: null,
      value: null,
      flag_for_review: false,
    },
    {
      id: "N003",
      date: "20 Sep 2026",
      author: "Dr. Ravi",
      text: "Routine laboratory evaluation recorded.",
      test_name: "Glucose",
      value: 102,
      flag_for_review: false,
    },
  ],
};

export default function PatientPage() {
  const [showChat, setShowChat] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar />

      <Header />

      <main className="ml-64 pt-20">
        <div className="p-8">

          <PatientHeader
            id={patient.id}
            name={patient.name}
            age={patient.age}
            onAskLumen={() => setShowChat(true)}
          />

          <div className="max-w-5xl">
            <PatientTimeline notes={patient.notes} />
          </div>

        </div>
      </main>

      {showChat && (
        <ChatWindow
          patientName={patient.name}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  );
}