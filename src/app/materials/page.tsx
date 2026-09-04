import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR, TableEmpty } from "@/components/ui/table";
import { CursorPager } from "@/components/ui/cursor-pager";
import { requireDbContext, MaterialRepository, ClassRepository, localized } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { profileCan } from "@/lib/auth/authorize";
import { MaterialForm } from "@/components/materials/material-form";
import { MaterialMappingForm } from "@/components/materials/material-mapping-form";
import { MaterialMappingDecide, MaterialMappingReject } from "@/components/materials/material-mapping-decide";
import { MaterialAccessForm } from "@/components/materials/material-access-form";
import { ResourceForm } from "@/components/materials/resource-form";
import { ResourceDeleteButton } from "@/components/materials/resource-delete-button";
import { MethodologyForm } from "@/components/materials/methodology-form";
import { MethodologyDeleteButton } from "@/components/materials/methodology-delete-button";
import { TeacherMaterialForm } from "@/components/materials/teacher-material-form";
import { MaterialFeedbackForm } from "@/components/materials/material-feedback-form";

export const metadata = { title: "Materials — FSMS V2" };

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ material?: string; cursor?: string }>;
}) {
  const profile = await requireUser();
  const sp = await searchParams;
  const ctx = await requireDbContext();
  const materials = new MaterialRepository(ctx);

  const canEdit = profileCan(profile, "saveMaterial");
  const canMapping = profileCan(profile, "saveMaterialMapping");
  const canDecide = profileCan(profile, "decideMaterialMapping");
  const canAccess = profileCan(profile, "saveMaterialAccess");
  const canResource = profileCan(profile, "saveResource");
  const canDeleteResource = profileCan(profile, "deleteResource");
  const canMethodologyView = profileCan(profile, "methodology");
  const canMethodology = profileCan(profile, "saveMethodology");
  const canDeleteMethodology = profileCan(profile, "deleteMethodology");
  const canTeacherMatView = profileCan(profile, "searchTeachingMaterials");
  const canTeacherMat = profileCan(profile, "saveTeacherMaterial");
  const canFeedback = profileCan(profile, "saveMaterialFeedback");

  const [catalog, detail, classesRes, mappingsRes, resources, methodologyRes, teacherMaterials] =
    await Promise.all([
      materials.catalog({ pageSize: 30, cursor: sp.cursor }),
      sp.material ? materials.detail({ materialId: sp.material }) : Promise.resolve(null),
      canAccess ? new ClassRepository(ctx).search({ pageSize: 100 }) : Promise.resolve(null),
      sp.material ? materials.mappings({ materialId: sp.material }) : Promise.resolve(null),
      materials.resources({ pageSize: 30 }),
      canMethodologyView ? materials.methodology({}) : Promise.resolve(null),
      canTeacherMatView ? materials.teacherMaterials() : Promise.resolve(null),
    ]);

  const classes = (classesRes && classesRes.ok ? classesRes.data.items : []).map((c) => ({
    id: c.id,
    name: c.name,
  }));

  const selected = detail && detail.ok ? detail.data : null;
  const mappingOptionData = sp.material
    ? await materials.mappingOptions({ materialId: sp.material })
    : null;
  const mapOptions = mappingOptionData && mappingOptionData.ok ? mappingOptionData.data : null;

  return (
    <PageShell title="Materials & resources" permission="materialCatalog">
      <div className="grid gap-4">
        {/* ── catalogue ─────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Materials catalogue</CardTitle>
            <CardDescription>
              Textbooks, workbooks, readers and media. Select a material to manage its units,
              mappings, access and feedback.
            </CardDescription>
          </CardHeader>
          <CardBody className="px-0">
            {canEdit && (
              <div className="border-b border-line p-4">
                <MaterialForm />
              </div>
            )}
            {catalog.ok && catalog.data.items.length > 0 ? (
              <>
                <Table>
                  <THead>
                    <TR>
                      <TH>Title</TH>
                      <TH>Type</TH>
                      <TH>Level</TH>
                      <TH>Publisher</TH>
                      <TH>Units</TH>
                      <TH>Actions</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {catalog.data.items.map((m) => (
                      <TR key={m.id}>
                        <TD>{localized(m.title) || "—"}</TD>
                        <TD>{m.type ?? "—"}</TD>
                        <TD>{m.level_code ?? "—"}</TD>
                        <TD>{m.publisher ?? "—"}</TD>
                        <TD>{m.unit_count}</TD>
                        <TD>
                          <a href={`/materials?material=${m.id}`} className="text-brand-600 hover:underline">
                            Manage
                          </a>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
                <CursorPager
                  basePath="/materials"
                  total={catalog.data.total}
                  shown={catalog.data.items.length}
                  nextCursor={catalog.data.nextCursor}
                />
              </>
            ) : (
              <TableEmpty colSpan={6}>No materials yet.</TableEmpty>
            )}
          </CardBody>
        </Card>

        {/* ── selected material detail ──────────────────────────────────── */}
        {sp.material && selected && selected.material && (
          <Card>
            <CardHeader>
              <CardTitle>{localized(selected.material.title) || "Material"}</CardTitle>
              <CardDescription>
                {selected.material.type} · {selected.material.publisher ?? "—"} · avg rating{" "}
                {selected.feedback.avg ?? "—"} ({selected.feedback.count} ratings) · used{" "}
                {selected.usage_count}×
              </CardDescription>
            </CardHeader>
            <CardBody className="grid gap-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-medium text-ink">Units</h3>
                  <Table>
                    <THead>
                      <TR>
                        <TH>#</TH>
                        <TH>Title</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {selected.units.length > 0 ? (
                        selected.units.map((u) => (
                          <TR key={u.id}>
                            <TD>{u.no ?? "—"}</TD>
                            <TD>{localized(u.title) || "—"}</TD>
                          </TR>
                        ))
                      ) : (
                        <TableEmpty colSpan={2}>No units yet.</TableEmpty>
                      )}
                    </TBody>
                  </Table>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-medium text-ink">Mappings (propose → decide)</h3>
                  <Table>
                    <THead>
                      <TR>
                        <TH>Unit</TH>
                        <TH>Target</TH>
                        <TH>Status</TH>
                        {canDecide && <TH>Decision</TH>}
                      </TR>
                    </THead>
                    <TBody>
                      {mappingsRes && mappingsRes.ok && mappingsRes.data.length > 0 ? (
                        mappingsRes.data.map((mp) => (
                          <TR key={mp.id}>
                            <TD>{mp.unit_no ?? "—"}</TD>
                            <TD className="max-w-[12rem] truncate">{localized(mp.target_title) || "—"}</TD>
                            <TD>
                              <Badge variant={mp.status === "verified" ? "success" : mp.status === "rejected" ? "danger" : "warning"}>
                                {mp.status}
                              </Badge>
                            </TD>
                            {canDecide && (
                              <TD>
                                {mp.status === "proposed" && (
                                  <div className="flex items-center gap-1">
                                    <MaterialMappingDecide mappingId={mp.id} />
                                    <MaterialMappingReject mappingId={mp.id} />
                                  </div>
                                )}
                              </TD>
                            )}
                          </TR>
                        ))
                      ) : (
                        <TableEmpty colSpan={canDecide ? 4 : 3}>No mappings yet.</TableEmpty>
                      )}
                    </TBody>
                  </Table>
                </div>
              </div>

              {canMapping && mapOptions && (
                <div className="rounded-field border border-line bg-surface-sunken p-4">
                  <MaterialMappingForm
                    units={(mapOptions.units ?? []).map((u) => ({
                      id: u.id,
                      label: `${u.no ? `${u.no}. ` : ""}${localized(u.title) || "Unit"}`,
                    }))}
                    targets={(mapOptions.targets ?? []).map((t) => ({
                      id: t.id,
                      label: `${localized(t.title) || "Target"} (${t.level_code ?? "?"})`,
                    }))}
                  />
                </div>
              )}

              {canAccess && (
                <div className="rounded-field border border-line bg-surface-sunken p-4">
                  <h3 className="mb-2 text-sm font-medium text-ink">Access policy (classes)</h3>
                  <MaterialAccessForm
                    materialId={sp.material}
                    classes={classes}
                    current={[]}
                  />
                </div>
              )}

              {canFeedback && (
                <div className="rounded-field border border-line bg-surface-sunken p-4">
                  <h3 className="mb-2 text-sm font-medium text-ink">Rate this material</h3>
                  <MaterialFeedbackForm materialId={sp.material} />
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* ── resources ─────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Resources</CardTitle>
            <CardDescription>Links and worksheets shared with the school.</CardDescription>
          </CardHeader>
          <CardBody className="px-0">
            {canResource && (
              <div className="border-b border-line p-4">
                <ResourceForm />
              </div>
            )}
            {resources.ok && resources.data.items.length > 0 ? (
              <>
                <Table>
                  <THead>
                    <TR>
                      <TH>Title</TH>
                      <TH>Kind</TH>
                      <TH>Link</TH>
                      <TH>Added by</TH>
                      {canDeleteResource && <TH>Actions</TH>}
                    </TR>
                  </THead>
                  <TBody>
                    {resources.data.items.map((r) => (
                      <TR key={r.id}>
                        <TD>{localized(r.title) || "—"}</TD>
                        <TD>{r.kind ?? "—"}</TD>
                        <TD>
                          {r.url ? (
                            <a href={r.url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                              open
                            </a>
                          ) : (
                            "—"
                          )}
                        </TD>
                        <TD>{r.created_by_name ?? "—"}</TD>
                        {canDeleteResource && (
                          <TD>
                            <ResourceDeleteButton resourceId={r.id} />
                          </TD>
                        )}
                      </TR>
                    ))}
                  </TBody>
                </Table>
                <CursorPager
                  basePath="/materials"
                  total={resources.data.total}
                  shown={resources.data.items.length}
                  nextCursor={resources.data.nextCursor}
                />
              </>
            ) : (
              <TableEmpty colSpan={canDeleteResource ? 5 : 4}>No resources yet.</TableEmpty>
            )}
          </CardBody>
        </Card>

        {/* ── methodology (staff only) ──────────────────────────────────── */}
        {canMethodologyView && (
          <Card>
            <CardHeader>
              <CardTitle>Methodology library</CardTitle>
              <CardDescription>Office curates, staff read — how to teach, not what.</CardDescription>
            </CardHeader>
            <CardBody className="px-0">
              {canMethodology && (
                <div className="border-b border-line p-4">
                  <MethodologyForm />
                </div>
              )}
              {methodologyRes && methodologyRes.ok && methodologyRes.data.length > 0 ? (
                <Table>
                  <THead>
                    <TR>
                      <TH>Title</TH>
                      <TH>Level</TH>
                      <TH>Body</TH>
                      {canDeleteMethodology && <TH>Actions</TH>}
                    </TR>
                  </THead>
                  <TBody>
                    {methodologyRes.data.map((m) => (
                      <TR key={m.id}>
                        <TD>{localized(m.title) || "—"}</TD>
                        <TD>{m.level_code ?? "—"}</TD>
                        <TD className="max-w-[24rem] truncate">{localized(m.body) || "—"}</TD>
                        {canDeleteMethodology && (
                          <TD>
                            <MethodologyDeleteButton methodologyId={m.id} />
                          </TD>
                        )}
                      </TR>
                    ))}
                  </TBody>
                </Table>
              ) : (
                <TableEmpty colSpan={canDeleteMethodology ? 4 : 3}>No methodology entries yet.</TableEmpty>
              )}
            </CardBody>
          </Card>
        )}

        {/* ── teacher materials ─────────────────────────────────────────── */}
        {canTeacherMatView && (
          <Card>
            <CardHeader>
              <CardTitle>Teacher materials</CardTitle>
              <CardDescription>
                {profile.role_base === "teacher" ? "Your own materials." : "Teacher-prepared materials (all)."}
              </CardDescription>
            </CardHeader>
            <CardBody className="px-0">
              {canTeacherMat && (
                <div className="border-b border-line p-4">
                  <TeacherMaterialForm />
                </div>
              )}
              {teacherMaterials && teacherMaterials.ok && teacherMaterials.data.length > 0 ? (
                <Table>
                  <THead>
                    <TR>
                      <TH>Title</TH>
                      <TH>Kind</TH>
                      <TH>Teacher</TH>
                      <TH>Created</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {teacherMaterials.data.map((tm) => (
                      <TR key={tm.id}>
                        <TD>{localized(tm.title) || "—"}</TD>
                        <TD>{tm.kind ?? "—"}</TD>
                        <TD>{tm.teacher_name ?? "—"}</TD>
                        <TD className="whitespace-nowrap">
                          {tm.created_at ? new Date(tm.created_at).toLocaleDateString() : "—"}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              ) : (
                <TableEmpty colSpan={4}>No teacher materials yet.</TableEmpty>
              )}
            </CardBody>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
