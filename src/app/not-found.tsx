import { EmptyState } from "@/components/ui/states";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <EmptyState
        icon="search"
        title="Not found"
        description="The page you requested does not exist."
      />
    </main>
  );
}
