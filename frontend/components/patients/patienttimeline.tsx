import { AlertTriangle, FileText } from "lucide-react";

interface PatientNote {
  id: string;
  date: string;
  author: string;
  text: string;
  test_name: string | null;
  value: number | null;
  flag_for_review: boolean;
}

interface PatientTimelineProps {
  notes: PatientNote[];
}

export default function PatientTimeline({
  notes,
}: PatientTimelineProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50">
      <div className="border-b border-slate-800 px-6 py-5">
        <h2 className="font-medium text-white">
          Patient Timeline
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          Clinical notes and recorded results
        </p>
      </div>

      <div className="p-6">
        <div className="space-y-7">
          {notes.map((note) => (
            <div
              key={note.id}
              className="relative pl-8"
            >
              {/* Timeline line */}
              <div className="absolute left-[7px] top-3 h-full w-px bg-slate-800" />

              {/* Timeline dot */}
              <div className="absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 border-slate-700 bg-slate-950" />

              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {note.date}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {note.author}
                    </p>
                  </div>

                  {note.flag_for_review && (
                    <span className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-2.5 py-1 text-xs text-amber-400">
                      <AlertTriangle size={13} />
                      Review
                    </span>
                  )}
                </div>

                <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-start gap-3">
                    <FileText
                      size={17}
                      className="mt-0.5 shrink-0 text-slate-500"
                    />

                    <p className="text-sm leading-6 text-slate-300">
                      {note.text}
                    </p>
                  </div>

                  {note.test_name && note.value !== null && (
                    <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-900 px-4 py-3">
                      <span className="text-xs text-slate-500">
                        {note.test_name}
                      </span>

                      <span
                        className={
                          note.flag_for_review
                            ? "text-sm font-semibold text-amber-400"
                            : "text-sm font-semibold text-slate-200"
                        }
                      >
                        {note.value}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}