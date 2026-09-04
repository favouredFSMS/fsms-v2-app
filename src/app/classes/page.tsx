import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR, TableEmpty } from "@/components/ui/table";
import { CursorPager } from "@/components/ui/cursor-pager";
import { requireDbContext, ClassRepository, AcademicRepository } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { profileCan } from "@/lib/auth/authorize";
import { isLeadership } from "@/lib/auth/roles";
import { ClassCreateForm } from "@/components/academic/class-create-form";
import { SubjectCreateForm } from "@/components/academic/subject-create-form";
import { YearCreateForm } from "@/components/academic/year-create-form";
import { TermCreateForm } from "@/components/academic/term-create-form";

export const metadata = { title: "Classes — FSMS V2" };

function statusLabel(st: (k: string) => string, value: string): string {
  const k = value.toLowerCase();
  const out = st(k);
  return out !== k ? out : value;
}

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; level?: string; status?: string; cursor?: string }>;
}) {
  const [t, st, commonT] = await Promise.all([
    getTranslations("classes"),
    getTranslations("status"),
    getTranslations("common"),
  ]);
  const profile = await requireUser();
  const sp = await searchParams;
  const ctx = await requireDbContext();

  const [res, structure] = await Promise.all([
    new ClassRepository(ctx).search({
      search: sp.q,
      level: sp.level,
      status: sp.status,
      pageSize: 20,
      cursor: sp.cursor,
    }),
    new AcademicRepository(ctx).structure(),
  ]);

  const s = structure.ok ? structure.data : null;
  const levels = s?.levels ?? [];
  const years = (s?.academic_years ?? []).map((y) => ({ id: y.id, name: y.name }));
  const terms = (s?.terms ?? []).map((t) => ({ id: t.id, name: t.name }));

  const canSaveClass = profileCan(profile, "saveClass");
  const canSaveSubjects = profileCan(profile, "saveSubjects");
  const leadership = isLeadership(profile.role_base);

  return (
    <PageShell title={t("title")} permission="classes">
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("desc")}</CardDescription>
          </CardHeader>
          <CardBody className="px-0">
            <form method="get" className="flex flex-wrap items-center gap-2 px-4 pb-3">
              <input
                name="q"
                defaultValue={sp.q ?? ""}
                placeholder={t("searchPlaceholder")}
                className="w-full max-w-xs rounded-field border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand-500 focus-ring"
              />
              <select name="level" defaultValue={sp.level ?? ""} className="rounded-field border bg-surface px-3 py-2 text-sm text-ink">
                <option value="">{t("allLevels")}</option>
                {levels.map((l) => (
                  <option key={l.code} value={l.code}>{l.label ?? l.code.toUpperCase()}</option>
                ))}
              </select>
              <select name="status" defaultValue={sp.status ?? ""} className="rounded-field border bg-surface px-3 py-2 text-sm text-ink">
                <option value="">{t("allStatuses")}</option>
                {["active", "archived", "ended"].map((v) => (
                  <option key={v} value={v}>{statusLabel(st, v)}</option>
                ))}
              </select>
              <button type="submit" className="rounded-field bg-brand-600 px-3 py-2 text-sm text-ink-inverse hover:bg-brand-700">
                {commonT("search")}
              </button>
            </form>

            {res.ok ? (
              res.data.items.length === 0 ? (
                <TableEmpty colSpan={5}>{t("noClasses")}</TableEmpty>
              ) : (
                <>
                  <Table>
                    <THead>
                      <TR>
                        <TH>{commonT("name")}</TH>
                        <TH>{commonT("level")}</TH>
                        <TH>{commonT("type")}</TH>
                        <TH>{commonT("teachers")}</TH>
                        <TH className="text-right">{commonT("students")}</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {res.data.items.map((c) => (
                        <TR key={c.id}>
                          <TD>
                            <Link href={`/classes/${c.id}`} className="font-medium text-brand-700 hover:underline">
                              {c.name}
                            </Link>
                            <div className="text-xs text-ink-faint">{c.room ?? ""}</div>
                          </TD>
                          <TD>{c.level_code?.toUpperCase() ?? "—"}</TD>
                          <TD>
                            <Badge variant="neutral">{c.class_type ?? t("group")}</Badge>
                          </TD>
                          <TD className="text-xs">
                            {c.teachers.length
                              ? c.teachers.map((tch) => `${tch.name}${tch.is_primary ? ` (${commonT("primary")})` : ""}`).join(", ")
                              : "—"}
                          </TD>
                          <TD className="text-right tabular-nums">{c.students}</TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                  <CursorPager
                    basePath="/classes"
                    search={sp.q}
                    total={res.data.total}
                    shown={res.data.items.length}
                    nextCursor={res.data.nextCursor}
                  />
                </>
              )
            ) : (
              <p className="px-4 pb-3 text-sm text-danger-600">{res.error.code}: {res.error.message}</p>
            )}
          </CardBody>
        </Card>

        {canSaveClass && (
          <Card>
            <CardHeader>
              <CardTitle>{t("newClass")}</CardTitle>
              <CardDescription>{t("newClassDesc")}</CardDescription>
            </CardHeader>
            <CardBody>
              <ClassCreateForm
                levels={levels.map((l) => ({ code: l.code, label: l.label }))}
                years={years}
                terms={terms}
              />
            </CardBody>
          </Card>
        )}

        {leadership && (
          <Card>
            <CardHeader>
              <CardTitle>{t("academicCalendar")}</CardTitle>
              <CardDescription>{t("academicCalendarDesc")}</CardDescription>
            </CardHeader>
            <CardBody className="flex flex-col gap-4">
              <YearCreateForm />
              {years.length > 0 && <TermCreateForm years={years} />}
              {s && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-medium text-ink-muted">{t("academicYears")}</h3>
                    <ul className="mt-1 text-sm text-ink">
                      {s.academic_years.length === 0 && <li className="text-ink-faint">{commonT("noneYet")}</li>}
                      {s.academic_years.map((y) => (
                        <li key={y.id}>
                          {y.name} {y.current ? `· ${commonT("current")}` : ""}
                          <span className="text-ink-faint"> ({y.starts_on ?? "—"} → {y.ends_on ?? "—"})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-ink-muted">{commonT("terms")}</h3>
                    <ul className="mt-1 text-sm text-ink">
                      {s.terms.length === 0 && <li className="text-ink-faint">{commonT("noneYet")}</li>}
                      {s.terms.map((tm) => (
                        <li key={tm.id}>
                          {tm.name}
                          <span className="text-ink-faint"> ({tm.starts_on ?? "—"} → {tm.ends_on ?? "—"})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {canSaveSubjects && (
          <Card>
            <CardHeader>
              <CardTitle>{t("subjects")}</CardTitle>
              <CardDescription>{t("subjectsDesc")}</CardDescription>
            </CardHeader>
            <CardBody className="flex flex-col gap-4">
              <SubjectCreateForm />
              <ul className="flex flex-wrap gap-2">
                {(s?.subjects ?? []).map((sub) => (
                  <li key={sub.id}>
                    <Badge variant="brand">{sub.name}</Badge>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
