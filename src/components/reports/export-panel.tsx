"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  requestExportAction,
  processExportsAction,
  getExportCsvAction,
  type ReportingActionState,
} from "@/lib/actions/reporting";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, FieldError } from "@/components/ui/field";
import { Select, Input } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR, TableEmptyRow } from "@/components/ui/table";
import type { ReportExportJob } from "@/lib/db";
import type { PickOption } from "./report-picker";

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

/**
 * Async export queue panel (Phase 20). Requesting a CSV only enqueues a job;
 * an office-role user then runs the worker, and the payload is downloaded from
 * the browser — heavy generation never blocks a request.
 */
export function ExportPanel({
  canProcess,
  classes,
  teachers,
  jobs,
}: {
  canProcess: boolean;
  classes: PickOption[];
  teachers: PickOption[];
  jobs: ReportExportJob[];
}) {
  const [t, st, commonT] = [useTranslations("reports"), useTranslations("status"), useTranslations("common")];
  const router = useRouter();
  const [kind, setKind] = useState("attendance");
  const [requestState, requestAction, requesting] = useActionState<ReportingActionState | null, FormData>(
    requestExportAction,
    null,
  );
  const [processing, startProcess] = useTransition();
  const [processMsg, setProcessMsg] = useState<ReportingActionState | null>(null);
  const [downloading, startDownload] = useTransition();
  const [dlMsg, setDlMsg] = useState<string | null>(null);

  const kindLabel = (k: string): string => {
    switch (k) {
      case "attendance":
        return t("attendanceCsv");
      case "assessment":
        return t("assessmentsCsv");
      case "learner-progress":
        return t("learnerProgressCsv");
      case "class-earnings":
        return t("classEarningsCsv");
      case "salary":
        return t("salaryCsv");
      default:
        return k;
    }
  };

  function runProcess() {
    startProcess(async () => {
      const res = await processExportsAction();
      setProcessMsg(res);
      router.refresh();
    });
  }

  function download(jobId: string, kind: string) {
    setDlMsg(null);
    startDownload(async () => {
      const res = await getExportCsvAction(jobId);
      if (!res.ok) {
        setDlMsg(res.message);
        return;
      }
      const blob = new Blob(["\uFEFF" + res.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDlMsg(kindLabel(kind));
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <form action={requestAction} className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t("exportType")}>
            <Select name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
              {["attendance", "assessment", "learner-progress", "class-earnings", "salary"].map((k) => (
                <option key={k} value={k}>
                  {kindLabel(k)}
                </option>
              ))}
            </Select>
          </Field>
          {(kind === "attendance" || kind === "assessment" || kind === "learner-progress") && (
            <Field label={commonT("class")}>
              <Select name="classId" defaultValue="">
                <option value="">{t("allClasses")}</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {kind === "salary" && (
            <Field label={commonT("teacher")}>
              <Select name="userId" defaultValue="">
                <option value="">{t("allTeachers")}</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {kind === "salary" && (
            <Field label={commonT("month")}>
              <Input type="month" name="month" />
            </Field>
          )}
        </div>
        {requestState && !requestState.ok && <FieldError>{requestState.message}</FieldError>}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={requesting}>
            {requesting ? t("queuing") : t("requestExport")}
          </Button>
          {canProcess && (
            <Button type="button" variant="secondary" disabled={processing} onClick={runProcess}>
              {processing ? t("processing") : t("processQueue")}
            </Button>
          )}
          {processMsg && !processMsg.ok && <span className="text-sm text-danger-600">{processMsg.message}</span>}
          {processMsg?.ok && <span className="text-sm text-success-700">{processMsg.message}</span>}
        </div>
      </form>

      {dlMsg && <p className="text-sm text-ink-500">{t("downloaded", { kind: dlMsg })}</p>}

      <Table>
        <THead>
          <TR>
            <TH>{t("type")}</TH>
            <TH>{t("requestedBy")}</TH>
            <TH>{commonT("status")}</TH>
            <TH>{t("requested")}</TH>
            <TH>{t("completed")}</TH>
            <TH>{t("action")}</TH>
          </TR>
        </THead>
        <TBody>
          {jobs.length === 0 ? (
            <TableEmptyRow colSpan={6}>{t("noExportJobs")}</TableEmptyRow>
          ) : (
            jobs.map((j) => (
              <TR key={j.id}>
                <TD>{kindLabel(j.kind)}</TD>
                <TD>{j.requested_by_name ?? "—"}</TD>
                <TD>
                  <Badge
                    variant={j.status === "ready" ? "success" : j.status === "failed" ? "danger" : "neutral"}
                  >
                    {st.has(j.status) ? st(j.status) : j.status}
                  </Badge>
                  {j.error ? <span className="ml-2 text-xs text-danger-600">{j.error}</span> : null}
                </TD>
                <TD>{fmt(j.created_at)}</TD>
                <TD>{fmt(j.completed_at)}</TD>
                <TD>
                  {j.status === "ready" ? (
                    <Button size="sm" variant="secondary" disabled={downloading} onClick={() => download(j.id, j.kind)}>
                      {t("downloadCsv")}
                    </Button>
                  ) : null}
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>
      <p className="text-xs text-ink-500">{t("exportNote")}</p>
      <button type="button" hidden onClick={() => router.refresh()} aria-label="refresh" />
    </div>
  );
}
