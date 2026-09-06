import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icons";
import { Avatar } from "@/components/ui/avatar";
import type { DashboardRemark } from "@/lib/db/repos/dashboard";

export interface StaffRemarksCardProps {
  remarks: DashboardRemark[];
}

export function StaffRemarksCard({ remarks }: StaffRemarksCardProps) {
  const t = useTranslations("dashboard");

  return (
    <div className="card overflow-hidden bg-surface border border-line rounded-card shadow-card">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="text-[#4338CA]">
            <Icon name="lessons" size={18} />
          </span>
          <h3 className="text-[16px] font-semibold text-ink">
            {t("remarksTitle")}
          </h3>
        </div>

        <Link
          href="/messaging"
          className="inline-flex items-center gap-1 rounded-lg bg-[#1E3A8A] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#1B3480] transition-colors"
        >
          <Icon name="plus" size={13} />
          <span>{t("newRemark")}</span>
        </Link>
      </div>

      <div className="divide-y divide-line max-h-[320px] overflow-y-auto">
        {remarks.length > 0 ? (
          remarks.map((r) => (
            <div key={r.id} className="p-4 hover:bg-surface-muted transition-colors">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar name={r.studentName} size={24} className="bg-brand-50 text-brand-700" />
                  <span className="truncate text-xs font-bold text-ink">
                    {r.studentName}
                  </span>
                  <span className="text-[11px] text-ink-muted truncate">
                    ({r.teacherName})
                  </span>
                </div>
                <span className="text-[11px] text-ink-muted tabular-nums shrink-0">
                  {r.date}
                </span>
              </div>
              <p className="text-xs text-ink-muted line-clamp-2 leading-relaxed">
                {r.body}
              </p>
            </div>
          ))
        ) : (
          <div className="py-8 text-center text-sm text-ink-muted">
            {t("noRemarks")}
          </div>
        )}
      </div>
    </div>
  );
}
