"use client";

import React, { useState } from "react";
import { CefrBadgeShield, CelebrationModal, type CefrLevel } from "@/components/achievements/cefr-badge-shield";

const ALL_ACHIEVEMENTS: Array<{
  level: CefrLevel;
  title: string;
  skill: "Overall" | "Speaking" | "Grammar" | "Listening" | "Writing" | "Reading";
  earnedDate?: string;
  isUnlocked: boolean;
  score?: number;
}> = [
  { level: "PRE_A1", title: "Starters Foundation", skill: "Overall", earnedDate: "2026-05-10", isUnlocked: true, score: 98 },
  { level: "A1", title: "Phonics & Greetings", skill: "Speaking", earnedDate: "2026-05-14", isUnlocked: true, score: 100 },
  { level: "A2", title: "Elementary Mastery", skill: "Overall", earnedDate: "2026-08-20", isUnlocked: true, score: 92 },
  { level: "A2", title: "Past Simple Narrative", skill: "Grammar", earnedDate: "2026-08-25", isUnlocked: true, score: 88 },
  { level: "A2", title: "Story Dialogue", skill: "Listening", earnedDate: "2026-09-02", isUnlocked: true, score: 95 },
  { level: "B1", title: "Intermediate Threshold", skill: "Overall", isUnlocked: false },
  { level: "B1", title: "Complex Sentence Writing", skill: "Writing", isUnlocked: false },
  { level: "B2", title: "Vantage Fluency", skill: "Speaking", isUnlocked: false },
  { level: "C1", title: "Advanced Proficiency", skill: "Reading", isUnlocked: false },
  { level: "C2", title: "Mastery Crown", skill: "Overall", isUnlocked: false },
];

export default function AchievementsPage() {
  const [filter, setFilter] = useState<string>("all");
  const [showCelebration, setShowCelebration] = useState<boolean>(false);

  const filtered = filter === "all"
    ? ALL_ACHIEVEMENTS
    : filter === "unlocked"
    ? ALL_ACHIEVEMENTS.filter((a) => a.isUnlocked)
    : ALL_ACHIEVEMENTS.filter((a) => !a.isUnlocked);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-xl shadow-sm">
                🏆
              </span>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                Trophy Room & CEFR Badges
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Celebrate language milestone mastery across European Framework (CEFR) standards.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCelebration(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:from-amber-600 hover:to-amber-700 transition"
            >
              🎉 Trigger Celebration
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Badges</div>
            <div className="mt-1 text-2xl font-black text-slate-900">10</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Unlocked</div>
            <div className="mt-1 text-2xl font-black text-emerald-700">5</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-bold text-amber-500 uppercase tracking-wider">In Progress</div>
            <div className="mt-1 text-2xl font-black text-amber-600">2</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Highest CEFR</div>
            <div className="mt-1 text-2xl font-black text-blue-800">A2+</div>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-8 flex gap-2">
          {["all", "unlocked", "locked"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-xl px-4 py-2 text-xs font-bold capitalize transition ${
                filter === f
                  ? "bg-blue-900 text-white shadow"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Shields Grid */}
        <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((item, idx) => (
            <div key={idx} className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm text-center">
              <CefrBadgeShield
                level={item.level}
                unlocked={item.isUnlocked}
                score={item.score}
              />
              <div>
                <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                <p className="text-[11px] text-slate-500">{item.skill} · {item.isUnlocked ? item.earnedDate : "Locked"}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <CelebrationModal
        isOpen={showCelebration}
        onClose={() => setShowCelebration(false)}
        title="Outstanding Achievement!"
        subtitle="Congratulations on reaching elementary CEFR A2 mastery with distinction!"
      />
    </div>
  );
}
