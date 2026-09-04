"use client";

import { useActionState, useState } from "react";
import { aiAskAction, type AiActionState } from "@/lib/actions/ai";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, FieldError } from "@/components/ui/field";
import { Select, Input, Textarea } from "@/components/ui/input";
import type { PickOption } from "@/components/reports/report-picker";

const ACTIONS: { key: string; label: string }[] = [
  { key: "report", label: "Student report" },
  { key: "remarks", label: "Remarks" },
  { key: "atRisk", label: "At-risk check" },
  { key: "practice", label: "Practice plan" },
  { key: "learnerHelp", label: "Learner help" },
];

export function AskForm({ students, classes }: { students: PickOption[]; classes: PickOption[] }) {
  const [state, formAction, pending] = useActionState<AiActionState | null, FormData>(aiAskAction, null);
  const [action, setAction] = useState("report");

  const needStudent = action === "report" || action === "remarks";
  const needClass = action === "atRisk";
  const needPrompt = action === "learnerHelp";

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="What should I do?">
          <Select name="action" value={action} onChange={(e) => setAction(e.target.value)}>
            {ACTIONS.map((a) => (
              <option key={a.key} value={a.key}>
                {a.label}
              </option>
            ))}
          </Select>
        </Field>
        {needStudent && (
          <Field label="Student">
            <Select name="studentId" defaultValue="">
              <option value="">Choose a student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {needClass && (
          <Field label="Class">
            <Select name="classId" defaultValue="">
              <option value="">Choose a class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {action === "remarks" && (
          <Field label="Subject">
            <Input name="subject" placeholder="e.g. Grammar" />
          </Field>
        )}
        {action === "practice" && (
          <Field label="Level">
            <Select name="level" defaultValue="">
              <option value="">Any level</option>
              {["a1", "a2", "b1", "b2", "c1", "c2"].map((l) => (
                <option key={l} value={l}>
                  {l.toUpperCase()}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>
      {needPrompt && (
        <Field label="Your question">
          <Textarea name="prompt" rows={2} placeholder="Ask the assistant a question…" />
        </Field>
      )}
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Thinking…" : "Run"}
        </Button>
      </div>
      {state?.ok && (
        <div className="rounded-lg border border-ink-200 bg-ink-50 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant={state.status === "fallback" ? "warning" : state.status === "error" ? "danger" : "success"}>
              {state.status === "fallback" ? "offline fallback" : state.status}
            </Badge>
            <span className="text-xs text-ink-500">via {state.provider}</span>
          </div>
          {state.message && <p className="mb-2 text-xs text-warning-700">{state.message}</p>}
          <pre className="whitespace-pre-wrap font-sans text-sm text-ink-800">{state.text}</pre>
        </div>
      )}
    </form>
  );
}
