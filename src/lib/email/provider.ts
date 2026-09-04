import { env } from "@/lib/env";

/**
 * FSMS V2 — email-provider abstraction (owner decision O5).
 *
 * All transactional email (password recovery, account emails, invitations,
 * notifications) goes through this interface. Resend is the preferred provider;
 * the abstraction lets a future provider replace it without touching callers.
 *
 * Recipient language is always resolved from the USER's preference
 * (notify_lang) — never a global default (functional spec §9A).
 */

export type EmailLocale = "en" | "ru" | "fr" | "zh";

export interface EmailMessage {
  to: string;
  subject: string;
  /** Rendered HTML body (already localized to the recipient's language). */
  html: string;
  /** Plain-text fallback. */
  text?: string;
  /** Template id + variables, for logging/audit. */
  template: string;
  vars?: Record<string, unknown>;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<{ id: string } | null>;
}

/** Development fallback: logs instead of sending (no key configured). */
export class NoopEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<null> {
    console.log("[email:noop]", message.template, "→", message.to);
    return null;
  }
}

/** Resend provider (O5). Lazily imports `resend` so unused builds stay light. */
export class ResendEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<{ id: string } | null> {
    const { Resend } = await import("resend");
    const resend = new Resend(env.resendApiKey);
    const res = await resend.emails.send({
      from: env.emailFrom,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    if (res.error) {
      throw new Error(`Resend error: ${res.error.message}`);
    }
    return { id: res.data?.id ?? "" };
  }
}

export function getEmailProvider(): EmailProvider {
  return env.resendApiKey ? new ResendEmailProvider() : new NoopEmailProvider();
}
