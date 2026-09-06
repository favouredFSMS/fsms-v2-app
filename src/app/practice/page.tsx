"use client";

import React, { useState } from "react";
import { Icon } from "@/components/ui/icons";
import { CelebrationModal } from "@/components/achievements/cefr-badge-shield";
import Link from "next/link";

interface Question {
  id: number;
  level: "A1" | "A2" | "B1" | "B2" | "C1";
  category: "Grammar" | "Vocabulary" | "Reading" | "Speaking";
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

const PRACTICE_BANK: Record<string, Question[]> = {
  All: [
    {
      id: 1,
      level: "A1",
      category: "Grammar",
      question: "Choose the correct past tense form: 'Yesterday, Anna _____ to school.'",
      options: ["go", "goed", "went", "has gone"],
      correct: 2,
      explanation: "'Went' is the irregular past tense form of 'go'.",
    },
    {
      id: 2,
      level: "A1",
      category: "Grammar",
      question: "Fill in the blank: 'There _____ three books on the table.'",
      options: ["is", "are", "be", "was"],
      correct: 1,
      explanation: "'Are' agrees with the plural subject 'three books'.",
    },
    {
      id: 3,
      level: "A2",
      category: "Vocabulary",
      question: "Select the antonym of 'Difficult':",
      options: ["Hard", "Complex", "Easy", "Challenging"],
      correct: 2,
      explanation: "'Easy' is the opposite of 'difficult'.",
    },
    {
      id: 4,
      level: "B1",
      category: "Reading",
      question: "Which connector shows contrast: 'I was tired, _____ I finished my homework.'",
      options: ["so", "because", "yet", "unless"],
      correct: 2,
      explanation: "'Yet' is used to connect contrasting clauses.",
    },
    {
      id: 5,
      level: "B2",
      category: "Speaking",
      question: "Which phrase is best for politely disagreeing in a discussion?",
      options: [
        "You are wrong.",
        "I see your point, but I see it slightly differently.",
        "That makes no sense.",
        "No way.",
      ],
      correct: 1,
      explanation: "'I see your point, but...' is a standard polite disagreement formula in academic English.",
    },
  ],
};

const FLASHCARDS = [
  { term: "Perseverance", def: "Persistence in doing something despite difficulty or delay in achieving success." },
  { term: "Coherent", def: "Logical and consistent; clearly reasoned and easy to understand." },
  { term: "Ubiquitous", def: "Present, appearing, or found everywhere." },
  { term: "Ephemeral", def: "Lasting for a very short time; fleeting or transient." },
];

export default function PracticePage() {
  const [activeTab, setActiveTab] = useState<"quiz" | "flashcards" | "speed">("quiz");
  const [selectedLevel, setSelectedLevel] = useState<string>("All");
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Flashcard state
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Filter questions
  const questions = PRACTICE_BANK.All.filter(
    (q) => selectedLevel === "All" || q.level === selectedLevel,
  );

  const handleSelect = (qId: number, optionIdx: number) => {
    if (submitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [qId]: optionIdx }));
  };

  const handleSubmit = () => {
    setSubmitted(true);
    const correctCount = questions.filter((q) => selectedAnswers[q.id] === q.correct).length;
    if (correctCount === questions.length && questions.length > 0) {
      setShowCelebration(true);
    }
  };

  const handleReset = () => {
    setSelectedAnswers({});
    setSubmitted(false);
  };

  const score = questions.filter((q) => selectedAnswers[q.id] === q.correct).length;
  const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-xl shadow-sm">
              🎯
            </span>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Interactive Practice Center</h1>
              <p className="text-sm text-slate-500">Autonomous Drills, Flashcards & CEFR Skill Verification</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/study"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-xs"
            >
              📖 Study Room
            </Link>
            <Link
              href="/achievements"
              className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 transition shadow-xs"
            >
              🏆 Trophy Room
            </Link>
          </div>
        </div>

        {/* Mode Selector & Level Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab("quiz")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === "quiz"
                  ? "bg-blue-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              📝 Interactive Quiz
            </button>
            <button
              onClick={() => setActiveTab("flashcards")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === "flashcards"
                  ? "bg-blue-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              🗂️ Flashcard Deck
            </button>
            <button
              onClick={() => setActiveTab("speed")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === "speed"
                  ? "bg-blue-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              ⚡ Speed Challenge
            </button>
          </div>

          {activeTab === "quiz" && (
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Level:</span>
              {["All", "A1", "A2", "B1", "B2"].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => {
                    setSelectedLevel(lvl);
                    handleReset();
                  }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    selectedLevel === lvl
                      ? "bg-amber-400 text-slate-900 shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mode: Quiz */}
        {activeTab === "quiz" && (
          <div className="space-y-6">
            <div className="space-y-4">
              {questions.map((q, idx) => {
                const isAnswered = selectedAnswers[q.id] !== undefined;
                const isCorrect = isAnswered && selectedAnswers[q.id] === q.correct;

                return (
                  <div
                    key={q.id}
                    className={`rounded-2xl border bg-white p-6 shadow-xs transition ${
                      submitted
                        ? isCorrect
                          ? "border-emerald-300 bg-emerald-50/20"
                          : "border-rose-300 bg-rose-50/20"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between pb-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-900 uppercase">
                          {q.level} · {q.category}
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                          Question {idx + 1} of {questions.length}
                        </span>
                      </div>
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
                                ? "border-blue-800 bg-blue-50 text-blue-900 shadow-xs"
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
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              {!submitted ? (
                <button
                  onClick={handleSubmit}
                  disabled={Object.keys(selectedAnswers).length < questions.length}
                  className="rounded-xl bg-blue-900 px-6 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-blue-800 disabled:opacity-50 transition"
                >
                  Submit Practice Drill ({Object.keys(selectedAnswers).length}/{questions.length})
                </button>
              ) : (
                <div className="flex w-full items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Final Result</span>
                    <div className="text-xl font-black text-slate-900">
                      {score} / {questions.length} ({pct}%)
                    </div>
                  </div>
                  <button
                    onClick={handleReset}
                    className="rounded-xl bg-slate-800 px-5 py-2 text-sm font-bold text-white shadow-xs hover:bg-slate-700 transition"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mode: Flashcards */}
        {activeTab === "flashcards" && (
          <div className="space-y-6">
            <div
              onClick={() => setFlipped(!flipped)}
              className="flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-blue-200 bg-gradient-to-br from-blue-50 to-amber-50/50 p-8 text-center shadow-xs transition hover:border-blue-400"
            >
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2">
                Card {cardIdx + 1} of {FLASHCARDS.length} · Click to flip 🔄
              </span>
              <div className="text-2xl font-black text-slate-900 max-w-md">
                {!flipped ? FLASHCARDS[cardIdx].term : FLASHCARDS[cardIdx].def}
              </div>
              <span className="mt-4 text-xs font-semibold text-slate-400">
                {!flipped ? "💡 Reveal definition" : "🏷️ Term: " + FLASHCARDS[cardIdx].term}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <button
                disabled={cardIdx === 0}
                onClick={() => {
                  setFlipped(false);
                  setCardIdx((i) => Math.max(0, i - 1));
                }}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
              >
                ← Previous Card
              </button>
              <button
                disabled={cardIdx === FLASHCARDS.length - 1}
                onClick={() => {
                  setFlipped(false);
                  setCardIdx((i) => Math.min(FLASHCARDS.length - 1, i + 1));
                }}
                className="rounded-xl bg-blue-900 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-800 disabled:opacity-40"
              >
                Next Card →
              </button>
            </div>
          </div>
        )}

        {/* Mode: Speed Challenge */}
        {activeTab === "speed" && (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center space-y-4 shadow-xs">
            <div className="text-4xl">⏱️</div>
            <h3 className="text-xl font-black text-slate-900">60-Second Speed Recall</h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Answer as many grammar and vocabulary questions as you can in 60 seconds to climb the weekly speed leaderboard!
            </p>
            <button
              onClick={() => setActiveTab("quiz")}
              className="rounded-xl bg-amber-400 px-6 py-2.5 text-sm font-bold text-slate-900 shadow-xs hover:bg-amber-300 transition"
            >
              Start Speed Run
            </button>
          </div>
        )}
      </div>

      <CelebrationModal
        isOpen={showCelebration}
        onClose={() => setShowCelebration(false)}
        title="100% Mastery Score!"
        subtitle="You answered all practice questions correctly and earned 3 practice stars for your trophy room!"
      />
    </div>
  );
}
