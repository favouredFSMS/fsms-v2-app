import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR, TableEmpty } from "@/components/ui/table";
import { requireDbContext, LessonRepository, localized } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";

export const metadata = { title: "Lesson — FSMS V2" };

export default async function LessonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [t, commonT] = await Promise.all([getTranslations("lessonDetail"), getTranslations("common")]);
  await requireUser();
  const { id } = await params;
  const ctx = await requireDbContext();

  const res = await new LessonRepository(ctx).detail({ lessonId: id });
  if (!res.ok || !res.data) notFound();
  const lesson = res.data;

  return (
    <PageShell title={t("title")} permission="lessonCalendar">
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>
              {localized(lesson.title)} <span className="text-ink-faint">({lesson.code ?? t("noCode")})</span>
            </CardTitle>
            <CardDescription>
              {localized(lesson.programme?.name)} · {localized(lesson.unit?.title)}
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("objectives")}</CardTitle>
            <CardDescription>{t("objectivesDesc")}</CardDescription>
          </CardHeader>
          <CardBody className="px-0">
            {lesson.objectives.length === 0 ? (
              <TableEmpty colSpan={3}>{t("noObjectives")}</TableEmpty>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>{commonT("code")}</TH>
                    <TH>{commonT("objective")}</TH>
                    <TH>CEFR</TH>
                  </TR>
                </THead>
                <TBody>
                  {lesson.objectives.map((o) => (
                    <TR key={o.id}>
                      <TD>{o.code ?? "—"}</TD>
                      <TD>{localized(o.text)}</TD>
                      <TD>{o.cefr ? <Badge variant="info">{o.cefr}</Badge> : "—"}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("resources")}</CardTitle>
            <CardDescription>{t("resourcesDesc")}</CardDescription>
          </CardHeader>
          <CardBody className="px-0">
            {lesson.resources.length === 0 ? (
              <TableEmpty colSpan={3}>{t("noResources")}</TableEmpty>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>{commonT("title")}</TH>
                    <TH>{t("kind")}</TH>
                    <TH>{t("link")}</TH>
                  </TR>
                </THead>
                <TBody>
                  {lesson.resources.map((r) => (
                    <TR key={r.id}>
                      <TD>{localized(r.title)}</TD>
                      <TD>{r.kind ?? "—"}</TD>
                      <TD>
                        {r.url ? (
                          <a href={r.url} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">
                            {commonT("open")}
                          </a>
                        ) : (
                          <span className="text-ink-faint">{r.file_path ?? "—"}</span>
                        )}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardBody>
        </Card>

        <p>
          <Link href="/lessons" className="text-sm text-brand-700 hover:underline">
            {t("backToLessons")}
          </Link>
        </p>
      </div>
    </PageShell>
  );
}
