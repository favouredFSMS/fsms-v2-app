import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR, TableEmpty } from "@/components/ui/table";
import { requireDbContext, LessonRepository, localized } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";

export const metadata = { title: "Lesson — FSMS V2" };

export default async function LessonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const ctx = await requireDbContext();

  const res = await new LessonRepository(ctx).detail({ lessonId: id });
  if (!res.ok || !res.data) notFound();
  const lesson = res.data;

  return (
    <PageShell title="Lesson" permission="lessonCalendar">
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>
              {localized(lesson.title)} <span className="text-ink-faint">({lesson.code ?? "no code"})</span>
            </CardTitle>
            <CardDescription>
              {localized(lesson.programme?.name)} · {localized(lesson.unit?.title)}
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Objectives</CardTitle>
            <CardDescription>Learning objectives for this lesson (curriculum links).</CardDescription>
          </CardHeader>
          <CardBody className="px-0">
            {lesson.objectives.length === 0 ? (
              <TableEmpty colSpan={3}>No objectives linked.</TableEmpty>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Code</TH>
                    <TH>Objective</TH>
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
            <CardTitle>Resources</CardTitle>
            <CardDescription>Materials attached to this lesson.</CardDescription>
          </CardHeader>
          <CardBody className="px-0">
            {lesson.resources.length === 0 ? (
              <TableEmpty colSpan={3}>No resources attached.</TableEmpty>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Title</TH>
                    <TH>Kind</TH>
                    <TH>Link</TH>
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
                            open
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
            ← Back to lessons
          </Link>
        </p>
      </div>
    </PageShell>
  );
}
