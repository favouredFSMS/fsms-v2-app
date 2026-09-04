import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireDbContext, CommsRepository } from "@/lib/db";
import { NotificationsPanel } from "@/components/comms/notifications-panel";
import { PrefsForm } from "@/components/comms/prefs-form";

export const metadata = { title: "Notifications — FSMS V2" };

export default async function NotificationsPage() {
  const t = await getTranslations("notifications");
  const ctx = await requireDbContext();
  const repo = new CommsRepository(ctx);

  const [notifs, prefs, unread] = await Promise.all([
    repo.notifications({ pageSize: 50 }),
    repo.prefs(),
    repo.notifUnreadCount(),
  ]);

  const items = notifs.ok ? notifs.data : [];
  const unreadCount = unread.ok && unread.data ? unread.data.unread : 0;

  return (
    <PageShell title={t("title")} permission="notifications">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{unreadCount} {t("unread")}</CardDescription>
          </CardHeader>
          <CardBody>
            <NotificationsPanel items={items} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("preferences")}</CardTitle>
            <CardDescription>{t("preferencesDesc")}</CardDescription>
          </CardHeader>
          <CardBody>
            <PrefsForm prefs={prefs.ok ? prefs.data : null} />
          </CardBody>
        </Card>
      </div>
    </PageShell>
  );
}
