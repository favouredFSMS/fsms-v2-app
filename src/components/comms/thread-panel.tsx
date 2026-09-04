"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { sendMessageAction, deleteMessageAction, markThreadReadAction, type CommsActionState } from "@/lib/actions/comms";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import type { MessageThread } from "@/lib/db";

export function ThreadPanel({ thread, profileId }: { thread: MessageThread; profileId: string }) {
  const [sendState, sendAction, sending] = useActionState<CommsActionState | null, FormData>(
    sendMessageAction,
    null,
  );
  const [delState, delAction, deleting] = useActionState<CommsActionState | null, FormData>(
    deleteMessageAction,
    null,
  );
  const router = useRouter();
  const replyRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (sendState?.ok) replyRef.current?.reset();
    router.refresh();
  }, [sendState?.ok, router]);

  // Mark the thread read once it is open.
  useEffect(() => {
    if (thread.thread) void markThreadReadAction(thread.thread.id);
  }, [thread.thread]);

  const names = thread.participants.map((p) => p.name ?? "…").join(", ");

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-ink-200 bg-ink-50 px-3 py-2">
        <div className="text-sm font-medium text-ink-900">{thread.thread?.subject || "(no subject)"}</div>
        <div className="text-xs text-ink-500">{names}</div>
      </div>

      <div className="flex flex-col gap-2">
        {thread.messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col gap-1 rounded-lg border px-3 py-2 ${
              m.from_id === profileId ? "ml-8 border-brand-200 bg-brand-50" : "mr-8 border-ink-200 bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink-700">{m.from_name ?? "Unknown"}</span>
              <span className="text-xs text-ink-400">{m.created_at ? new Date(m.created_at).toLocaleString() : ""}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-ink-800">{m.body}</p>
            {m.from_id === profileId && (
              <form action={delAction} className="self-end">
                <input type="hidden" name="messageId" value={m.id} />
                <Button type="submit" variant="ghost" size="sm" disabled={deleting}>
                  Delete
                </Button>
              </form>
            )}
          </div>
        ))}
      </div>

      <form ref={replyRef} action={sendAction} className="flex flex-col gap-2">
        <input type="hidden" name="threadId" value={thread.thread?.id ?? ""} />
        <Textarea name="body" rows={2} required placeholder="Reply…" />
        {(sendState && !sendState.ok) || (delState && !delState.ok) ? (
          <FieldError>{sendState?.message ?? delState?.message}</FieldError>
        ) : null}
        <div>
          <Button type="submit" disabled={sending}>
            {sending ? "Sending…" : "Reply"}
          </Button>
        </div>
      </form>
    </div>
  );
}
