"use client";

import React, { useState } from "react";
import { Icon } from "@/components/ui/icons";
import { useTranslations } from "next-intl";

export interface StudentRow {
  id: string;
  name: string;
  avatarUrl?: string;
  previousHomeworkPending?: boolean;
}

export interface QuickEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes?: Array<{ id: string; name: string }>;
  defaultClassId?: string;
  onSuccess?: () => void;
}

const DEFAULT_TOPIC_SUGGESTIONS = [
  "Unit 4: Daily Routines & Time",
  "Past Simple: Regular & Irregular Verbs",
  "Vocabulary: Travel & Transport",
  "Dialogue Practice: In a Restaurant",
  "Present Continuous vs Present Simple",
];

export function QuickEntryModal({
  isOpen,
  onClose,
  classes = [
    { id: "cls-1", name: "Primary English 3A" },
    { id: "cls-2", name: "Junior Secondary 1B" },
    { id: "cls-3", name: "Advanced Speaking C1" },
  ],
  defaultClassId,
  onSuccess,
}: QuickEntryModalProps) {
  const t = useTranslations("dashboard");
  const [selectedClassId, setSelectedClassId] = useState(defaultClassId || classes[0]?.id || "");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [lessonNo, setLessonNo] = useState("14");
  const [topic, setTopic] = useState("Unit 4: Daily Routines & Time");
  const [participation, setParticipation] = useState("Good");
  const [lessonRating, setLessonRating] = useState(5);
  const [teacherNote, setTeacherNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Roster state
  const [students, setStudents] = useState<
    Array<{
      id: string;
      name: string;
      included: boolean;
      status: "Present" | "Absent" | "Late" | "Excused";
      hwDone: boolean;
      hadHw: boolean;
    }>
  >([
    { id: "s1", name: "Alexander Ivanov", included: true, status: "Present", hwDone: true, hadHw: true },
    { id: "s2", name: "Maria Petrova", included: true, status: "Present", hwDone: true, hadHw: true },
    { id: "s3", name: "Dmitry Sidorov", included: true, status: "Present", hwDone: false, hadHw: true },
    { id: "s4", name: "Elena Kozlova", included: true, status: "Late", hwDone: true, hadHw: true },
    { id: "s5", name: "Maxim Smirnov", included: true, status: "Present", hwDone: true, hadHw: true },
  ]);

  if (!isOpen) return null;

  // Step completion flags
  const includedCount = students.filter((s) => s.included).length;
  const isStep1Done = includedCount > 0 && students.every((s) => !s.included || !!s.status);
  const isStep2Done = students.length > 0;
  const isStep3Done = topic.trim().length > 0;
  const isStep4Done = participation.trim().length > 0;
  const isStep5Done = teacherNote.trim().length > 0;

  const completedStepsCount = [isStep1Done, isStep2Done, isStep3Done, isStep4Done, isStep5Done].filter(
    Boolean,
  ).length;

  const handleMarkAll = (st: "Present" | "Absent" | "Late") => {
    setStudents((prev) =>
      prev.map((s) => (s.included ? { ...s, status: st } : s)),
    );
  };

  const handleSetStatus = (id: string, st: "Present" | "Absent" | "Late" | "Excused") => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: st } : s)),
    );
  };

  const handleToggleIncluded = (id: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, included: !s.included, status: !s.included ? "Present" : "Absent" } : s,
      ),
    );
  };

  const handleToggleHw = (id: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, hwDone: !s.hwDone } : s)),
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save delay
    await new Promise((r) => setTimeout(r, 600));
    setIsSaving(false);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onSuccess?.();
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-900 font-bold">
              ⚡
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">Quick Class Entry</h2>
              <p className="text-xs text-slate-500">Record attendance, homework, lesson topic & ratings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            ✕
          </button>
        </div>

        {/* State Banner & Class Selector */}
        <div className="border-b border-slate-100 bg-blue-50/40 px-6 py-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Class</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-xs focus:border-blue-500 focus:outline-hidden"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-xs focus:border-blue-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Lesson Number</label>
              <input
                type="number"
                value={lessonNo}
                onChange={(e) => setLessonNo(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-xs focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* 5-Step Progress Strip */}
        <div className="border-b border-slate-200 bg-white px-6 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Step Progress</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-black ${
                completedStepsCount === 5 ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
              }`}
            >
              {completedStepsCount}/5 Completed
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {[
              { label: "1. Attendance", done: isStep1Done },
              { label: "2. Homework", done: isStep2Done },
              { label: "3. Topic", done: isStep3Done },
              { label: "4. Rating", done: isStep4Done },
              { label: "5. Note", done: isStep5Done },
            ].map((st, i) => (
              <div
                key={i}
                className={`flex items-center justify-center gap-1 rounded-lg border py-1.5 px-1 text-center text-[10px] sm:text-xs font-bold transition ${
                  st.done
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800 font-black"
                    : "border-slate-200 bg-slate-50 text-slate-400"
                }`}
              >
                <span>{st.done ? "✓" : "○"}</span>
                <span className="truncate">{st.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Section 1 & 2: Student Roster (Attendance & Homework) */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  1. Attendance & 2. Previous Homework
                </h3>
                <span className="text-[11px] text-slate-500">
                  {includedCount} of {students.length} students in lesson
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleMarkAll("Present")}
                  className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
                >
                  All Present
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkAll("Late")}
                  className="rounded-md bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700 border border-amber-200 hover:bg-amber-100 transition"
                >
                  All Late
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkAll("Absent")}
                  className="rounded-md bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 border border-rose-200 hover:bg-rose-100 transition"
                >
                  All Absent
                </button>
              </div>
            </div>

            <div className="mt-3 divide-y divide-slate-100">
              {students.map((student) => (
                <div key={student.id} className="flex items-center justify-between py-2.5 gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={student.included}
                      onChange={() => handleToggleIncluded(student.id)}
                      className="rounded text-blue-900 focus:ring-blue-800"
                      title="Include in class"
                    />
                    <div className="truncate">
                      <span
                        className={`text-xs font-semibold ${
                          student.included ? "text-slate-900" : "text-slate-400 line-through"
                        }`}
                      >
                        {student.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Previous HW */}
                    <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={student.hwDone}
                        disabled={!student.included}
                        onChange={() => handleToggleHw(student.id)}
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span className="hidden sm:inline">HW Done</span>
                    </label>

                    {/* Attendance Pill Group */}
                    <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                      {(["Present", "Late", "Absent", "Excused"] as const).map((st) => {
                        const active = student.status === st;
                        const colors = {
                          Present: "bg-emerald-600 text-white shadow-xs",
                          Late: "bg-amber-500 text-white shadow-xs",
                          Absent: "bg-rose-600 text-white shadow-xs",
                          Excused: "bg-slate-600 text-white shadow-xs",
                        };
                        return (
                          <button
                            key={st}
                            type="button"
                            disabled={!student.included}
                            onClick={() => handleSetStatus(student.id, st)}
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold transition ${
                              active ? colors[st] : "text-slate-500 hover:text-slate-800"
                            } ${!student.included ? "opacity-30 cursor-not-allowed" : ""}`}
                          >
                            {st}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Lesson Topic */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-1.5">
              3. Lesson Topic
            </h3>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Unit 4: Daily Routines & Present Simple"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-hidden"
            />
            <div className="mt-2 flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-bold text-slate-400">Suggestions:</span>
              {DEFAULT_TOPIC_SUGGESTIONS.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setTopic(sug)}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-900 transition"
                >
                  + {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Section 4: Participation & Lesson Rating */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">
                4. Participation
              </h3>
              <select
                value={participation}
                onChange={(e) => setParticipation(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="Excellent">⭐ Excellent (Active engagement)</option>
                <option value="Good">👍 Good (Attentive and participating)</option>
                <option value="Average">👌 Average (Moderate participation)</option>
                <option value="Low">⚠️ Low (Needs encouragement)</option>
              </select>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">
                Lesson Rating ({lessonRating} / 5 Stars)
              </h3>
              <div className="flex items-center gap-1.5 pt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setLessonRating(star)}
                    className="text-xl transition hover:scale-110 focus:outline-hidden"
                  >
                    {star <= lessonRating ? "⭐" : "☆"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 5: Teacher Note */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-1.5">
              5. Teacher Note (Optional)
            </h3>
            <textarea
              rows={2}
              value={teacherNote}
              onChange={(e) => setTeacherNote(e.target.value)}
              placeholder="What went well today, what needs extra review next lesson…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
          </div>

          <div className="flex items-center gap-2">
            {savedSuccess ? (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                <span>✓</span> Lesson Saved Successfully!
              </span>
            ) : (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSave}
                className="flex items-center gap-2 rounded-xl bg-blue-900 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-800 transition disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save & Finish Lesson"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
