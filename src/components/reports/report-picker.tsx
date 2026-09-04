"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ButtonLink } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select, Input } from "@/components/ui/input";

export interface PickOption {
  id: string;
  name: string;
}

export interface ReportPickerProps {
  reports: { key: string; label: string }[];
  selected: string;
  classes: PickOption[];
  students: PickOption[];
  teachers: PickOption[];
  classId?: string;
  studentId?: string;
  teacherId?: string;
  from?: string;
  to?: string;
  level?: string;
  month?: string;
  showClass: boolean;
  showStudent: boolean;
  showTeacher: boolean;
  showPeriod: boolean;
  showLevel: boolean;
  showMonth: boolean;
}

/**
 * Report hub selector (Phase 20). A row of report-type links plus the target
 * pickers relevant to the selected report. Uses the URL search params so every
 * report is deep-linkable and server-rendered.
 */
export function ReportPicker(props: ReportPickerProps) {
  const [t, commonT] = [useTranslations("reports"), useTranslations("common")];
  const router = useRouter();
  const params = useSearchParams();

  function patch(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(params.toString());
    next.set("report", props.selected);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    router.replace(`/reports?${next.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {props.reports.map((r) => (
          <ButtonLink
            key={r.key}
            href={`/reports?report=${r.key}`}
            variant={r.key === props.selected ? "primary" : "secondary"}
            size="sm"
          >
            {r.label}
          </ButtonLink>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {props.showClass && (
          <Field label={commonT("class")}>
            <Select
              value={props.classId ?? ""}
              onChange={(e) => patch({ class: e.target.value || undefined })}
            >
              <option value="">{t("allClasses")}</option>
              {props.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {props.showStudent && (
          <Field label={commonT("student")}>
            <Select
              value={props.studentId ?? ""}
              onChange={(e) => patch({ student: e.target.value || undefined })}
            >
              <option value="">{t("chooseStudent")}</option>
              {props.students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {props.showTeacher && (
          <Field label={commonT("teacher")}>
            <Select
              value={props.teacherId ?? ""}
              onChange={(e) => patch({ teacher: e.target.value || undefined })}
            >
              <option value="">{t("me")}</option>
              {props.teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {props.showLevel && (
          <Field label={commonT("level")}>
            <Select
              value={props.level ?? ""}
              onChange={(e) => patch({ level: e.target.value || undefined })}
            >
              <option value="">{t("allLevels")}</option>
              {["a1", "a2", "b1", "b2", "c1", "c2"].map((l) => (
                <option key={l} value={l}>
                  {l.toUpperCase()}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {props.showPeriod && (
          <>
            <Field label={commonT("from")}>
              <Input
                type="date"
                value={props.from ?? ""}
                onChange={(e) => patch({ from: e.target.value || undefined })}
              />
            </Field>
            <Field label={commonT("to")}>
              <Input
                type="date"
                value={props.to ?? ""}
                onChange={(e) => patch({ to: e.target.value || undefined })}
              />
            </Field>
          </>
        )}
        {props.showMonth && (
          <Field label={commonT("month")}>
            <Input
              type="month"
              value={props.month ?? ""}
              onChange={(e) => patch({ month: e.target.value || undefined })}
            />
          </Field>
        )}
      </div>
    </div>
  );
}
