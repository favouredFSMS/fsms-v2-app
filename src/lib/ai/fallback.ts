/**
 * FSMS V2 — deterministic AI fallbacks (Phase 21).
 *
 * When no provider key is configured — or every provider in the chain fails —
 * the engine must still return something useful instead of erroring (roadmap
 * Phase 21 "fallback behavior", spec D15 "error handling & fallback"). These
 * generators produce the same output *shape* as the V101 AI prompts from the
 * structured data the app already has, so the feature stays operational and
 * testable with zero external calls and zero secrets.
 */

export interface FallbackStudent {
  name: string | null;
  level_code: string | null;
  academic_status: string | null;
  attendance?: { present: number; late: number; absent: number; rate: number | null } | null;
  assessments?: { count: number; avg_score: number | null } | null;
  evidence?: { count: number; avg_score: number | null } | null;
}

export interface FallbackAtRiskRow {
  id: string;
  name: string | null;
  attendance_rate: number | null;
  assessment_avg: number | null;
}

export interface FallbackObjective {
  code?: string | null;
  text?: string | null;
}

export function studentReportNarrative(s: FallbackStudent): string {
  const name = s.name ?? "the student";
  const att = s.attendance;
  const asm = s.assessments;
  const ev = s.evidence;
  const parts: string[] = [];

  parts.push(`${name} is currently working at level ${(s.level_code ?? "—").toUpperCase()}.`);

  if (att) {
    const rate = att.rate == null ? "—" : `${att.rate}%`;
    parts.push(
      `Attendance stands at ${rate} (${att.present} present, ${att.late} late, ${att.absent} absent).`,
    );
  }

  if (asm && asm.count > 0) {
    parts.push(
      `Across ${asm.count} assessments the average score is ${asm.avg_score ?? "—"}.`,
    );
  } else {
    parts.push("No assessments have been recorded yet.");
  }

  if (ev && ev.count > 0) {
    parts.push(
      `${ev.count} pieces of learning evidence have been logged, averaging ${ev.avg_score ?? "—"}.`,
    );
  }

  if (s.academic_status) parts.push(`Current academic status: ${s.academic_status}.`);

  parts.push(
    "This summary was generated offline (no AI provider configured). " +
      "Configure a provider in the AI console for a richer, model-written report.",
  );
  return parts.join("\n\n");
}

export function remarks(studentName: string | null, subject: string | null): string {
  const name = studentName ?? "Student";
  const topic = subject ? ` in ${subject}` : "";
  return [
    `${name} engages well${topic} and completes tasks on time.`,
    `Encourage ${name} to keep practising regularly to consolidate new material.`,
    `${name} would benefit from extra speaking practice at home.`,
  ].join("\n");
}

export function atRiskList(rows: FallbackAtRiskRow[]): string {
  const risky = rows.filter(
    (r) =>
      (r.attendance_rate != null && r.attendance_rate < 80) ||
      (r.assessment_avg != null && r.assessment_avg < 60),
  );
  if (risky.length === 0) {
    return "No students are currently flagged as at risk based on attendance below 80% or assessment average below 60.";
  }
  const lines = risky.map((r) => {
    const reasons: string[] = [];
    if (r.attendance_rate != null && r.attendance_rate < 80) {
      reasons.push(`attendance ${r.attendance_rate}%`);
    }
    if (r.assessment_avg != null && r.assessment_avg < 60) {
      reasons.push(`assessment average ${r.assessment_avg}`);
    }
    return `- ${r.name ?? "Unnamed"}: ${reasons.join(", ")}`;
  });
  return ["At-risk students (deterministic rules):", ...lines].join("\n");
}

export function practice(level: string | null, objectives: FallbackObjective[]): string {
  const lvl = (level ?? "current").toUpperCase();
  const targets = objectives.length
    ? objectives.map((o) => `- ${o.text ?? o.code ?? ""}`).join("\n")
    : "- Review the most recent lesson topics";
  return [
    `Practice plan (${lvl}, offline):`,
    targets,
    "",
    "1. Warm-up: repeat the target language from the last lesson aloud.",
    "2. Controlled practice: write 5 sentences using each target.",
    "3. Freer practice: describe your day using the targets.",
  ].join("\n");
}

export function quizQuestions(
  level: string | null,
  objectives: FallbackObjective[],
  count = 5,
): unknown[] {
  const lvl = (level ?? "current").toUpperCase();
  const stems = objectives.length
    ? objectives.map((o) => o.text ?? o.code ?? "the target language")
    : ["the target language"];
  const out: unknown[] = [];
  for (let i = 0; i < count; i++) {
    const stem = stems[i % stems.length];
    out.push({
      no: i + 1,
      type: i % 2 === 0 ? "multiple-choice" : "gap-fill",
      question: `Question ${i + 1} (${lvl}): use “${stem}” in a sentence.`,
      options: i % 2 === 0 ? ["A", "B", "C", "D"] : undefined,
      answer: "model answer (offline template)",
    });
  }
  return out;
}

export function assessmentTasks(level: string | null, objectives: FallbackObjective[]): unknown[] {
  const lvl = (level ?? "current").toUpperCase();
  const stems = objectives.length
    ? objectives.map((o) => o.text ?? o.code ?? "the target language")
    : ["the target language"];
  return [
    { task: 1, type: "reading", instruction: `Read a short ${lvl} text and answer 3 questions.` },
    { task: 2, type: "writing", instruction: `Write 4–6 sentences using: ${stems.join(", ")}.` },
    { task: 3, type: "speaking", instruction: `Talk for 1 minute about your week using ${stems[0] ?? "the target language"}.` },
  ];
}

export interface FallbackLesson {
  title?: string | null;
  code?: string | null;
  objectives?: FallbackObjective[];
}

export function lessonPlan(lesson: FallbackLesson): string {
  const title = lesson.title ?? lesson.code ?? "the lesson";
  const objectives = lesson.objectives?.length
    ? lesson.objectives.map((o) => `- ${o.text ?? o.code ?? ""}`).join("\n")
    : "- (add objectives in the curriculum editor)";
  return [
    `# Lesson plan — ${title}`,
    "",
    "## Objectives",
    objectives,
    "",
    "## Stages",
    "1. **Lead-in (5 min)** — activate prior knowledge with a short warmer.",
    "2. **Presentation (10 min)** — introduce the target language with examples.",
    "3. **Controlled practice (10 min)** — drill the target with support.",
    "4. **Freer practice (10 min)** — apply in a communicative task.",
    "5. **Wrap-up & feedback (5 min)** — recap and set homework.",
    "",
    "*(Offline template — configure an AI provider for a customised plan.)*",
  ].join("\n");
}

export function learnerHelp(prompt: string): string {
  const q = prompt.trim() || "your question";
  return [
    `You asked: “${q}”`,
    "",
    "A teacher will respond soon. Meanwhile:",
    "1. Check the lesson page for the topic you are working on.",
    "2. Review your latest homework and feedback.",
    "3. Try explaining the idea to a classmate in your own words.",
    "",
    "(This is an offline auto-reply; the AI assistant is not configured.)",
  ].join("\n");
}

export function lessonSummary(topic: string | null, lessonNo: number | null, date: string | null): string {
  const title = topic ?? "Today's lesson";
  const no = lessonNo != null ? ` (lesson ${lessonNo})` : "";
  const when = date ? ` on ${date}` : "";
  return `${title}${no}${when} covered the planned objectives with whole-class and pair activities. ` +
    "Students practised the target language and received feedback. " +
    "(Offline summary — generated without an AI provider.)";
}
