/**
 * Integration test for Phase 22 messaging & notifications against the local
 * PostgreSQL harness (skips when unreachable): threaded messaging lifecycle
 * (recipients → send → conversations → thread → reply → mark-read → delete),
 * recipient-scoped read denial, notification read state, preferences, seen
 * state and page activity. Cleans up after itself.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { fetchProfileFor } from "@/lib/auth/local-db";
import { PgAdapter } from "./pg-adapter";
import { CommsRepository } from "./repos/comms";
import type { DbContext } from "./context";

const dbUrl = process.env.LOCAL_DB_URL ?? "postgres://fsms:fsms_dev@127.0.0.1:5432/fsms_v2";

const SCHOOL = "00000000-0000-0000-0000-000000000001";
const OWNER = "00000000-0000-0000-0000-000000000201";
const TEACHER = "00000000-0000-0000-0000-000000000202";
const PARENT = "00000000-0000-0000-0000-000000000203";
const STUDENT = "00000000-0000-0000-0000-000000000204";

let reachable = false;
try {
  const c = new Client({ connectionString: dbUrl });
  await c.connect();
  await c.query("select 1");
  await c.end();
  reachable = true;
} catch {
  reachable = false;
}

async function ctxFor(sub: string): Promise<DbContext> {
  const profile = await fetchProfileFor(sub);
  if (!profile) throw new Error(`no profile for ${sub}`);
  return { profile, db: new PgAdapter(sub) };
}

async function exec(sql: string): Promise<void> {
  const c = new Client({ connectionString: dbUrl });
  await c.connect();
  try {
    await c.query(sql);
  } finally {
    await c.end();
  }
}

const cleanup = `
  delete from public.messages where school_id = '${SCHOOL}';
  delete from public.message_threads where school_id = '${SCHOOL}';
  delete from public.notifications where school_id = '${SCHOOL}';
  delete from public.email_outbox where school_id = '${SCHOOL}';
  delete from public.page_seen where user_id in ('${TEACHER}','${PARENT}','${STUDENT}');
  delete from public.notification_preferences where user_id in ('${TEACHER}','${PARENT}','${STUDENT}');
`;

describe.skipIf(!reachable)("comms (integration)", () => {
  beforeAll(async () => {
    await exec(cleanup);
  });
  afterAll(async () => {
    await exec(cleanup);
  });

  it("messaging lifecycle with recipient scoping", async () => {
    const teacher = new CommsRepository(await ctxFor(TEACHER));
    const parent = new CommsRepository(await ctxFor(PARENT));
    const student = new CommsRepository(await ctxFor(STUDENT));

    // recipients visible to a parent are staff only
    const parentRecips = await parent.recipients({});
    expect(parentRecips.ok && parentRecips.data.length).toBeGreaterThanOrEqual(1);
    if (parentRecips.ok) {
      const ids = parentRecips.data.map((r) => r.id);
      expect(ids).not.toContain(STUDENT); // students are not visible to parents
    }

    // teacher starts a thread with the parent
    const sent = await teacher.send({ to: [PARENT], subject: "IT-Welcome", body: "Hello from the integration test" });
    expect(sent.ok && sent.data?.thread_id).toBeTruthy();
    const tid = sent.ok ? sent.data!.thread_id : null;

    // parent sees it with unread=1
    const convs = await parent.conversations({});
    expect(convs.ok && convs.data.length).toBeGreaterThanOrEqual(1);
    if (convs.ok) {
      const mine = convs.data.find((c) => c.id === tid);
      expect(mine?.unread).toBe(1);
    }

    // parent receives an in-app notification
    const unread = await parent.notifUnreadCount();
    expect(unread.ok && unread.data?.unread).toBeGreaterThanOrEqual(1);

    // student (non-staff, non-participant) cannot read the thread
    const denied = await student.thread({ threadId: tid! });
    expect(denied.ok && denied.data).toBeNull();

    // parent replies
    const reply = await parent.reply({ threadId: tid!, body: "Thanks!" });
    expect(reply.ok && reply.data?.message_id).toBeTruthy();

    // teacher sees 2 messages
    const thread = await teacher.thread({ threadId: tid! });
    expect(thread.ok && thread.data?.messages.length).toBe(2);

    // mark read clears unread
    await parent.markThreadRead({ threadId: tid! });
    const unread2 = await parent.messageUnreadCount();
    expect(unread2.ok && unread2.data?.unread).toBe(0);

    // delete own message (parent deletes their reply)
    const msgId = reply.ok ? reply.data!.message_id : null;
    const del = await parent.deleteMessage({ messageId: msgId! });
    expect(del.ok && del.data?.id).toBe(msgId);
  });

  it("notification read state + preferences + seen state", async () => {
    const parent = new CommsRepository(await ctxFor(PARENT));

    const notifs = await parent.notifications({});
    expect(notifs.ok).toBe(true);

    const saved = await parent.savePrefs({ emailEnabled: false, inAppEnabled: true, kinds: null });
    expect(saved.ok && saved.data?.email_enabled).toBe(false);

    const seen = await parent.seenPage({ page: "messaging" });
    expect(seen.ok && seen.data?.page).toBe("messaging");

    const activity = await new CommsRepository(await ctxFor(TEACHER)).pageActivity({ page: "attendance" });
    expect(activity.ok && activity.data?.recorded).toBe(true);

    // activity feed is office-only; a teacher cannot read it
    const teacherFeed = await new CommsRepository(await ctxFor(TEACHER)).activities(10);
    expect(teacherFeed.ok && teacherFeed.data.length).toBe(0);

    const activities = await new CommsRepository(await ctxFor(OWNER)).activities(10);
    expect(activities.ok && activities.data.length).toBeGreaterThanOrEqual(1);
  });
});
