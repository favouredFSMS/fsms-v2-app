import { SCHOOL_TIMEZONE, schoolDateTime } from "@/lib/clock";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardDescription, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icons";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-card bg-brand-600 text-ink-inverse">
          <Icon name="students" size={24} />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">FSMS V2</h1>
          <p className="text-sm text-ink-muted">
            FAVOURED Student Management System — Next.js + Supabase
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardBody>
            <CardTitle className="mb-1">Authentication</CardTitle>
            <CardDescription className="mb-3">
              Login, logout and password recovery are live (Phase 8). Production
              auth is Supabase; local development uses a seeded dev harness.
            </CardDescription>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/login">Sign in</ButtonLink>
              <ButtonLink href="/design-system" variant="secondary">
                Design system
              </ButtonLink>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex items-center gap-3">
            <Icon name="calendar" size={18} className="text-ink-faint" />
            <p className="text-sm text-ink-muted">
              School timezone: <Badge variant="neutral">{SCHOOL_TIMEZONE}</Badge>{" "}
              · now: {schoolDateTime()}
            </p>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
