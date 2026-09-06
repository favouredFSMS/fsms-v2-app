import { requireUser } from "@/lib/auth/guards";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Icon } from "@/components/ui/icons";
import Link from "next/link";

export const metadata = { title: "Study — FSMS" };

export default async function StudyPage() {
  await requireUser();

  const studyModules = [
    {
      id: "summary",
      title: "Lesson Summary & Key Points",
      desc: "Review concise bullet summaries and core vocabulary from recent lessons.",
      icon: "note" as const,
      bg: "bg-indigo-50",
      color: "text-indigo-700",
      border: "border-indigo-200",
    },
    {
      id: "recommend",
      title: "AI Adaptive Recommendations",
      desc: "Targeted focus areas based on recent attendance and assessment scores.",
      icon: "bulb" as const,
      bg: "bg-amber-50",
      color: "text-amber-700",
      border: "border-amber-200",
    },
    {
      id: "materials",
      title: "Course Materials & Drive Assets",
      desc: "Open digital textbooks, audio workbooks, and lesson slides.",
      icon: "materials" as const,
      bg: "bg-emerald-50",
      color: "text-emerald-700",
      border: "border-emerald-200",
    },
    {
      id: "drill",
      title: "Interactive Practice Drill",
      desc: "Jump directly into practice quizzes and earn CEFR achievement stars.",
      icon: "trophy" as const,
      bg: "bg-purple-50",
      color: "text-purple-700",
      border: "border-purple-200",
      link: "/practice",
    },
  ];

  return (
    <PageShell title="Study & Independent Learning">
      <div className="space-y-6">
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-900 to-indigo-900 p-6 text-white shadow-md">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-2xl">
              💡
            </span>
            <div>
              <h2 className="text-xl font-bold">Autonomous Study Center</h2>
              <p className="mt-1 text-sm text-blue-200">
                AI-assisted lesson reviews, digital materials, and guided language drills.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {studyModules.map((m) => (
            <Card key={m.id} className={`border ${m.border} transition hover:shadow-lg`}>
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${m.bg} ${m.color}`}>
                  <Icon name={m.icon} size={20} />
                </div>
                <h3 className="font-bold text-slate-800">{m.title}</h3>
              </CardHeader>
              <CardBody className="space-y-4">
                <p className="text-sm text-slate-600">{m.desc}</p>
                {m.link ? (
                  <Link
                    href={m.link}
                    className="inline-flex items-center gap-2 text-sm font-bold text-blue-900 hover:text-blue-700"
                  >
                    Start Drill <span aria-hidden="true">&rarr;</span>
                  </Link>
                ) : (
                  <button className="inline-flex items-center gap-2 text-sm font-bold text-blue-900 hover:text-blue-700">
                    Open Resource <span aria-hidden="true">&rarr;</span>
                  </button>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
