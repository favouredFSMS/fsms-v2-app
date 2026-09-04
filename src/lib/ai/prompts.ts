/**
 * FSMS V2 — AI prompt builders (Phase 21).
 *
 * When a provider IS configured, the engine needs a prompt. These builders
 * serialize the same structured context the deterministic fallbacks consume,
 * with a system-style instruction line. Output shapes mirror the fallback
 * module so the two paths are interchangeable.
 */

import type { FallbackStudent, FallbackAtRiskRow, FallbackObjective, FallbackLesson } from "./fallback";

export function studentReportPrompt(s: FallbackStudent): string {
  return [
    "You are a school report assistant. Write a concise, encouraging student progress report (150–200 words) in plain text.",
    "Student data (JSON):",
    JSON.stringify(s),
  ].join("\n\n");
}

export function remarksPrompt(studentName: string | null, subject: string | null): string {
  return [
    "Write 3 short, professional teacher remarks (plain text, one per line).",
    `Student: ${studentName ?? "Unknown"}`,
    `Subject: ${subject ?? "general"}`,
  ].join("\n");
}

export function atRiskPrompt(rows: FallbackAtRiskRow[]): string {
  return [
    "Flag at-risk students. Rules: attendance below 80% OR assessment average below 60.",
    "Return plain text: one bullet per at-risk student with reasons, or a sentence if none.",
    "Roster (JSON):",
    JSON.stringify(rows),
  ].join("\n\n");
}

export function practicePrompt(level: string | null, objectives: FallbackObjective[]): string {
  return [
    "Create a short practice plan (plain text) for these learning targets.",
    `Level: ${(level ?? "current").toUpperCase()}`,
    "Targets (JSON):",
    JSON.stringify(objectives),
  ].join("\n\n");
}

export function quizPrompt(level: string | null, objectives: FallbackObjective[], count: number): string {
  return [
    `Generate ${count} quiz questions as a JSON array. Each item: {no, type, question, options?, answer}.`,
    `Level: ${(level ?? "current").toUpperCase()}`,
    "Learning targets (JSON):",
    JSON.stringify(objectives),
    "Return ONLY the JSON array.",
  ].join("\n\n");
}

export function assessmentTasksPrompt(level: string | null, objectives: FallbackObjective[]): string {
  return [
    "Create 3 assessment tasks as a JSON array. Each item: {task, type, instruction}.",
    `Level: ${(level ?? "current").toUpperCase()}`,
    "Learning targets (JSON):",
    JSON.stringify(objectives),
    "Return ONLY the JSON array.",
  ].join("\n\n");
}

export function lessonPlanPrompt(lesson: FallbackLesson): string {
  return [
    "Write a 40-minute lesson plan in Markdown: Objectives, Stages (lead-in, presentation, controlled practice, freer practice, wrap-up) with timings.",
    "Lesson (JSON):",
    JSON.stringify(lesson),
  ].join("\n\n");
}

export function lessonSummaryPrompt(topic: string | null, lessonNo: number | null, date: string | null): string {
  return [
    "Summarise this lesson in one or two sentences (plain text).",
    `Topic: ${topic ?? "n/a"}; lesson number: ${lessonNo ?? "n/a"}; date: ${date ?? "n/a"}`,
  ].join("\n");
}

export function learnerHelpPrompt(question: string): string {
  return [
    "You are a friendly language-school assistant. Answer the student's question helpfully in plain text (max 120 words).",
    `Question: ${question}`,
  ].join("\n\n");
}
