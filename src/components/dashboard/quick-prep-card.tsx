import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icons";

export function QuickPrepCard() {
  const t = useTranslations("dashboard");

  const steps = [
    {
      num: 1,
      title: t("quickPrepClass"),
      bg: "#DBEAFE",
      fg: "#1E3A8A",
      iconName: "classes" as const,
    },
    {
      num: 2,
      title: t("quickPrepDates"),
      bg: "#FEF3C7",
      fg: "#B45309",
      iconName: "calendar" as const,
    },
    {
      num: 3,
      title: t("quickPrepPage"),
      bg: "#DBEAFE",
      fg: "#2563EB",
      iconName: "lessons" as const,
    },
    {
      num: 4,
      title: t("quickPrepHw"),
      bg: "#EDE9FE",
      fg: "#7C3AED",
      iconName: "homework" as const,
    },
  ];

  return (
    <div className="card overflow-hidden bg-surface border border-line rounded-card shadow-card">
      <div className="flex flex-col gap-0.5 border-b border-line px-5 py-4">
        <h3 className="text-[16px] font-semibold text-ink">
          {t("quickPrepTitle")}
        </h3>
        <span className="text-xs font-medium text-ink-muted">
          {t("quickPrepHint")}
        </span>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-4 gap-2">
          {steps.map((step) => (
            <div
              key={step.num}
              className="group flex flex-col items-center justify-center rounded-xl border border-line bg-surface p-2.5 text-center transition-all hover:border-[#3B82F6] hover:shadow-sm"
            >
              <div className="mb-1.5 flex size-4.5 items-center justify-center rounded-full bg-[#1E3A8A] text-[10px] font-bold text-white">
                {step.num}
              </div>
              <div
                className="mb-1.5 flex size-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: step.bg, color: step.fg }}
              >
                <Icon name={step.iconName} size={17} />
              </div>
              <div className="truncate text-[11px] font-semibold text-ink group-hover:text-brand-700">
                {step.title}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 pt-1">
          <Link
            href="/materials"
            className="inline-flex items-center gap-2 rounded-lg bg-[#1E3A8A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1B3480]"
          >
            <span>{t("quickPrepStart")}</span>
            <span className="text-sm">&rarr;</span>
          </Link>
          <span className="text-xs font-semibold text-[#3B82F6]">
            {t("quickPrepFast")}
          </span>
        </div>
      </div>
    </div>
  );
}
