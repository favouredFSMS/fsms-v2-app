"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icons";
import type { DashboardTodaysClass } from "@/lib/db/repos/dashboard";
import { QuickEntryModal } from "@/components/dashboard/quick-entry-modal";

export interface TodaysClassesCardProps {
  classes: DashboardTodaysClass[];
}

export function TodaysClassesCard({ classes }: TodaysClassesCardProps) {
  const t = useTranslations("dashboard");
  const [activeClassId, setActiveClassId] = useState<string | null>(null);

  const classesForModal = classes.map((c) => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <>
      <div className="card overflow-hidden bg-surface border border-line rounded-card shadow-card">
        <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
          <span className="text-[#1E3A8A]">
            <Icon name="calendar" size={19} />
          </span>
          <h3 className="text-[16px] font-semibold text-ink">
            {t("todaysClassesTitle")}
          </h3>
        </div>

        <div className="divide-y divide-line">
          {classes.length > 0 ? (
            classes.map((c) => (
              <div
                key={c.id}
                className="cls-row flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-surface-muted transition-colors"
              >
                <div className="cls-time shrink-0">
                  <div className="t1 text-sm font-bold text-ink">{c.startTime}</div>
                  <div className="t2 text-xs text-ink-muted">- {c.endTime}</div>
                </div>

                <div className="cls-meta min-w-0 flex-1">
                  <div className="cls-name truncate text-sm font-semibold text-ink">{c.name}</div>
                  <div className="cls-sub truncate text-xs text-ink-muted">
                    {c.level_code.toUpperCase()} · {c.students} {t("students").toLowerCase()}
                  </div>
                </div>

                <div className="cls-lesson shrink-0 hidden sm:block">
                  <div className="l1 text-xs font-semibold text-ink">
                    {t("lessonNum", { num: c.lessonNo })}
                  </div>
                  <div className="l2 max-w-[120px] truncate text-xs font-medium text-[#3B82F6]">
                    {c.topic}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveClassId(c.id)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#3B82F6] px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-[#2563EB]"
                >
                  <span>{t("startClass")}</span>
                  <span className="text-xs">&rarr;</span>
                </button>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-sm text-ink-muted">
              {t("noClassesToday")}
            </div>
          )}
        </div>

        <div className="border-t border-line px-5 py-3 text-center bg-surface-muted/50">
          <Link
            href="/classes"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#3B82F6] hover:underline"
          >
            <span>{t("viewSchedule")}</span>
            <span>&rarr;</span>
          </Link>
        </div>
      </div>

      {activeClassId && (
        <QuickEntryModal
          isOpen={true}
          onClose={() => setActiveClassId(null)}
          classes={classesForModal}
          defaultClassId={activeClassId}
        />
      )}
    </>
  );
}
