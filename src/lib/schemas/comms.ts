import { z } from "zod";

/**
 * FSMS V2 — messaging & notifications schemas (Phase 22). Shared between
 * repositories and client forms: threaded messaging, notifications, page
 * seen-state and notification/email preferences.
 */

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const uuid = () => z.string().regex(UUID_RE, "Invalid id");
const optUuid = () => uuid().nullish();
const optText = (max = 500) => z.string().trim().max(max).nullish();

export const pageSize = z.number().int().min(1).max(100).default(30);
export const cursor = z.string().max(500).nullish();

// ── messaging ────────────────────────────────────────────────────────────────

export const messageRecipientsSchema = z.object({
  search: optText(200),
  pageSize: pageSize,
  cursor: cursor,
});
export type MessageRecipientsInput = z.infer<typeof messageRecipientsSchema>;

export const messageConversationsSchema = z.object({
  pageSize: pageSize,
  cursor: cursor,
});
export type MessageConversationsInput = z.infer<typeof messageConversationsSchema>;

export const messageThreadSchema = z.object({ threadId: uuid() });
export type MessageThreadInput = z.infer<typeof messageThreadSchema>;

export const sendMessageSchema = z.object({
  threadId: optUuid(),
  to: z.array(uuid()).max(100).nullish(),
  subject: optText(200),
  body: z.string().trim().min(1, "Message is required").max(5000),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const replyMessageSchema = z.object({
  threadId: uuid(),
  body: z.string().trim().min(1, "Message is required").max(5000),
});
export type ReplyMessageInput = z.infer<typeof replyMessageSchema>;

export const deleteMessageSchema = z.object({ messageId: uuid() });
export type DeleteMessageInput = z.infer<typeof deleteMessageSchema>;

export const markThreadReadSchema = z.object({ threadId: uuid() });
export type MarkThreadReadInput = z.infer<typeof markThreadReadSchema>;

// ── notifications ────────────────────────────────────────────────────────────

export const notificationsListSchema = z.object({
  pageSize: pageSize,
  cursor: cursor,
});
export type NotificationsListInput = z.infer<typeof notificationsListSchema>;

export const markNotifReadSchema = z.object({ notifId: uuid() });
export type MarkNotifReadInput = z.infer<typeof markNotifReadSchema>;

export const seenPageSchema = z.object({ page: z.string().trim().min(1).max(200) });
export type SeenPageInput = z.infer<typeof seenPageSchema>;

export const pageActivitySchema = seenPageSchema;
export type PageActivityInput = z.infer<typeof pageActivitySchema>;

export const saveNotificationPrefsSchema = z.object({
  emailEnabled: z.boolean().nullish(),
  inAppEnabled: z.boolean().nullish(),
  kinds: z.record(z.string(), z.record(z.string(), z.boolean())).nullish(),
});
export type SaveNotificationPrefsInput = z.infer<typeof saveNotificationPrefsSchema>;
