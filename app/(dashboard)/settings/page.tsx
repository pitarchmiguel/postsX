import { Suspense } from "react";
import { SettingsForm } from "@/components/settings-form";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading...</div>}>
        <SettingsForm />
      </Suspense>
    </div>
  );
}
