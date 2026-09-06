"use client";

import React, { useState } from "react";

export interface CefrBadgeProps {
  level: "Pre-A1" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | string;
  title: string;
  skill: "Speaking" | "Listening" | "Reading" | "Writing" | "Grammar" | "Vocabulary" | "Overall";
  earnedDate?: string;
  isUnlocked?: boolean;
  score?: number;
}

const LEVEL_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  "Pre-A1": { bg: "#475569", border: "#94a3b8", text: "#f8fafc", glow: "rgba(148, 163, 184, 0.3)" },
  A1: { bg: "#047857", border: "#34d399", text: "#ecfdf5", glow: "rgba(52, 211, 153, 0.3)" },
  A2: { bg: "#0284c7", border: "#38bdf8", text: "#f0f9ff", glow: "rgba(56, 189, 248, 0.3)" },
  B1: { bg: "#7c3aed", border: "#a78bfa", text: "#f5f3ff", glow: "rgba(167, 139, 250, 0.3)" },
  B2: { bg: "#b45309", border: "#fbbf24", text: "#fffbeb", glow: "rgba(251, 191, 36, 0.4)" },
  C1: { bg: "#be123c", border: "#fb7185", text: "#fff1f2", glow: "rgba(251, 113, 133, 0.4)" },
  C2: { bg: "#1e1b4b", border: "#f4b400", text: "#fef3c7", glow: "rgba(244, 180, 0, 0.5)" },
};

export function CefrBadgeShield({
  level,
  title,
  skill,
  earnedDate,
  isUnlocked = true,
  score,
}: CefrBadgeProps) {
  const conf = LEVEL_COLORS[level] || LEVEL_COLORS["A2"];

  return (
    <div
      className={`relative flex flex-col items-center rounded-2xl border p-5 text-center transition-all duration-300 ${
        isUnlocked
          ? "hover:-translate-y-1 hover:shadow-xl"
          : "opacity-40 grayscale"
      }`}
      style={{
        backgroundColor: "#ffffff",
        borderColor: isUnlocked ? conf.border : "#cbd5e1",
        boxShadow: isUnlocked ? `0 4px 20px ${conf.glow}` : "none",
      }}
    >
      {/* Shield SVG */}
      <div className="relative mb-3 flex h-20 w-18 items-center justify-center">
        <svg
          viewBox="0 0 72 84"
          className="h-full w-full drop-shadow-md"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M36 2L4 12V38C4 60 18 78 36 82C54 78 68 60 68 38V12L36 2Z"
            fill={isUnlocked ? conf.bg : "#64748b"}
            stroke={isUnlocked ? conf.border : "#94a3b8"}
            strokeWidth="3"
          />
          <path
            d="M36 8L10 16.5V38C10 55.5 21.5 70.5 36 74.5C50.5 70.5 62 55.5 62 38V16.5L36 8Z"
            fill="none"
            stroke={isUnlocked ? "rgba(255,255,255,0.25)" : "transparent"}
            strokeWidth="1.5"
          />
        </svg>
        <span
          className="absolute text-center font-black tracking-tight"
          style={{
            color: isUnlocked ? conf.text : "#ffffff",
            fontSize: level.length > 2 ? "15px" : "18px",
          }}
        >
          {level}
        </span>
      </div>

      <h4 className="text-sm font-bold text-slate-800">{title}</h4>
      <span className="mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-semibold text-slate-500 bg-slate-100">
        {skill}
      </span>

      {score !== undefined && isUnlocked && (
        <div className="mt-2 text-xs font-bold text-amber-600">
          ⭐ Score: {score}%
        </div>
      )}

      {earnedDate && isUnlocked && (
        <span className="mt-2 text-[11px] text-slate-400">
          Earned: {earnedDate}
        </span>
      )}

      {!isUnlocked && (
        <span className="mt-2 text-[11px] font-medium text-slate-400">
          🔒 Locked
        </span>
      )}
    </div>
  );
}

export function CelebrationModal({
  isOpen,
  onClose,
  title = "Congratulations!",
  subtitle = "You have unlocked a new CEFR Achievement!",
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      {/* Floating confetti dots */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute h-3 w-3 rounded-full opacity-80"
            style={{
              top: `${Math.random() * 80}%`,
              left: `${Math.random() * 90}%`,
              backgroundColor: ["#F4B400", "#1E3A8A", "#10B981", "#EC4899", "#8B5CF6"][i % 5],
              transform: `rotate(${Math.random() * 360}deg)`,
              animation: `ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite ${i * 0.1}s`,
            }}
          />
        ))}
      </div>

      <div className="relative w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl border-2 border-amber-400">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-4xl shadow-inner animate-bounce">
          🏆
        </div>
        <h2 className="text-2xl font-black text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">{subtitle}</p>

        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={onClose}
            className="rounded-xl bg-blue-900 px-6 py-2.5 text-sm font-bold text-white shadow hover:bg-blue-800 transition"
          >
            Claim Badge
          </button>
        </div>
      </div>
    </div>
  );
}
