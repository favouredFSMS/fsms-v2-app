"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { saveAttendanceAction, type AttendanceActionState } from "@/lib/actions/attendance";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import type { AttendanceGridRow } from "@/lib/db/repos/attendance";

type Status = "present" | "absent" | "late";

interface Mark {
  status: Status;
  minutesLate: string;
  note: string;
}

const EMPTY: Mark = { status: "present", minutesLate: "", note: "" };

/**
 * Phase 14 bulk marking sheet. Local state per student, "mark all" quick
 * actions, single JSON submission (one RPC for the whole class).
 */
export function AttendanceSheet({
  classId,
  date,
  students,
}: {
  classId: string;
  date: string;
  students: AttendanceGridRow[];
}) {
  const [state, formAction, pending] = useActionState<AttendanceActionState | null, FormData>(
    saveAttendanceAction,
    null,
  );
  const router = useRouter();

  const [marks, setMarks] = useState<Record<string, Mark>>(() => {
    const init: Record<string, Mark> = {};
    for (const s of students) {
      init[s.id] = s.status
        ? { status: s.status, minutesLate: s.minutes_late != null ? String(s.minutes_late) : "", note: s.note ?? "" }
        : { ...EMPTY };
    }
    return init;
  });

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state?.ok, router]);

  const counts = useMemo(() => {
    let present = 0, absent = 0, late = 0;
    for (const id in marks) {
      if (marks[id].status === "present") present++;
      else if (marks[id].status === "absent") absent++;
      else late++;
    }
    return { present, absent, late };
  }, [marks]);

  const setAll = (status: Status) => {
    const next: Record<string, Mark> = {};
    for (const id in marks) next[id] = { ...marks[id], status };
    setMarks(next);
  };

  const patch = (id: string, part: Partial<Mark>) =>
    setMarks((m) => ({ ...m, [id]: { ...m[id], ...part } }));

  const serializedMarks = JSON.stringify(
    students.map((s) => ({
      studentId: s.id,
      status: marks[s.id]?.status ?? "present",
      minutesLate: marks[s.id]?.minutesLate ? Number(marks[s.id].minutesLate) : null,
      note: marks[s.id]?.note || null,
    })),
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="marks" value={serializedMarks} />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-ink-faint">
          {counts.present} present · {counts.absent} absent · {counts.late} late
        </span>
        <span className="ml-auto flex gap-2">
          <button type="button" onClick={() => setAll("present")} className="text-xs text-brand-700 hover:underline">
            All present
          </button>
          <button type="button" onClick={() => setAll("absent")} className="text-xs text-brand-700 hover:underline">
            All absent
          </button>
          <button type="button" onClick={() => setAll("late")} className="text-xs text-brand-700 hover:underline">
            All late
          </button>
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-muted">
              <th className="px-3 py-2">Student</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Minutes late</th>
              <th className="px-3 py-2">Note</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const m = marks[s.id] ?? EMPTY;
              return (
                <tr key={s.id} className="border-b border-line">
                  <td className="px-3 py-2">
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-ink-faint">{s.student_no}</div>
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      value={m.status}
                      onChange={(e) => patch(s.id, { status: e.target.value as Status })}
                      className="w-auto min-w-28"
                    >
                      <option value="present">present</option>
                      <option value="absent">absent</option>
                      <option value="late">late</option>
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min={0}
                      value={m.minutesLate}
                      onChange={(e) => patch(s.id, { minutesLate: e.target.value })}
                      disabled={m.status !== "late"}
                      className="w-24"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={m.note}
                      onChange={(e) => patch(s.id, { note: e.target.value })}
                      placeholder="optional"
                      className="w-full max-w-52"
                    />
                  </td>
                </tr>
              );
            })}
            {students.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-ink-faint">
                  No active students in this class.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {state && !state.ok && <FieldError>{state.message}</FieldError>}
      {state?.ok && (
        <p className="text-sm text-success-600">
          Saved {state.saved} mark{state.saved === 1 ? "" : "s"} for {date}.
        </p>
      )}
      <Button type="submit" loading={pending} className="self-start">
        Save attendance
      </Button>
    </form>
  );
}
