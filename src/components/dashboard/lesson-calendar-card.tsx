"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/ui/cn";

export function LessonCalendarCard() {
  const t = useTranslations("dashboard");
  const locale = useLocale();

  // Current calendar month view
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(currentDate);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToday = () => {
    setCurrentDate(new Date());
  };

  // Build days for month
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Monday = 0, Sunday = 6 in European style
  let startingDayOfWeek = firstDay.getDay() - 1;
  if (startingDayOfWeek < 0) startingDayOfWeek = 6;

  const totalDays = lastDay.getDate();
  const days = [];

  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    days.push(d);
  }

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const currentDay = isCurrentMonth ? today.getDate() : -1;

  const weekdays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  return (
    <div className="card overflow-hidden bg-surface border border-line rounded-card shadow-card">
      {/* Calendar Header with navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="text-[#1E3A8A]">
            <Icon name="calendar" size={19} />
          </span>
          <h3 className="text-[16px] font-semibold text-ink capitalize">
            {monthLabel}
          </h3>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={prevMonth}
            className="rounded-lg border border-line bg-surface p-1.5 text-ink-muted hover:bg-surface-sunken hover:text-ink focus-ring"
            title={t("calendarPrev")}
          >
            <Icon name="chevron-left" size={14} />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-ink hover:bg-surface-sunken focus-ring"
          >
            {t("calendarToday")}
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="rounded-lg border border-line bg-surface p-1.5 text-ink-muted hover:bg-surface-sunken hover:text-ink focus-ring"
            title={t("calendarNext")}
          >
            <Icon name="chevron-right" size={14} />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="p-4">
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-ink-muted pb-2 border-b border-line/60">
          {weekdays.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1 pt-2 text-center text-xs">
          {days.map((d, index) => {
            if (d === null) {
              return <div key={`empty-${index}`} className="h-8 py-1.5" />;
            }
            const isToday = d === currentDay;
            // Simulated scheduled lessons on weekdays for authentic operational view
            const dayOfWeek = (startingDayOfWeek + d - 1) % 7;
            const hasLessons = dayOfWeek >= 0 && dayOfWeek <= 4 && d % 2 === 0;

            return (
              <div
                key={d}
                className={cn(
                  "relative flex h-8 flex-col items-center justify-center rounded-lg font-medium transition-colors cursor-pointer",
                  isToday
                    ? "bg-[#1E3A8A] text-white font-bold shadow-xs"
                    : "text-ink hover:bg-surface-muted",
                )}
              >
                <span>{d}</span>
                {hasLessons && (
                  <span
                    className={cn(
                      "absolute bottom-1 size-1 rounded-full",
                      isToday ? "bg-[#F4B400]" : "bg-[#3B82F6]",
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
