import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui/states";

export default async function NotFound() {
  const t = await getTranslations("states");
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <EmptyState
        icon="search"
        title={t("notFoundTitle")}
        description={t("notFoundDesc")}
      />
    </main>
  );
}
