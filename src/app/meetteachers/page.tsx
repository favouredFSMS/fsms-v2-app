import React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Meet Our Teachers — FSMS" };

interface TeacherCardData {
  id: string;
  name: string;
  role: string;
  languages: string[];
  bio: string;
  rating: number;
  lessonsTaught: number;
  avatarBg: string;
}

const TEACHER_ROSTER: TeacherCardData[] = [
  {
    id: "t1",
    name: "Elena V. Petrova",
    role: "Senior ESL Instructor",
    languages: ["English (C2)", "Russian (Native)"],
    bio: "Over 10 years of Cambridge English & CEFR preparation experience. Specializes in conversational fluency and young learner development.",
    rating: 4.9,
    lessonsTaught: 480,
    avatarBg: "bg-blue-800",
  },
  {
    id: "t2",
    name: "Marcus Dupont",
    role: "French & English Specialist",
    languages: ["French (Native)", "English (C1)", "Russian (B2)"],
    bio: "Focuses on grammar structures, pronunciation phonetics, and interactive drama workshops for teenagers and adult learners.",
    rating: 4.8,
    lessonsTaught: 320,
    avatarBg: "bg-indigo-800",
  },
  {
    id: "t3",
    name: "Li Wei",
    role: "Chinese & Linguistics Instructor",
    languages: ["Mandarin (Native)", "English (C1)", "Russian (C1)"],
    bio: "HSK and YCT accredited instructor with modern multimedia approach to character learning and spoken tone mastery.",
    rating: 5.0,
    lessonsTaught: 210,
    avatarBg: "bg-amber-800",
  },
];

export default function MeetTeachersPage() {
  return (
    <PageShell title="Meet Our Teachers">
      <div className="space-y-6">
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 text-white shadow-md">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-2xl">
              🎓
            </span>
            <div>
              <h2 className="text-xl font-bold">Academic Faculty & Teaching Team</h2>
              <p className="mt-1 text-sm text-blue-200">
                Meet our certified native and bilingual instructors dedicated to language excellence.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {TEACHER_ROSTER.map((t) => (
            <Card key={t.id} className="border border-slate-200 transition hover:shadow-lg">
              <CardBody className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${t.avatarBg} text-xl font-black text-white shadow-md`}>
                    {t.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">{t.name}</h3>
                    <p className="text-xs font-semibold text-blue-900">{t.role}</p>
                    <div className="mt-1 flex items-center gap-1 text-xs font-bold text-amber-600">
                      ⭐ {t.rating.toFixed(1)} <span className="text-slate-400 font-normal">({t.lessonsTaught} lessons)</span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed">{t.bio}</p>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Languages</span>
                  <div className="flex flex-wrap gap-1.5">
                    {t.languages.map((l) => (
                      <Badge key={l} variant="neutral">
                        {l}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
