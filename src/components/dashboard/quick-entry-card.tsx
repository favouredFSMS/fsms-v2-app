import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icons";

export function QuickEntryCard() {
  const t = useTranslations("dashboard");

  const steps = [
    {
      num: 1,
      title: t("quickEntryPrepare"),
      bg: "#DBEAFE",
      fg: "#1D4ED8",
      iconName: "lessons" as const,
    },
    {
      num: 2,
      title: t("quickEntryTeach"),
      bg: "#FEF3C7",
      fg: "#B45309",
      iconName: "learning" as const,
    },
    {
      num: 3,
      title: t("quickEntryComplete"),
      bg: "#D1FAE5",
      fg: "#047857",
      iconName: "check" as const,
    },
  ];

  return (
    <div className="card overflow-hidden bg-surface border border-line rounded-card shadow-card">
      <div className="flex items-center gap-2 border-b border-line px-5 py-4">
        <h3 className="text-[16px] font-semibold text-ink">
          {t("quickEntryTitle")}
        </h3>
        <span className="text-xs font-medium text-ink-muted">
          {t("quickEntryLifecycleHint")}
        </span>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {steps.map((step) => (
            <div
              key={step.num}
              className="group flex flex-col items-center justify-center rounded-xl border border-line bg-surface p-3 text-center transition-all hover:border-[#3B82F6] hover:shadow-sm"
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
              <div className="text-xs font-semibold text-ink group-hover:text-brand-700">
                {step.title}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 pt-1">
          <Link
            href="/attendance"
            className="inline-flex items-center gap-2 rounded-lg bg-[#1E3A8A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1B3480]"
          >
            <span>{t("quickEntryStartNow")}</span>
            <span className="text-sm">&rarr;</span>
          </Link>
          <span className="text-xs font-semibold text-[#3B82F6]">
            {t("quickEntryFastHint")}
          </span>
        </div>
      </div>
    </div>
  );
}
