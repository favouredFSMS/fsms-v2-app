import Link from "next/link";
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

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; level?: string; status?: string; cursor?: string }>;
}) {
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
    <PageShell title="Classes" permission="classes">
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Classes</CardTitle>
            <CardDescription>
              Visibility-scoped listing (RLS) with server-side search, level/status filters and keyset pagination.
            </CardDescription>
          </CardHeader>
          <CardBody className="px-0">
            <form method="get" className="flex flex-wrap items-center gap-2 px-4 pb-3">
              <input
                name="q"
                defaultValue={sp.q ?? ""}
                placeholder="Search name / room…"
                className="w-full max-w-xs rounded-field border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand-500 focus-ring"
              />
              <select name="level" defaultValue={sp.level ?? ""} className="rounded-field border bg-surface px-3 py-2 text-sm text-ink">
                <option value="">All levels</option>
                {levels.map((l) => (
                  <option key={l.code} value={l.code}>{l.label ?? l.code.toUpperCase()}</option>
                ))}
              </select>
              <select name="status" defaultValue={sp.status ?? ""} className="rounded-field border bg-surface px-3 py-2 text-sm text-ink">
                <option value="">All statuses</option>
                <option value="active">active</option>
                <option value="archived">archived</option>
                <option value="ended">ended</option>
              </select>
              <button type="submit" className="rounded-field bg-brand-600 px-3 py-2 text-sm text-ink-inverse hover:bg-brand-700">
                Search
              </button>
            </form>

            {res.ok ? (
              res.data.items.length === 0 ? (
                <TableEmpty colSpan={5}>No classes found.</TableEmpty>
              ) : (
                <>
                  <Table>
                    <THead>
                      <TR>
                        <TH>Name</TH>
                        <TH>Level</TH>
                        <TH>Type</TH>
                        <TH>Teachers</TH>
                        <TH className="text-right">Students</TH>
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
                            <Badge variant="neutral">{c.class_type ?? "group"}</Badge>
                          </TD>
                          <TD className="text-xs">
                            {c.teachers.length
                              ? c.teachers.map((t) => `${t.name}${t.is_primary ? " (primary)" : ""}`).join(", ")
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
              <CardTitle>New class</CardTitle>
              <CardDescription>Teachers and office staff may create classes.</CardDescription>
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
              <CardTitle>Academic calendar</CardTitle>
              <CardDescription>Academic years and terms (leadership only).</CardDescription>
            </CardHeader>
            <CardBody className="flex flex-col gap-4">
              <YearCreateForm />
              {years.length > 0 && <TermCreateForm years={years} />}
              {s && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-medium text-ink-muted">Academic years</h3>
                    <ul className="mt-1 text-sm text-ink">
                      {s.academic_years.length === 0 && <li className="text-ink-faint">None yet.</li>}
                      {s.academic_years.map((y) => (
                        <li key={y.id}>
                          {y.name} {y.current ? "· current" : ""}
                          <span className="text-ink-faint"> ({y.starts_on ?? "—"} → {y.ends_on ?? "—"})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-ink-muted">Terms</h3>
                    <ul className="mt-1 text-sm text-ink">
                      {s.terms.length === 0 && <li className="text-ink-faint">None yet.</li>}
                      {s.terms.map((t) => (
                        <li key={t.id}>
                          {t.name}
                          <span className="text-ink-faint"> ({t.starts_on ?? "—"} → {t.ends_on ?? "—"})</span>
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
              <CardTitle>Subjects</CardTitle>
              <CardDescription>School-wide subject list.</CardDescription>
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
