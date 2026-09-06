import React from "react";

export type CefrLevel = "PRE_A1" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export interface CefrBadgeShieldProps {
  level: CefrLevel;
  size?: "sm" | "md" | "lg" | "xl";
  showLabel?: boolean;
  score?: number; // 0 - 100
  unlocked?: boolean;
}

const LEVEL_CONFIG: Record<
  CefrLevel,
  { label: string; sub: string; bg: string; border: string; text: string; ring: string }
> = {
  PRE_A1: {
    label: "Pre-A1",
    sub: "Starters",
    bg: "from-sky-400 to-blue-600",
    border: "border-sky-300",
    text: "text-white",
    ring: "ring-sky-200",
  },
  A1: {
    label: "A1",
    sub: "Beginner",
    bg: "from-emerald-400 to-teal-600",
    border: "border-emerald-300",
    text: "text-white",
    ring: "ring-emerald-200",
  },
  A2: {
    label: "A2",
    sub: "Elementary",
    bg: "from-teal-500 to-emerald-700",
    border: "border-teal-300",
    text: "text-white",
    ring: "ring-teal-200",
  },
  B1: {
    label: "B1",
    sub: "Intermediate",
    bg: "from-amber-400 to-orange-500",
    border: "border-amber-300",
    text: "text-white",
    ring: "ring-amber-200",
  },
  B2: {
    label: "B2",
    sub: "Upper Int",
    bg: "from-orange-500 to-rose-600",
    border: "border-orange-300",
    text: "text-white",
    ring: "ring-orange-200",
  },
  C1: {
    label: "C1",
    sub: "Advanced",
    bg: "from-purple-500 to-indigo-700",
    border: "border-purple-300",
    text: "text-white",
    ring: "ring-purple-200",
  },
  C2: {
    label: "C2",
    sub: "Mastery",
    bg: "from-yellow-400 via-amber-500 to-yellow-600",
    border: "border-yellow-200",
    text: "text-slate-950 font-black",
    ring: "ring-yellow-300",
  },
};

const SIZE_CONFIG = {
  sm: { width: "w-14", height: "h-16", font: "text-xs", labelFont: "text-[9px]" },
  md: { width: "w-20", height: "h-24", font: "text-base", labelFont: "text-[11px]" },
  lg: { width: "w-28", height: "h-32", font: "text-xl", labelFont: "text-xs" },
  xl: { width: "w-36", height: "h-44", font: "text-2xl", labelFont: "text-sm" },
};

export function CefrBadgeShield({
  level,
  size = "md",
  showLabel = true,
  score,
  unlocked = true,
}: CefrBadgeShieldProps) {
  const conf = LEVEL_CONFIG[level] || LEVEL_CONFIG.A1;
  const sz = SIZE_CONFIG[size] || SIZE_CONFIG.md;

  return (
    <div className="inline-flex flex-col items-center gap-1.5 select-none">
      <div
        className={`relative ${sz.width} ${sz.height} transition-all duration-300 transform hover:scale-105 ${
          !unlocked ? "grayscale opacity-40" : ""
        }`}
      >
        {/* SVG Shield Path with gradient */}
        <svg
          viewBox="0 0 100 120"
          className="w-full h-full drop-shadow-md overflow-visible"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={`grad-${level}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" className="stop-color-current" />
              <stop offset="100%" className="stop-color-current" />
            </linearGradient>
            <filter id="gold-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Outer Shield border */}
          <path
            d="M50 5 L90 20 C90 75, 50 110, 50 115 C50 110, 10 75, 10 20 Z"
            className={`fill-gradient bg-gradient-to-br ${conf.bg}`}
            style={{ fill: `url(#grad-${level})` }}
          />

          {/* Inner Accent Line */}
          <path
            d="M50 12 L82 24 C82 70, 50 100, 50 104 C50 100, 18 70, 18 24 Z"
            fill="none"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="2"
          />

          {/* Level text */}
          <text
            x="50"
            y="54"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            className="font-black tracking-wider text-xl"
            style={{ fontSize: "24px", fontWeight: "900", fontFamily: "inherit" }}
          >
            {conf.label}
          </text>

          {/* Subtitle text inside shield */}
          <text
            x="50"
            y="72"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="rgba(255,255,255,0.9)"
            className="font-bold tracking-tight text-[10px]"
            style={{ fontSize: "10px", fontWeight: "700", fontFamily: "inherit" }}
          >
            {conf.sub}
          </text>
        </svg>

        {/* Optional Mastery percentage badge */}
        {score !== undefined && unlocked && (
          <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 border-2 border-white text-[9px] font-black text-amber-400 shadow-md">
            {score}%
          </div>
        )}
      </div>

      {showLabel && (
        <span className={`font-bold ${sz.labelFont} text-slate-700 tracking-tight`}>
          {conf.label} — {conf.sub}
        </span>
      )}
    </div>
  );
}

const DETERMINISTIC_CONFETTI = Array.from({ length: 15 }, (_, i) => ({
  top: `${(i * 17 + 5) % 80}%`,
  left: `${(i * 23 + 9) % 90}%`,
  bg: ["#F4B400", "#1E3A8A", "#10B981", "#EC4899", "#8B5CF6"][i % 5],
  rot: `${(i * 47) % 360}deg`,
  delay: `${(i % 5) * 0.15}s`,
}));

export function CelebrationModal({
  isOpen,
  onClose,
  title = "Level Mastery Unlocked!",
  subtitle = "Congratulations! You reached CEFR Level Proficiency.",
  level = "A1",
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  level?: CefrLevel;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Confetti & Fireworks overlay */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {DETERMINISTIC_CONFETTI.map((c, i) => (
            <div
              key={i}
              className="absolute h-3 w-3 rounded-full opacity-80"
              style={{
                top: c.top,
                left: c.left,
                backgroundColor: c.bg,
                transform: `rotate(${c.rot})`,
                animation: `ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite ${c.delay}`,
              }}
            />
          ))}
        </div>

        {/* Shield in spotlight */}
        <div className="relative my-4 flex justify-center">
          <div className="absolute -inset-4 rounded-full bg-amber-200/50 blur-xl animate-pulse" />
          <CefrBadgeShield level={level} size="xl" score={100} />
        </div>

        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h3>
        <p className="mt-2 text-sm text-slate-600 font-medium">{subtitle}</p>

        <div className="mt-6 flex justify-center">
          <button
            onClick={onClose}
            className="rounded-xl bg-blue-900 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-blue-800 transition"
          >
            Claim & Continue 🎉
          </button>
        </div>
      </div>
    </div>
  );
}
