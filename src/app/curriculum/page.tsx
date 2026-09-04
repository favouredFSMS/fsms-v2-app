import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/layout/page-shell";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR, TableEmpty } from "@/components/ui/table";
import { CursorPager } from "@/components/ui/cursor-pager";
import {
  requireDbContext,
  CurriculumRepository,
  LessonRepository,
  StudentRepository,
  ClassRepository,
  localized,
} from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { profileCan } from "@/lib/auth/authorize";
import { CurriculumAuthorForm } from "@/components/curriculum/curriculum-author-form";
import { CurriculumTopicForm } from "@/components/curriculum/curriculum-topic-form";
import { CurriculumEvidenceForm } from "@/components/curriculum/curriculum-evidence-form";
import { CurriculumImportForm } from "@/components/curriculum/curriculum-import-form";
import { CurriculumPublishButton } from "@/components/curriculum/curriculum-publish-button";
import { CurriculumArchiveButton } from "@/components/curriculum/curriculum-archive-button";
import { CurriculumGovernanceActions } from "@/components/curriculum/curriculum-governance-actions";
import { CurriculumAssignForm } from "@/components/curriculum/curriculum-assign-form";

export const metadata = { title: "Curriculum — FSMS V2" };

function qualityVariant(q: string | null): BadgeVariant {
  if (q === "strong") return "success";
  if (q === "ok") return "info";
  if (q === "weak") return "warning";
  return "neutral";
}

function statusVariant(s: string): BadgeVariant {
  if (s === "published") return "success";
  if (s === "archived") return "neutral";
  if (s === "review") return "info";
  return "warning"; // draft
}

export default async function CurriculumPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string; cursor?: string }>;
}) {
  const [t, st, commonT] = await Promise.all([
    getTranslations("curriculum"),
    getTranslations("status"),
    getTranslations("common"),
  ]);
  const profile = await requireUser();
  const sp = await searchParams;
  const ctx = await requireDbContext();
  const curriculum = new CurriculumRepository(ctx);

  const canAuthor = profileCan(profile, "curriculumManagement");
  const canTopic = profileCan(profile, "saveCurriculumTopic");
  const canEvidence = profileCan(profile, "recordLearningCheck");
  const canPublish = profileCan(profile, "publishCurriculum");
  const canArchive = profileCan(profile, "archiveCurriculum");
  const canProgress = profileCan(profile, "smartProgress");
  const canReview = profileCan(profile, "submitCurriculumReview");
  const canUnpublish = profileCan(profile, "unpublishCurriculum");
  const canDuplicate = profileCan(profile, "duplicateCurriculum");
  const canDelete = profileCan(profile, "deleteCurriculum");
  const canRestore = profileCan(profile, "restoreCurriculum");
  const canPermDelete = profileCan(profile, "permanentlyDeleteCurriculum");
  const canAssign = profileCan(profile, "assignCurriculum");

  const [spine, studentsRes, classesRes, targets, topics, skills, evidence, curricula, progress] =
    await Promise.all([
      new LessonRepository(ctx).spine({}),
      new StudentRepository(ctx).search({ pageSize: 100 }),
      canAssign ? new ClassRepository(ctx).search({ pageSize: 100 }) : Promise.resolve(null),
      curriculum.targets(),
      curriculum.topics({}),
      curriculum.skills(),
      curriculum.evidenceList({ studentId: sp.student ?? undefined, pageSize: 30, cursor: sp.cursor }),
      curriculum.curricula(),
      canProgress && sp.student
        ? curriculum.learnerProgress({ studentId: sp.student })
        : Promise.resolve(null),
    ]);

  const students = (studentsRes.ok ? studentsRes.data.items : []).map((s) => ({
    id: s.id,
    label: `${s.name ?? s.id}${s.student_no ? ` · ${s.student_no}` : ""}`,
  }));
  const classes = (classesRes && classesRes.ok ? classesRes.data.items : []).map((c) => ({
    id: c.id,
    name: c.name,
  }));
  const programmeOptions: Array<{ id: string; label: string }> = [];
  if (spine.ok && spine.data) {
    for (const pr of spine.data.programmes) {
      programmeOptions.push({ id: pr.id, label: `${localized(pr.name)} (${pr.code ?? "?"})` });
    }
  }
  const targetOptions = targets.ok ? targets.data.map((t) => ({ id: t.id, label: localized(t.title) || t.id })) : [];
  const topicOptions = topics.ok ? topics.data.map((t) => ({ id: t.id, label: localized(t.title) || t.id })) : [];

  return (
    <PageShell title={t("title")} permission="curriculum">
      <div className="grid gap-4">
        {/* ── content spine ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>{t("contentSpine")}</CardTitle>
            <CardDescription>{t("contentSpineDesc")}</CardDescription>
          </CardHeader>
          <CardBody>
            {spine.ok && spine.data && spine.data.programmes.length > 0 ? (
              <div className="mb-4 space-y-3 text-sm">
                {spine.data.programmes.map((pr) => (
                  <div key={pr.id} className="rounded-field border border-line bg-surface-sunken p-3">
                    <div className="flex items-center gap-2 font-medium text-ink">
                      <span>{localized(pr.name) || t("untitledProgramme")}</span>
                      {pr.code && <Badge variant="brand">{pr.code}</Badge>}
                      {pr.standard && <Badge>{t("standard")}</Badge>}
                    </div>
                    <ul className="mt-2 space-y-1 pl-4 text-ink-muted">
                      {pr.units.map((u) => (
                        <li key={u.id}>
                          <span className="font-medium text-ink-soft">
                            {u.no ? `${u.no}. ` : ""}
                            {localized(u.title) || t("untitledUnit")}
                          </span>
                          <span className="ml-2 text-xs text-ink-faint">
                            {u.lessons.length}{" "}
                            {u.lessons.length === 1 ? commonT("lesson") : commonT("lessons")}
                          </span>
                          <ul className="mt-0.5 list-inside list-disc pl-3 text-xs">
                            {u.lessons.map((l) => (
                              <li key={l.id}>
                                {l.no ? `${l.no} ` : ""}
                                {localized(l.title) || t("untitledLesson")}
                                <span className="text-ink-faint">
                                  {" "}· {l.objective_count}{" "}
                                  {l.objective_count === 1 ? commonT("objective") : commonT("objectives")}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mb-4 text-sm text-ink-muted">{t("noProgrammes")}</p>
            )}
            {canAuthor && <CurriculumAuthorForm programmes={programmeOptions} />}
          </CardBody>
        </Card>

        {/* ── topics + skills + targets ─────────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("curriculumTopics")}</CardTitle>
              <CardDescription>{t("topicsDesc")}</CardDescription>
            </CardHeader>
            <CardBody className="px-0">
              <Table>
                <THead>
                  <TR>
                    <TH>{t("topic")}</TH>
                    <TH>{commonT("level")}</TH>
                    <TH>{t("section")}</TH>
                    <TH>{commonT("status")}</TH>
                  </TR>
                </THead>
                <TBody>
                  {topics.ok && topics.data.length > 0 ? (
                    topics.data.map((t) => (
                      <TR key={t.id}>
                        <TD>{localized(t.title) || "—"}</TD>
                        <TD>{t.level_code ?? "—"}</TD>
                        <TD>{t.course_section ?? "—"}</TD>
                        <TD>
                          <Badge variant={t.published ? "success" : "warning"}>
                            {st(t.published ? "published" : "draft")}
                          </Badge>
                        </TD>
                      </TR>
                    ))
                  ) : (
                    <TableEmpty colSpan={4}>{t("noTopics")}</TableEmpty>
                  )}
                </TBody>
              </Table>
              {canTopic && (
                <div className="border-t border-line p-4">
                  <CurriculumTopicForm />
                </div>
              )}
            </CardBody>
          </Card>

          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("learningTargets")}</CardTitle>
                <CardDescription>{t("targetsDesc")}</CardDescription>
              </CardHeader>
              <CardBody className="px-0">
                <Table>
                  <THead>
                    <TR>
                      <TH>{commonT("level")}</TH>
                      <TH>{commonT("title")}</TH>
                      <TH>{t("verification")}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {targets.ok && targets.data.length > 0 ? (
                      targets.data.map((t) => (
                        <TR key={t.id}>
                          <TD>{t.level_code ?? "—"}</TD>
                          <TD>{localized(t.title) || "—"}</TD>
                          <TD>{t.verification_status ?? "—"}</TD>
                        </TR>
                      ))
                    ) : (
                      <TableEmpty colSpan={3}>{t("noTargets")}</TableEmpty>
                    )}
                  </TBody>
                </Table>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("skills")}</CardTitle>
                <CardDescription>{t("skillsDesc")}</CardDescription>
              </CardHeader>
              <CardBody className="px-0">
                <Table>
                  <THead>
                    <TR>
                      <TH>{commonT("code")}</TH>
                      <TH>{commonT("label")}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {skills.ok && skills.data.length > 0 ? (
                      skills.data.map((s) => (
                        <TR key={s.id}>
                          <TD>
                            <Badge variant="brand">{s.code ?? "—"}</Badge>
                          </TD>
                          <TD>{localized(s.label) || "—"}</TD>
                        </TR>
                      ))
                    ) : (
                      <TableEmpty colSpan={2}>{t("noSkills")}</TableEmpty>
                    )}
                  </TBody>
                </Table>
              </CardBody>
            </Card>
          </div>
        </div>

        {/* ── evidence ──────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>{t("learningEvidence")}</CardTitle>
            <CardDescription>{t("evidenceDesc")}</CardDescription>
          </CardHeader>
          <CardBody>
            {canEvidence && (
              <div className="mb-4 rounded-field border border-line bg-surface-sunken p-4">
                <CurriculumEvidenceForm students={students} targets={targetOptions} topics={topicOptions} />
              </div>
            )}
            <form method="get" className="flex flex-wrap items-center gap-2 pb-3">
              <select
                name="student"
                defaultValue={sp.student ?? ""}
                className="rounded-field border bg-surface px-3 py-2 text-sm text-ink"
              >
                <option value="">{t("allStudents")}</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-field bg-brand-600 px-3 py-2 text-sm text-ink-inverse hover:bg-brand-700"
              >
                {commonT("filter")}
              </button>
            </form>
            <div className="px-0">
              {evidence.ok && evidence.data.items.length > 0 ? (
                <>
                  <Table>
                    <THead>
                      <TR>
                        <TH>{t("when")}</TH>
                        <TH>{commonT("student")}</TH>
                        <TH>{commonT("target")}</TH>
                        <TH>{commonT("source")}</TH>
                        <TH>{t("quality")}</TH>
                        <TH>{commonT("score")}</TH>
                        <TH>{commonT("note")}</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {evidence.data.items.map((e) => (
                        <TR key={e.id}>
                          <TD className="whitespace-nowrap">
                            {e.recorded_at ? new Date(e.recorded_at).toLocaleDateString() : "—"}
                          </TD>
                          <TD>{e.student_name ?? "—"}</TD>
                          <TD>{localized(e.target_title) || "—"}</TD>
                          <TD>{e.source}</TD>
                          <TD>
                            <Badge variant={qualityVariant(e.quality)}>
                              {e.quality && st.has(e.quality) ? st(e.quality) : (e.quality ?? "—")}
                            </Badge>
                          </TD>
                          <TD>{e.score ?? "—"}</TD>
                          <TD className="max-w-[16rem] truncate">{e.note ?? "—"}</TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                  <CursorPager
                    basePath="/curriculum"
                    total={evidence.data.total}
                    shown={evidence.data.items.length}
                    nextCursor={evidence.data.nextCursor}
                    extraParams={sp.student ? { student: sp.student } : undefined}
                  />
                </>
              ) : (
                <TableEmpty colSpan={7}>{t("noEvidence")}</TableEmpty>
              )}
            </div>
          </CardBody>
        </Card>

        {/* ── learner progress ──────────────────────────────────────────── */}
        {canProgress && (
          <Card>
            <CardHeader>
              <CardTitle>{t("learnerProgress")}</CardTitle>
              <CardDescription>{t("learnerProgressDesc")}</CardDescription>
            </CardHeader>
            <CardBody>
              <form method="get" className="flex flex-wrap items-center gap-2 pb-3">
                <select
                  name="student"
                  defaultValue={sp.student ?? ""}
                  className="rounded-field border bg-surface px-3 py-2 text-sm text-ink"
                >
                  <option value="">{t("selectStudent")}</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-field bg-brand-600 px-3 py-2 text-sm text-ink-inverse hover:bg-brand-700"
                >
                  {t("showProgress")}
                </button>
              </form>
              {progress && progress.ok && progress.data ? (
                <div className="grid gap-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-ink">{progress.data.student?.name ?? commonT("student")}</span>
                    <Badge variant="brand">{progress.data.student?.level_code ?? "—"}</Badge>
                    <span className="text-ink-muted">
                      {t("progressSummary", {
                        count: progress.data.totals.evidence_count,
                        score: progress.data.totals.avg_score ?? "—",
                      })}
                    </span>
                  </div>
                  <Table>
                    <THead>
                      <TR>
                        <TH>{commonT("target")}</TH>
                        <TH>{commonT("level")}</TH>
                        <TH>{t("records")}</TH>
                        <TH>{t("avgScore")}</TH>
                        <TH>{t("last")}</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {progress.data.targets.length > 0 ? (
                        progress.data.targets.map((t) => (
                          <TR key={t.target_id}>
                            <TD>{localized(t.target_title) || "—"}</TD>
                            <TD>{t.level_code ?? "—"}</TD>
                            <TD>{t.count}</TD>
                            <TD>{t.avg_score ?? "—"}</TD>
                            <TD className="whitespace-nowrap">
                              {t.last_at ? new Date(t.last_at).toLocaleDateString() : "—"}
                            </TD>
                          </TR>
                        ))
                      ) : (
                        <TableEmpty colSpan={5}>{t("noEvidenceForStudent")}</TableEmpty>
                      )}
                    </TBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-ink-muted">{t("selectStudentHint")}</p>
              )}
            </CardBody>
          </Card>
        )}

        {/* ── curricula container ───────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>{t("curricula")}</CardTitle>
            <CardDescription>{t("curriculaDesc")}</CardDescription>
          </CardHeader>
          <CardBody>
            {canAuthor && (
              <div className="mb-4 rounded-field border border-line bg-surface-sunken p-4">
                <CurriculumImportForm programmes={programmeOptions} />
              </div>
            )}
            <div className="px-0">
              {curricula.ok && curricula.data.length > 0 ? (
                <Table>
                  <THead>
                    <TR>
                      <TH>{commonT("title")}</TH>
                      <TH>{t("publisher")}</TH>
                      <TH>{t("programme")}</TH>
                      <TH>{t("versions")}</TH>
                      <TH>{commonT("status")}</TH>
                      <TH>{t("imported")}</TH>
                      <TH>{commonT("actions")}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {curricula.data.map((c) => (
                      <TR key={c.id}>
                        <TD>{localized(c.title) || "—"}</TD>
                        <TD>{c.publisher ?? "—"}</TD>
                        <TD>{localized(c.programme_name) || "—"}</TD>
                        <TD>{c.versions}</TD>
                        <TD>
                          {c.deleted ? (
                            <Badge variant="danger">{t("deleted")}</Badge>
                          ) : (
                            <Badge variant={statusVariant(c.status)}>
                              {st.has(c.status) ? st(c.status) : c.status}
                            </Badge>
                          )}
                        </TD>
                        <TD className="whitespace-nowrap">
                          {c.imported_at ? new Date(c.imported_at).toLocaleDateString() : "—"}
                        </TD>
                        <TD>
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                              {canPublish && !c.deleted && c.status !== "published" && c.status !== "archived" && (
                                <CurriculumPublishButton curriculumId={c.id} />
                              )}
                              {canArchive && !c.deleted && c.status !== "archived" && (
                                <CurriculumArchiveButton curriculumId={c.id} />
                              )}
                              {!c.deleted && c.status !== "archived" && canAssign && (
                                <CurriculumAssignForm curriculumId={c.id} classes={classes} />
                              )}
                            </div>
                            {(canReview || canUnpublish || canDuplicate || canDelete || canRestore || canPermDelete) && (
                              <CurriculumGovernanceActions
                                curriculumId={c.id}
                                status={c.status}
                                deleted={c.deleted}
                                canReview={canReview}
                                canUnpublish={canUnpublish}
                                canDuplicate={canDuplicate}
                                canDelete={canDelete}
                                canRestore={canRestore}
                                canPermDelete={canPermDelete}
                              />
                            )}
                          </div>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              ) : (
                <TableEmpty colSpan={7}>{t("noCurricula")}</TableEmpty>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </PageShell>
  );
}
