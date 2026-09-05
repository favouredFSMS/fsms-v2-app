import { describe, expect, it } from "vitest";
import {
  studentReportNarrative,
  remarks,
  atRiskList,
  practice,
  quizQuestions,
  assessmentTasks,
  lessonPlan,
  learnerHelp,
  lessonSummary,
  type FallbackStudent,
  type FallbackAtRiskRow,
} from "./fallback";
import {
  studentReportPrompt,
  remarksPrompt,
  atRiskPrompt,
  practicePrompt,
  quizPrompt,
} from "./prompts";

describe("AI Fallbacks", () => {
  it("generates student report narrative with attendance and assessments", () => {
    const student: FallbackStudent = {
      name: "Alex",
      level_code: "B1",
      academic_status: "active",
      attendance: { present: 10, late: 1, absent: 1, rate: 83 },
      assessments: { count: 3, avg_score: 88 },
      evidence: { count: 2, avg_score: 90 },
    };
    const res = studentReportNarrative(student);
    expect(res).toContain("Alex is currently working at level B1.");
    expect(res).toContain("Attendance stands at 83%");
    expect(res).toContain("average score is 88");
  });

  it("generates remarks for a student and subject", () => {
    const res = remarks("Anna", "English Literature");
    expect(res).toContain("Anna engages well in English Literature");
  });

  it("flags at-risk students based on TD-2 rules (<80% attendance or <60 assessment avg)", () => {
    const rows: FallbackAtRiskRow[] = [
      { id: "1", name: "Safe Student", attendance_rate: 95, assessment_avg: 85 },
      { id: "2", name: "Low Attendance", attendance_rate: 75, assessment_avg: 80 },
      { id: "3", name: "Low Score", attendance_rate: 90, assessment_avg: 55 },
      { id: "4", name: "Both Low", attendance_rate: 70, assessment_avg: 50 },
    ];
    const res = atRiskList(rows);
    expect(res).toContain("Low Attendance: attendance 75%");
    expect(res).toContain("Low Score: assessment average 55");
    expect(res).toContain("Both Low: attendance 70%, assessment average 50");
    expect(res).not.toContain("Safe Student");
  });

  it("handles empty at-risk roster cleanly", () => {
    const rows: FallbackAtRiskRow[] = [
      { id: "1", name: "All Good", attendance_rate: 100, assessment_avg: 100 },
    ];
    const res = atRiskList(rows);
    expect(res).toContain("No students are currently flagged as at risk");
  });

  it("generates structured practice, quiz, and assessment tasks", () => {
    const objectives = [{ code: "OBJ-1", text: "Past Simple tense" }];
    const prac = practice("A2", objectives);
    expect(prac).toContain("Past Simple tense");

    const quiz = quizQuestions("A2", objectives, 3);
    expect(quiz.length).toBe(3);

    const tasks = assessmentTasks("A2", objectives);
    expect(tasks.length).toBe(3);
  });

  it("generates lesson plan and learner help", () => {
    const plan = lessonPlan({ title: "Grammar Basics", objectives: [{ code: "O1", text: "Verbs" }] });
    expect(plan).toContain("Lesson plan — Grammar Basics");
    expect(plan).toContain("Verbs");

    const help = learnerHelp("How to form questions?");
    expect(help).toContain("How to form questions?");

    const sum = lessonSummary("Vocabulary", 5, "2026-09-05");
    expect(sum).toContain("Vocabulary (lesson 5) on 2026-09-05");
  });
});

describe("AI Prompts", () => {
  it("builds consistent prompt templates matching data shapes", () => {
    const sPrompt = studentReportPrompt({ name: "Elena", level_code: "A1", academic_status: "active" });
    expect(sPrompt).toContain("Elena");

    const rPrompt = remarksPrompt("Ivan", "Math");
    expect(rPrompt).toContain("Ivan");
    expect(rPrompt).toContain("Math");

    const arPrompt = atRiskPrompt([{ id: "1", name: "Boris", attendance_rate: 70, assessment_avg: 50 }]);
    expect(arPrompt).toContain("Boris");

    const pPrompt = practicePrompt("B2", [{ code: "T1", text: "Conditionals" }]);
    expect(pPrompt).toContain("Conditionals");

    const qPrompt = quizPrompt("B2", [{ code: "T1", text: "Conditionals" }], 4);
    expect(qPrompt).toContain("Generate 4 quiz questions");
  });
});
