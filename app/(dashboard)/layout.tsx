import { AppNav } from "@/components/app-nav";
import { CommandPaletteWrapper } from "@/components/command-palette-wrapper";
import { Toaster } from "@/components/ui/sonner";
import { SchedulerPoll } from "@/components/scheduler-poll";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <SchedulerPoll />
      <CommandPaletteWrapper />
      <AppNav />
      <main className="pb-16 pt-4 md:pb-4 md:pt-16">
        <div className="mx-auto max-w-4xl px-4">{children}</div>
      </main>
      <Toaster />
    </div>
  );
}
