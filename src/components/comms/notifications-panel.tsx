"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markNotifReadAction, markAllNotifsReadAction } from "@/lib/actions/comms";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { NotificationItem } from "@/lib/db";

const KIND_LABEL: Record<string, string> = {
  message: "New message",
  "language-prompt": "Language reminder",
  homework: "Homework",
  attendance: "Attendance",
};

export function NotificationsPanel({ items }: { items: NotificationItem[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function markRead(id: string) {
    start(async () => {
      await markNotifReadAction(id);
      router.refresh();
    });
  }

  function markAll() {
    start(async () => {
      await markAllNotifsReadAction();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button variant="secondary" size="sm" onClick={markAll} disabled={pending || items.every((i) => i.read_at)}>
          Mark all read
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-500">No notifications.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((n) => (
            <div
              key={n.id}
              className={`flex items-start justify-between gap-2 rounded-lg border px-3 py-2 ${
                n.read_at ? "border-ink-200 bg-white" : "border-brand-200 bg-brand-50"
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink-900">{KIND_LABEL[n.kind ?? ""] ?? n.kind}</span>
                  {!n.read_at && <Badge variant="brand">unread</Badge>}
                </div>
                {n.payload?.subject ? (
                  <p className="text-sm text-ink-700">{String(n.payload.subject)}</p>
                ) : n.payload?.message ? (
                  <p className="text-sm text-ink-700">{String(n.payload.message)}</p>
                ) : null}
                <p className="text-xs text-ink-400">{n.created_at ? new Date(n.created_at).toLocaleString() : ""}</p>
              </div>
              {!n.read_at && (
                <Button variant="ghost" size="sm" onClick={() => markRead(n.id)} disabled={pending}>
                  Mark read
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
