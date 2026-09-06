import { getTranslations } from "next-intl/server";
import { SCHOOL_TIMEZONE, schoolDateTime } from "@/lib/clock";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardDescription, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icons";

export default async function Home() {
  const t = await getTranslations("home");
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-card bg-brand-600 text-ink-inverse">
          <Icon name="students" size={24} />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">FSMS</h1>
          <p className="text-sm text-ink-muted">{t("tagline")}</p>
        </div>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardBody>
            <CardTitle className="mb-1">{t("authentication")}</CardTitle>
            <CardDescription className="mb-3">{t("authenticationDesc")}</CardDescription>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/login">{t("signIn")}</ButtonLink>
              <ButtonLink href="/design-system" variant="secondary">
                {t("designSystem")}
              </ButtonLink>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex items-center gap-3">
            <Icon name="calendar" size={18} className="text-ink-faint" />
            <p className="text-sm text-ink-muted">
              {t("schoolTimezone")} <Badge variant="neutral">{SCHOOL_TIMEZONE}</Badge>{" "}
              · {t("now")} {schoolDateTime()}
            </p>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
