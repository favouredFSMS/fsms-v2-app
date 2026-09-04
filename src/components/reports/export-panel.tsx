"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { Table, TBody, TD, TH, THead, TR, TableEmpty } from "@/components/ui/table";
import type { ReportExportJob } from "@/lib/db";
import type { PickOption } from "./report-picker";

const EXPORT_KIND_LABEL: Record<string, string> = {
  attendance: "Attendance (CSV)",
  assessment: "Assessments (CSV)",
  "learner-progress": "Learner progress (CSV)",
  "class-earnings": "Class earnings (CSV)",
  salary: "Salary history (CSV)",
};

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
      setDlMsg(kind);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <form action={requestAction} className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Export type">
            <Select name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
              {Object.entries(EXPORT_KIND_LABEL).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          {(kind === "attendance" || kind === "assessment" || kind === "learner-progress") && (
            <Field label="Class">
              <Select name="classId" defaultValue="">
                <option value="">All classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {kind === "salary" && (
            <Field label="Teacher">
              <Select name="userId" defaultValue="">
                <option value="">All teachers</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {kind === "salary" && (
            <Field label="Month">
              <Input type="month" name="month" />
            </Field>
          )}
        </div>
        {requestState && !requestState.ok && <FieldError>{requestState.message}</FieldError>}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={requesting}>
            {requesting ? "Queuing…" : "Request export"}
          </Button>
          {canProcess && (
            <Button type="button" variant="secondary" disabled={processing} onClick={runProcess}>
              {processing ? "Processing…" : "Process queue (office)"}
            </Button>
          )}
          {processMsg && !processMsg.ok && <span className="text-sm text-danger-600">{processMsg.message}</span>}
          {processMsg?.ok && <span className="text-sm text-success-700">{processMsg.message}</span>}
        </div>
      </form>

      {dlMsg && <p className="text-sm text-ink-500">Downloaded {dlMsg}.</p>}

      <Table>
        <THead>
          <TR>
            <TH>Type</TH>
            <TH>Requested by</TH>
            <TH>Status</TH>
            <TH>Requested</TH>
            <TH>Completed</TH>
            <TH>Action</TH>
          </TR>
        </THead>
        <TBody>
          {jobs.length === 0 ? (
            <TableEmpty colSpan={6}>No export jobs yet.</TableEmpty>
          ) : (
            jobs.map((j) => (
              <TR key={j.id}>
                <TD>{EXPORT_KIND_LABEL[j.kind] ?? j.kind}</TD>
                <TD>{j.requested_by_name ?? "—"}</TD>
                <TD>
                  <Badge
                    variant={j.status === "ready" ? "success" : j.status === "failed" ? "danger" : "neutral"}
                  >
                    {j.status}
                  </Badge>
                  {j.error ? <span className="ml-2 text-xs text-danger-600">{j.error}</span> : null}
                </TD>
                <TD>{fmt(j.created_at)}</TD>
                <TD>{fmt(j.completed_at)}</TD>
                <TD>
                  {j.status === "ready" ? (
                    <Button size="sm" variant="secondary" disabled={downloading} onClick={() => download(j.id, j.kind)}>
                      Download CSV
                    </Button>
                  ) : null}
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>
      <p className="text-xs text-ink-500">
        Queued jobs sit in <code>report_exports</code> and are converted to CSV by an office-role
        worker. Download the result any time afterwards.
      </p>
      <button type="button" hidden onClick={() => router.refresh()} aria-label="refresh" />
    </div>
  );
}
