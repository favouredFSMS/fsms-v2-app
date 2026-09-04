import { describe, expect, it } from "vitest";
import { CommsRepository } from "./comms";
import { fakeAdapter } from "../testing/fake-adapter";
import type { DbContext } from "../context";
import type { AuthProfile } from "@/lib/auth/types";

const profile = (over: Partial<AuthProfile> = {}): AuthProfile => ({
  id: "u1",
  school_id: "s1",
  email: null,
  name: null,
  role_id: null,
  role_base: "teacher",
  role_key: "teacher",
  role_label: "Teacher",
  rank: 40,
  locale: "en",
  notify_lang: "en",
  status: "active",
  must_change_password: false,
  linked_ids: [],
  permissions: ["messageConversations", "messageThread", "messageRecipients", "sendMessage", "replyMessage", "deleteMessage", "markMessageRead", "notifications", "markNotifRead", "seenPage", "pageActivity"],
  ...over,
});

const ctx = (adapter: ReturnType<typeof fakeAdapter>, p = profile()): DbContext => ({ profile: p, db: adapter });

const THREAD = "00000000-0000-0000-0000-000000000501";
const U2 = "00000000-0000-0000-0000-000000000202";

describe("CommsRepository", () => {
  it("send serialises recipients as {id} objects", async () => {
    let fn = "";
    let args: Record<string, unknown> | undefined;
    const adapter = fakeAdapter({
      async rpc<T>(n: string, a?: Record<string, unknown>) {
        fn = n;
        args = a;
        return { data: { thread_id: "t1", message_id: "m1", subject: "Hi" } as T, error: null };
      },
    });
    const res = await new CommsRepository(ctx(adapter)).send({ to: [U2], subject: "Hi", body: "Hello" });
    expect(res.ok).toBe(true);
    expect(fn).toBe("send_message");
    expect(args).toEqual({
      p_thread: null,
      p_to: JSON.stringify([{ id: U2 }]),
      p_subject: "Hi",
      p_body: "Hello",
    });
  });

  it("reply passes thread + body", async () => {
    let args: Record<string, unknown> | undefined;
    const adapter = fakeAdapter({
      async rpc<T>(_n: string, a?: Record<string, unknown>) {
        args = a;
        return { data: null as T, error: null };
      },
    });
    await new CommsRepository(ctx(adapter)).reply({ threadId: THREAD, body: "ok" });
    expect(args).toEqual({ p_thread: THREAD, p_body: "ok" });
  });

  it("savePrefs serialises kinds as jsonb string", async () => {
    let args: Record<string, unknown> | undefined;
    const adapter = fakeAdapter({
      async rpc<T>(_n: string, a?: Record<string, unknown>) {
        args = a;
        return { data: null as T, error: null };
      },
    });
    await new CommsRepository(ctx(adapter)).savePrefs({
      emailEnabled: false,
      inAppEnabled: true,
      kinds: { message: { email: false } },
    });
    expect(args).toEqual({
      p_email_enabled: false,
      p_in_app_enabled: true,
      p_kinds: JSON.stringify({ message: { email: false } }),
    });
  });

  it("empty body is rejected at the schema layer", async () => {
    const res = await new CommsRepository(ctx(fakeAdapter())).send({ to: [U2], body: "   " });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("invalid_input");
  });

  it("markAllNotifsRead calls the right RPC", async () => {
    let fn = "";
    const adapter = fakeAdapter({
      async rpc<T>(n: string) {
        fn = n;
        return { data: { updated: 2 } as T, error: null };
      },
    });
    const res = await new CommsRepository(ctx(adapter)).markAllNotifsRead();
    expect(res.ok).toBe(true);
    expect(fn).toBe("mark_all_notifs_read");
  });
});
