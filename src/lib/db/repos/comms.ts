import { Repository } from "../repository";
import { parseOrFail } from "../validate";
import { fail, ok, type ServiceResult } from "../errors";
import {
  messageRecipientsSchema,
  messageConversationsSchema,
  messageThreadSchema,
  sendMessageSchema,
  replyMessageSchema,
  deleteMessageSchema,
  markThreadReadSchema,
  notificationsListSchema,
  markNotifReadSchema,
  seenPageSchema,
  pageActivitySchema,
  saveNotificationPrefsSchema,
  type MessageRecipientsInput,
  type MessageConversationsInput,
  type SendMessageInput,
  type ReplyMessageInput,
  type NotificationsListInput,
  type SeenPageInput,
  type PageActivityInput,
  type SaveNotificationPrefsInput,
} from "@/lib/schemas/comms";

/**
 * FSMS V2 — CommsRepository (Phase 22).
 *
 * Threaded messaging (F13.1) + notifications/preferences/seen-state (F13.2)
 * over the comms tables from 0010/0013. Every RPC is SECURITY DEFINER and
 * re-checks recipient scoping; the repository pre-checks RBAC (all roles have
 * these actions, so the gate is effectively the RPC's recipient scope).
 */

// ── messaging ────────────────────────────────────────────────────────────────

export interface MessageRecipient {
  id: string;
  name: string | null;
  role_label: string | null;
}

export interface MessageConversation {
  id: string;
  subject: string | null;
  created_at: string;
  last_message: { body: string | null; from_name: string | null; created_at: string } | null;
  unread: number;
  participants: string[];
  last_at: string | null;
}

export interface MessageThreadParticipant {
  id: string;
  name: string | null;
  role_label: string | null;
}

export interface MessageItem {
  id: string;
  from_id: string | null;
  from_name: string | null;
  body: string | null;
  created_at: string;
}

export interface MessageThread {
  thread: { id: string; subject: string | null; created_at: string } | null;
  participants: MessageThreadParticipant[];
  messages: MessageItem[];
}

export interface SentMessage {
  thread_id: string;
  message_id: string;
  subject: string | null;
}

// ── notifications ────────────────────────────────────────────────────────────

export interface NotificationItem {
  id: string;
  kind: string | null;
  payload: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationPrefs {
  email_enabled: boolean;
  in_app_enabled: boolean;
  kinds: Record<string, Record<string, boolean>>;
  notify_lang: string | null;
}

export interface PageSeenResult {
  page: string;
  seen_at: string;
  recorded?: boolean;
}

export interface ActivityItem {
  id: string;
  type: string;
  text: Record<string, unknown> | null;
  actor_name: string | null;
  ref_id: string | null;
  created_at: string;
}

export class CommsRepository extends Repository {
  // ── messaging ──────────────────────────────────────────────────────────────

  async recipients(input: unknown): Promise<ServiceResult<MessageRecipient[]>> {
    const parsed = parseOrFail(messageRecipientsSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("messageRecipients");
    if (denied) return fail(denied);
    const f: MessageRecipientsInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<{ rows: MessageRecipient[] } | null>("message_recipients", {
      p_search: f.search ?? null,
      p_page_size: f.pageSize,
      p_cursor: f.cursor ?? null,
    });
    if (error) return fail(error);
    return ok((data as { rows: MessageRecipient[] } | null)?.rows ?? []);
  }

  async conversations(input: unknown): Promise<ServiceResult<MessageConversation[]>> {
    const parsed = parseOrFail(messageConversationsSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("messageConversations");
    if (denied) return fail(denied);
    const f: MessageConversationsInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<{ rows: MessageConversation[] } | null>("message_conversations", {
      p_page_size: f.pageSize,
      p_cursor: f.cursor ?? null,
    });
    if (error) return fail(error);
    return ok((data as { rows: MessageConversation[] } | null)?.rows ?? []);
  }

  async thread(input: unknown): Promise<ServiceResult<MessageThread | null>> {
    const parsed = parseOrFail(messageThreadSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("messageThread");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<MessageThread | null>("message_thread", {
      p_thread: parsed.data.threadId,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async send(input: unknown): Promise<ServiceResult<SentMessage | null>> {
    const parsed = parseOrFail(sendMessageSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("sendMessage");
    if (denied) return fail(denied);
    const f: SendMessageInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<SentMessage | null>("send_message", {
      p_thread: f.threadId ?? null,
      p_to: f.to && f.to.length ? JSON.stringify(f.to.map((id) => ({ id }))) : null,
      p_subject: f.subject ?? null,
      p_body: f.body,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async reply(input: unknown): Promise<ServiceResult<SentMessage | null>> {
    const parsed = parseOrFail(replyMessageSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("replyMessage");
    if (denied) return fail(denied);
    const f: ReplyMessageInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<SentMessage | null>("reply_message", {
      p_thread: f.threadId,
      p_body: f.body,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async deleteMessage(input: unknown): Promise<ServiceResult<{ id: string } | null>> {
    const parsed = parseOrFail(deleteMessageSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("deleteMessage");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<{ id: string } | null>("delete_message", {
      p_message: parsed.data.messageId,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async markThreadRead(input: unknown): Promise<ServiceResult<{ updated: number } | null>> {
    const parsed = parseOrFail(markThreadReadSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("markMessageRead");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<{ updated: number } | null>("mark_message_read", {
      p_thread: parsed.data.threadId,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async messageUnreadCount(): Promise<ServiceResult<{ unread: number } | null>> {
    const { data, error } = await this.ctx.db.rpc<{ unread: number } | null>("message_unread_count", {});
    if (error) return fail(error);
    return ok(data);
  }

  // ── notifications ──────────────────────────────────────────────────────────

  async notifications(input: unknown): Promise<ServiceResult<NotificationItem[]>> {
    const parsed = parseOrFail(notificationsListSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("notifications");
    if (denied) return fail(denied);
    const f: NotificationsListInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<{ rows: NotificationItem[] } | null>("notifications_list", {
      p_page_size: f.pageSize,
      p_cursor: f.cursor ?? null,
    });
    if (error) return fail(error);
    return ok((data as { rows: NotificationItem[] } | null)?.rows ?? []);
  }

  async markNotifRead(input: unknown): Promise<ServiceResult<{ updated: number } | null>> {
    const parsed = parseOrFail(markNotifReadSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("markNotifRead");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<{ updated: number } | null>("mark_notif_read", {
      p_notif: parsed.data.notifId,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async markAllNotifsRead(): Promise<ServiceResult<{ updated: number } | null>> {
    const denied = this.can("markNotifRead");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<{ updated: number } | null>("mark_all_notifs_read", {});
    if (error) return fail(error);
    return ok(data);
  }

  async notifUnreadCount(): Promise<ServiceResult<{ unread: number } | null>> {
    const { data, error } = await this.ctx.db.rpc<{ unread: number } | null>("notification_unread_count", {});
    if (error) return fail(error);
    return ok(data);
  }

  async prefs(): Promise<ServiceResult<NotificationPrefs | null>> {
    const { data, error } = await this.ctx.db.rpc<NotificationPrefs | null>("notification_prefs", {});
    if (error) return fail(error);
    return ok(data);
  }

  async savePrefs(input: unknown): Promise<ServiceResult<NotificationPrefs | null>> {
    const parsed = parseOrFail(saveNotificationPrefsSchema, input);
    if (!parsed.ok) return parsed;
    const f: SaveNotificationPrefsInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<NotificationPrefs | null>("save_notification_prefs", {
      p_email_enabled: f.emailEnabled ?? null,
      p_in_app_enabled: f.inAppEnabled ?? null,
      p_kinds: f.kinds ? JSON.stringify(f.kinds) : null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  // ── seen state + activity ──────────────────────────────────────────────────

  async seenPage(input: unknown): Promise<ServiceResult<PageSeenResult | null>> {
    const parsed = parseOrFail(seenPageSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("seenPage");
    if (denied) return fail(denied);
    const f: SeenPageInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<PageSeenResult | null>("seen_page", { p_page: f.page });
    if (error) return fail(error);
    return ok(data);
  }

  async pageActivity(input: unknown): Promise<ServiceResult<PageSeenResult | null>> {
    const parsed = parseOrFail(pageActivitySchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("pageActivity");
    if (denied) return fail(denied);
    const f: PageActivityInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<PageSeenResult | null>("page_activity", { p_page: f.page });
    if (error) return fail(error);
    return ok(data);
  }

  async activities(limit = 30): Promise<ServiceResult<ActivityItem[]>> {
    const { data, error } = await this.ctx.db.rpc<{ rows: ActivityItem[] } | null>("activities_list", {
      p_limit: limit,
    });
    if (error) return fail(error);
    return ok((data as { rows: ActivityItem[] } | null)?.rows ?? []);
  }
}
