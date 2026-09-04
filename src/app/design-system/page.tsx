"use client";

import { useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogActions,
  EmptyState,
  ErrorState,
  Field,
  FilterBar,
  FilterPill,
  Icon,
  Input,
  LoadingState,
  Pagination,
  SearchInput,
  Select,
  SelectFilter,
  Skeleton,
  SkeletonText,
  Spinner,
  Switch,
  Table,
  TableEmpty,
  TableSkeleton,
  TBody,
  TD,
  Textarea,
  TH,
  THead,
  TR,
  ToastProvider,
  useToast,
} from "@/components/ui";

const SWATCHES: Array<{ name: string; token: string; hex: string }> = [
  { name: "Brand 600", token: "bg-brand-600", hex: "#4f46e5" },
  { name: "Brand 100", token: "bg-brand-100", hex: "#e0e7ff" },
  { name: "Ink 900", token: "bg-ink-900", hex: "#0f172a" },
  { name: "Ink 500", token: "bg-ink-500", hex: "#64748b" },
  { name: "Ink 200", token: "bg-ink-200", hex: "#e2e8f0" },
  { name: "Success 500", token: "bg-success-500", hex: "#10b981" },
  { name: "Warning 500", token: "bg-warning-500", hex: "#f59e0b" },
  { name: "Danger 500", token: "bg-danger-500", hex: "#f43f5e" },
  { name: "Info 500", token: "bg-info-500", hex: "#0ea5e9" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-wrap items-start gap-4">{children}</CardBody>
    </Card>
  );
}

function ToastDemo() {
  const toast = useToast();
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={() => toast.success("Saved", "Changes were saved.")}>
        Success
      </Button>
      <Button variant="secondary" onClick={() => toast.error("Failed", "Could not save changes.")}>
        Error
      </Button>
      <Button variant="secondary" onClick={() => toast.info("Heads up", "A new version is available.")}>
        Info
      </Button>
      <Button variant="secondary" onClick={() => toast.warning("Careful", "This affects billing.")}>
        Warning
      </Button>
    </div>
  );
}

const ROWS = [
  { name: "Anna", level: "A2", status: "active", badges: 4 },
  { name: "Boris", level: "B1", status: "active", badges: 7 },
  { name: "Carla", level: "A1", status: "pending", badges: 0 },
];

export default function DesignSystemPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [level, setLevel] = useState("");

  return (
    <ToastProvider>
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-card bg-brand-600 text-ink-inverse">
            <Icon name="students" size={22} />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-ink">FSMS V2 — Design system</h1>
            <p className="text-sm text-ink-muted">
              Phase 9 · every UI primitive below is reusable and token-driven.
            </p>
          </div>
          <div className="ml-auto">
            <ButtonLink href="/login" variant="secondary" size="sm">
              Sign in
            </ButtonLink>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* colour tokens */}
          <Card>
            <CardHeader>
              <CardTitle>Colour tokens</CardTitle>
              <CardDescription>
                Defined in globals.css via @theme — used everywhere as Tailwind utilities.
              </CardDescription>
            </CardHeader>
            <CardBody className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-9">
              {SWATCHES.map((s) => (
                <div key={s.token} className="flex flex-col gap-1.5">
                  <span className={`h-14 rounded-field border border-line ${s.token}`} />
                  <span className="text-xs font-medium text-ink">{s.name}</span>
                  <span className="font-mono text-[10px] text-ink-faint">{s.hex}</span>
                </div>
              ))}
            </CardBody>
          </Card>

          {/* typography */}
          <Card>
            <CardHeader>
              <CardTitle>Typography</CardTitle>
            </CardHeader>
            <CardBody className="flex flex-col gap-2">
              <h1 className="text-2xl font-bold text-ink">Heading 1 — text-2xl bold</h1>
              <h2 className="text-xl font-semibold text-ink">Heading 2 — text-xl semibold</h2>
              <h3 className="text-base font-semibold text-ink">Heading 3 — text-base semibold</h3>
              <p className="text-sm text-ink-muted">
                Body — text-sm muted. The quick brown fox jumps over the lazy dog.
              </p>
              <p className="font-mono text-xs text-ink-faint">Mono — text-xs faint (IDs, keys).</p>
            </CardBody>
          </Card>

          {/* buttons */}
          <Section title="Buttons">
            <div className="flex flex-wrap items-center gap-2">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button loading>Loading</Button>
              <Button disabled>Disabled</Button>
            </div>
          </Section>

          {/* form controls */}
          <Section title="Form controls">
            <div className="grid w-full gap-4 sm:grid-cols-2">
              <Field label="Full name" htmlFor="ds-name" required>
                <Input id="ds-name" placeholder="Jane Doe" />
              </Field>
              <Field label="Email" htmlFor="ds-email" error="Enter a valid address">
                <Input id="ds-email" type="email" placeholder="jane@school.org" />
              </Field>
              <Field label="Notes" htmlFor="ds-notes" hint="Optional context.">
                <Textarea id="ds-notes" placeholder="Write something…" />
              </Field>
              <Field label="Role" htmlFor="ds-role">
                <Select id="ds-role" defaultValue="">
                  <option value="" disabled>
                    Choose…
                  </option>
                  <option value="teacher">Teacher</option>
                  <option value="parent">Parent</option>
                  <option value="student">Student</option>
                </Select>
              </Field>
            </div>
            <div className="flex flex-col gap-3">
              <Checkbox label="Notify by email" description="Send weekly summaries." defaultChecked />
              <Checkbox label="Notify by SMS" />
              <Switch label="Enable reminders" defaultChecked />
            </div>
          </Section>

          {/* data display */}
          <Section title="Badges & avatars">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="neutral">neutral</Badge>
              <Badge variant="brand">brand</Badge>
              <Badge variant="success">success</Badge>
              <Badge variant="warning">warning</Badge>
              <Badge variant="danger">danger</Badge>
              <Badge variant="info">info</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Avatar name="Anna Smirnova" />
              <Avatar name="Boris Ivanov" size={44} />
              <Avatar name="Carla" size={28} />
              <Avatar name="Anna Smirnova" badge="1" />
              <Avatar name="Boris Ivanov" badge="2" badgeClassName="bg-ink-500" />
              <Avatar name="Carla" badge="3" badgeClassName="bg-warning-600" />
            </div>
          </Section>

          {/* tables */}
          <Card>
            <CardHeader>
              <CardTitle>Table</CardTitle>
              <CardDescription>Hover rows, header styling, empty state, skeleton.</CardDescription>
            </CardHeader>
            <CardBody className="px-0">
              <Table>
                <THead>
                  <TR>
                    <TH>Student</TH>
                    <TH>Level</TH>
                    <TH>Status</TH>
                    <TH className="text-right">Badges</TH>
                  </TR>
                </THead>
                <TBody>
                  {ROWS.map((r) => (
                    <TR key={r.name}>
                      <TD className="font-medium">{r.name}</TD>
                      <TD>{r.level}</TD>
                      <TD>
                        <Badge variant={r.status === "active" ? "success" : "warning"}>
                          {r.status}
                        </Badge>
                      </TD>
                      <TD className="text-right">{r.badges}</TD>
                    </TR>
                  ))}
                  <TableEmpty colSpan={4}>
                    <span className="text-sm text-ink-faint">End of list</span>
                  </TableEmpty>
                </TBody>
              </Table>
            </CardBody>
            <CardFooter>
              <TableSkeleton rows={2} cols={4} />
            </CardFooter>
          </Card>

          {/* dialogs */}
          <Section title="Dialog">
            <Button onClick={() => setDialogOpen(true)}>Open dialog</Button>
            <Dialog
              open={dialogOpen}
              onClose={() => setDialogOpen(false)}
              title="Confirm action"
              description="This dialog is portal-rendered, ESC/backdrop close it."
              footer={
                <DialogActions
                  onClose={() => setDialogOpen(false)}
                  confirmLabel="Confirm"
                  onConfirm={() => setDialogOpen(false)}
                />
              }
            >
              <p className="text-sm text-ink-muted">
                Put any content here — forms, confirmation text, settings.
              </p>
            </Dialog>
            <ToastDemo />
          </Section>

          {/* states */}
          <Card>
            <CardHeader>
              <CardTitle>Loading / empty / error states</CardTitle>
            </CardHeader>
            <CardBody className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-field border border-line bg-surface">
                <LoadingState label="Loading students…" />
              </div>
              <div className="rounded-field border border-line bg-surface">
                <EmptyState
                  title="No students yet"
                  description="Add your first student to get started."
                  action={<Button size="sm">Add student</Button>}
                />
              </div>
              <div className="rounded-field border border-line bg-surface">
                <ErrorState title="Failed to load" onRetry={() => undefined} />
              </div>
            </CardBody>
            <CardBody className="flex flex-wrap items-center gap-4">
              <Spinner size={24} />
              <Skeleton className="h-8 w-40" />
              <SkeletonText lines={3} className="w-56" />
            </CardBody>
          </Card>

          {/* search + filter */}
          <Card>
            <CardHeader>
              <CardTitle>Search & filtering</CardTitle>
              <CardDescription>
                Debounced search ({debounced || "—"}) and filter controls.
              </CardDescription>
            </CardHeader>
            <CardBody className="flex flex-col gap-4">
              <SearchInput
                value={query}
                onValueChange={setQuery}
                onDebouncedChange={setDebounced}
                className="max-w-sm"
                placeholder="Search students…"
              />
              <FilterBar>
                <SelectFilter
                  label="Level"
                  value={level}
                  onChange={setLevel}
                  options={[
                    { value: "a1", label: "A1" },
                    { value: "a2", label: "A2" },
                    { value: "b1", label: "B1" },
                  ]}
                />
                <SelectFilter
                  label="Status"
                  value=""
                  onChange={() => undefined}
                  options={[
                    { value: "active", label: "Active" },
                    { value: "pending", label: "Pending" },
                  ]}
                />
                {level && (
                  <FilterPill
                    label="Level"
                    value={level.toUpperCase()}
                    onClear={() => setLevel("")}
                  />
                )}
              </FilterBar>
            </CardBody>
          </Card>

          {/* pagination */}
          <Card>
            <CardHeader>
              <CardTitle>Pagination</CardTitle>
            </CardHeader>
            <CardBody>
              <Pagination page={page} pageSize={20} total={137} onPageChange={setPage} />
            </CardBody>
          </Card>
        </div>
      </main>
    </ToastProvider>
  );
}
