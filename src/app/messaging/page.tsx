import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/guards";
import { requireDbContext, CommsRepository } from "@/lib/db";
import { MessageComposer } from "@/components/comms/message-composer";
import { ThreadPanel } from "@/components/comms/thread-panel";

export const metadata = { title: "Messaging — FSMS" };

export default async function MessagingPage({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string }>;
}) {
  const t = await getTranslations("messaging");
  const profile = await requireUser();
  const sp = await searchParams;
  const ctx = await requireDbContext();
  const repo = new CommsRepository(ctx);

  const [conversations, recipients, threadRes, unreadRes] = await Promise.all([
    repo.conversations({ pageSize: 50 }),
    repo.recipients({ pageSize: 100 }),
    sp.thread ? repo.thread({ threadId: sp.thread }) : Promise.resolve(null),
    repo.messageUnreadCount(),
  ]);

  const conversationsList = conversations.ok ? conversations.data : [];
  const recipientsList = recipients.ok ? recipients.data : [];
  const thread = threadRes && threadRes.ok ? threadRes.data : null;
  const unread = unreadRes.ok && unreadRes.data ? unreadRes.data.unread : 0;

  return (
    <PageShell title={t("title")} permission="messageConversations">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>{t("conversations")}</CardTitle>
            <CardDescription>{unread} {t("unread")}</CardDescription>
          </CardHeader>
          <CardBody className="px-0">
            {conversationsList.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink-500">{t("noThreads")}</p>
            ) : (
              <ul className="divide-y divide-ink-100">
                {conversationsList.map((c) => (
                  <li key={c.id}>
                    <a
                      href={`/messaging?thread=${c.id}`}
                      className={`block px-4 py-3 hover:bg-ink-50 ${sp.thread === c.id ? "bg-brand-50" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-ink-900">{c.subject || c.participants.join(", ")}</span>
                        {c.unread > 0 && <Badge variant="brand">{c.unread}</Badge>}
                      </div>
                      <div className="truncate text-xs text-ink-500">
                        {c.last_message?.body ?? "—"}
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("newMessage")}</CardTitle>
            </CardHeader>
            <CardBody>
              <MessageComposer recipients={recipientsList.map((r) => ({ id: r.id, name: r.name ?? r.id }))} />
            </CardBody>
          </Card>

          {thread ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("thread")}</CardTitle>
              </CardHeader>
              <CardBody>
                <ThreadPanel thread={thread} profileId={profile.id} />
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardBody>
                <p className="py-8 text-center text-sm text-ink-500">{t("selectToRead")}</p>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  );
}
