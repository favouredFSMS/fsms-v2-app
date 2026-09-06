"use client";

import React, { useState } from "react";
import { Icon } from "@/components/ui/icons";
import { CelebrationModal } from "@/components/achievements/cefr-badge-shield";
import Link from "next/link";

const QUESTIONS = [
  {
    id: 1,
    question: "Choose the correct past tense form: 'Yesterday, Anna _____ to school.'",
    options: ["go", "goed", "went", "has gone"],
    correct: 2,
    explanation: "'Went' is the irregular past tense form of 'go'.",
  },
  {
    id: 2,
    question: "Fill in the blank: 'There _____ three books on the table.'",
    options: ["is", "are", "be", "was"],
    correct: 1,
    explanation: "'Are' agrees with the plural subject 'three books'.",
  },
  {
    id: 3,
    question: "Select the antonym of 'Difficult':",
    options: ["Hard", "Complex", "Easy", "Challenging"],
    correct: 2,
    explanation: "'Easy' is the opposite of 'difficult'.",
  },
];

export default function PracticePage() {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const handleSelect = (qId: number, optionIdx: number) => {
    if (submitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [qId]: optionIdx }));
  };

  const handleSubmit = () => {
    setSubmitted(true);
    const correctCount = QUESTIONS.filter((q) => selectedAnswers[q.id] === q.correct).length;
    if (correctCount === QUESTIONS.length) {
      setShowCelebration(true);
    }
  };

  const handleReset = () => {
    setSelectedAnswers({});
    setSubmitted(false);
  };

  const score = QUESTIONS.filter((q) => selectedAnswers[q.id] === q.correct).length;
  const pct = Math.round((score / QUESTIONS.length) * 100);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-xl shadow-sm">
              🎯
            </span>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Interactive Practice Drill</h1>
              <p className="text-sm text-slate-500">Lesson Review & CEFR Skill Check</p>
            </div>
          </div>
          <Link
            href="/achievements"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-sm"
          >
            🏆 Trophy Room
          </Link>
        </div>

        {/* Questions list */}
        <div className="space-y-6">
          {QUESTIONS.map((q, idx) => {
            const isAnswered = selectedAnswers[q.id] !== undefined;
            const isCorrect = isAnswered && selectedAnswers[q.id] === q.correct;

            return (
              <div
                key={q.id}
                className={`rounded-2xl border bg-white p-6 shadow-sm transition ${
                  submitted
                    ? isCorrect
                      ? "border-emerald-300 bg-emerald-50/20"
                      : "border-rose-300 bg-rose-50/20"
                    : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between pb-3">
                  <span className="text-xs font-black text-blue-900 uppercase tracking-wider">
                    Question {idx + 1} of {QUESTIONS.length}
                  </span>
                  {submitted && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        isCorrect
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {isCorrect ? "✓ Correct" : "✗ Incorrect"}
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900">{q.question}</h3>

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {q.options.map((opt, oIdx) => {
                    const selected = selectedAnswers[q.id] === oIdx;
                    return (
                      <button
                        key={oIdx}
                        onClick={() => handleSelect(q.id, oIdx)}
                        className={`flex items-center justify-between rounded-xl border p-3 text-left text-sm font-medium transition ${
                          selected
                            ? "border-blue-800 bg-blue-50 text-blue-900 shadow-sm"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        } ${
                          submitted && oIdx === q.correct
                            ? "border-emerald-500 bg-emerald-50 font-bold text-emerald-900"
                            : ""
                        }`}
                      >
                        <span>{opt}</span>
                        {selected && <span className="text-xs font-bold text-blue-900">●</span>}
                      </button>
                    );
                  })}
                </div>

                {submitted && (
                  <div className="mt-4 rounded-xl bg-slate-100 p-3 text-xs text-slate-600">
                    💡 <b>Explanation:</b> {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action button & score */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {!submitted ? (
            <button
              onClick={handleSubmit}
              disabled={Object.keys(selectedAnswers).length < QUESTIONS.length}
              className="rounded-xl bg-blue-900 px-6 py-2.5 text-sm font-bold text-white shadow hover:bg-blue-800 disabled:opacity-50 transition"
            >
              Submit Practice Drill
            </button>
          ) : (
            <div className="flex w-full items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Final Result</span>
                <div className="text-xl font-black text-slate-900">
                  {score} / {QUESTIONS.length} ({pct}%)
                </div>
              </div>
              <button
                onClick={handleReset}
                className="rounded-xl bg-slate-800 px-5 py-2 text-sm font-bold text-white shadow hover:bg-slate-700 transition"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>

      <CelebrationModal
        isOpen={showCelebration}
        onClose={() => setShowCelebration(false)}
        title="100% Score!"
        subtitle="You answered all practice questions correctly and earned 3 practice stars!"
      />
    </div>
  );
}
