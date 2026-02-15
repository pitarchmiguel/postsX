import { ComposerForm } from "@/components/composer-form";

export default function ComposerPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; reschedule?: string }>;
}) {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Composer</h1>
      <ComposerForm searchParams={searchParams} />
    </div>
  );
}
