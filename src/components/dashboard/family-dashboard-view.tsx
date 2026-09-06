import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TR } from "@/components/ui/table";
import {
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DashboardSummary } from "@/lib/db/repos/dashboard";
import { MonthlySpotlightCard } from "./monthly-spotlight-card";

export interface FamilyDashboardViewProps {
  summary: DashboardSummary;
  roleBase: string;
}

function statusVariant(status: string | null | undefined) {
  switch (status) {
    case "graded":
    case "present":
    case "active":
    case "achieved":
    case "mastered":
      return "success" as const;
    case "overdue":
    case "absent":
    case "missing":
    case "blocked":
      return "danger" as const;
    case "submitted":
    case "late":
    case "almost":
      return "warning" as const;
    case "assigned":
    case "scheduled":
      return "info" as const;
    default:
      return "neutral" as const;
  }
}

export function FamilyDashboardView({ summary, roleBase }: FamilyDashboardViewProps) {
  const t = useTranslations("dashboard");
  const st = useTranslations("status");

  return (
    <div className="grid gap-5">
      {/* Monthly spotlight recognition for families */}
      {summary.spotlight && summary.spotlight.length > 0 && (
        <MonthlySpotlightCard spotlight={summary.spotlight} />
      )}

      {roleBase === "parent" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("myChildren")}</CardTitle>
              <CardDescription>{t("myChildrenDesc")}</CardDescription>
            </CardHeader>
            <CardBody className="px-0">
              <Table>
                <TBody>
                  {summary.myChildren.map((c) => (
                    <TR key={c.id}>
                      <TD className="font-medium">{c.name}</TD>
                      <TD className="font-mono text-xs text-ink-faint">{c.student_no}</TD>
                      <TD>{c.level_code?.toUpperCase()}</TD>
                    </TR>
                  ))}
                  {!summary.myChildren.length && (
                    <TR>
                      <TD className="text-ink-faint">{t("noChildrenLinked")}</TD>
                    </TR>
                  )}
                </TBody>
              </Table>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("recentHomework")}</CardTitle>
              <CardDescription>{t("recentHomeworkDesc")}</CardDescription>
            </CardHeader>
            <CardBody className="px-0">
              <Table>
                <TBody>
                  {summary.childHomework.map((h) => (
                    <TR key={h.id}>
                      <TD className="font-medium">{h.title}</TD>
                      <TD>{h.student}</TD>
                      <TD className="text-right">
                        <Badge variant={statusVariant(h.status)}>
                          {h.status && st.has(h.status) ? st(h.status) : h.status}
                        </Badge>
                      </TD>
                    </TR>
                  ))}
                  {!summary.childHomework.length && (
                    <TR>
                      <TD className="text-ink-faint">{t("noHomeworkYet")}</TD>
                    </TR>
                  )}
                </TBody>
              </Table>
            </CardBody>
          </Card>
        </div>
      )}

      {roleBase === "student" && (
        <div className="grid gap-5 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>{t("myHomework")}</CardTitle>
              <CardDescription>{t("myHomeworkDesc")}</CardDescription>
            </CardHeader>
            <CardBody className="px-0">
              <Table>
                <TBody>
                  {summary.myHomework.map((h) => (
                    <TR key={h.id}>
                      <TD className="font-medium">{h.title}</TD>
                      <TD className="text-right">
                        <Badge variant={statusVariant(h.status)}>
                          {h.status && st.has(h.status) ? st(h.status) : h.status}
                        </Badge>
                      </TD>
                    </TR>
                  ))}
                  {!summary.myHomework.length && (
                    <TR>
                      <TD className="text-ink-faint">{t("noHomeworkAssigned")}</TD>
                    </TR>
                  )}
                </TBody>
              </Table>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("assessments")}</CardTitle>
              <CardDescription>{t("assessmentsDesc")}</CardDescription>
            </CardHeader>
            <CardBody className="px-0">
              <Table>
                <TBody>
                  {summary.myAssessments.map((a) => (
                    <TR key={a.id}>
                      <TD className="font-medium">{a.title}</TD>
                      <TD className="text-right tabular-nums">
                        {a.score} / {a.max_score}
                      </TD>
                    </TR>
                  ))}
                  {!summary.myAssessments.length && (
                    <TR>
                      <TD className="text-ink-faint">{t("noAssessmentsYet")}</TD>
                    </TR>
                  )}
                </TBody>
              </Table>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("progress")}</CardTitle>
              <CardDescription>{t("progressDesc")}</CardDescription>
            </CardHeader>
            <CardBody>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold tabular-nums text-ink">
                    {summary.myProgress?.lessons_achieved ?? 0}
                  </p>
                  <p className="text-xs text-ink-muted">{t("lessonsAchieved")}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums text-ink">
                    {summary.myProgress?.evidence ?? 0}
                  </p>
                  <p className="text-xs text-ink-muted">{t("evidenceItems")}</p>
                </div>
              </dl>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
