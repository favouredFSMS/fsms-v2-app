"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { aiAskAction, type AiActionState } from "@/lib/actions/ai";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, FieldError } from "@/components/ui/field";
import { Select, Input, Textarea } from "@/components/ui/input";
import type { PickOption } from "@/components/reports/report-picker";

const ACTIONS: { key: string; label: string }[] = [
  { key: "report", label: "studentReport" },
  { key: "remarks", label: "remarks" },
  { key: "atRisk", label: "atRisk" },
  { key: "practice", label: "practice" },
  { key: "learnerHelp", label: "learnerHelp" },
];

export function AskForm({ students, classes }: { students: PickOption[]; classes: PickOption[] }) {
  const [t, commonT] = [useTranslations("ai"), useTranslations("common")];
  const [state, formAction, pending] = useActionState<AiActionState | null, FormData>(aiAskAction, null);
  const [action, setAction] = useState("report");

  const needStudent = action === "report" || action === "remarks";
  const needClass = action === "atRisk";
  const needPrompt = action === "learnerHelp";

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={t("whatShouldIDo")}>
          <Select name="action" value={action} onChange={(e) => setAction(e.target.value)}>
            {ACTIONS.map((a) => (
              <option key={a.key} value={a.key}>
                {t(a.label)}
              </option>
            ))}
          </Select>
        </Field>
        {needStudent && (
          <Field label={commonT("student")}>
            <Select name="studentId" defaultValue="">
              <option value="">{t("chooseStudent")}</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {needClass && (
          <Field label={commonT("class")}>
            <Select name="classId" defaultValue="">
              <option value="">{t("chooseClass")}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {action === "remarks" && (
          <Field label={commonT("subject")}>
            <Input name="subject" placeholder="e.g. Grammar" />
          </Field>
        )}
        {action === "practice" && (
          <Field label={commonT("level")}>
            <Select name="level" defaultValue="">
              <option value="">{t("anyLevel")}</option>
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
        <Field label={t("yourQuestion")}>
          <Textarea name="prompt" rows={2} placeholder={t("askPlaceholder")} />
        </Field>
      )}
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? t("thinking") : t("run")}
        </Button>
      </div>
      {state?.ok && (
        <div className="rounded-lg border border-ink-200 bg-ink-50 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant={state.status === "fallback" ? "warning" : state.status === "error" ? "danger" : "success"}>
              {state.status === "fallback" ? t("offlineFallback") : state.status}
            </Badge>
            <span className="text-xs text-ink-500">{t("via")} {state.provider}</span>
          </div>
          {state.message && <p className="mb-2 text-xs text-warning-700">{state.message}</p>}
          <pre className="whitespace-pre-wrap font-sans text-sm text-ink-800">{state.text}</pre>
        </div>
      )}
    </form>
  );
}
