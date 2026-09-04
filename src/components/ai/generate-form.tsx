"use client";

import { useActionState, useState } from "react";
import { aiGenerateAction, type AiActionState } from "@/lib/actions/ai";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, FieldError } from "@/components/ui/field";
import { Select, Input } from "@/components/ui/input";

const KINDS: { key: string; label: string }[] = [
  { key: "quiz", label: "Quiz questions (JSON)" },
  { key: "assessmentTasks", label: "Assessment tasks (JSON)" },
  { key: "lessonPlan", label: "Lesson plan (Markdown)" },
];

export function GenerateForm() {
  const [state, formAction, pending] = useActionState<AiActionState | null, FormData>(aiGenerateAction, null);
  const [kind, setKind] = useState("quiz");

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Generate">
          <Select name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map((k) => (
              <option key={k.key} value={k.key}>
                {k.label}
              </option>
            ))}
          </Select>
        </Field>
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
        {kind === "quiz" && (
          <Field label="Questions">
            <Input type="number" name="count" defaultValue={5} min={1} max={20} />
          </Field>
        )}
        {kind === "lessonPlan" && (
          <Field label="Lesson (optional)">
            <Input name="lessonId" placeholder="lesson id — uses level targets if empty" />
          </Field>
        )}
      </div>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Generating…" : "Generate"}
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
