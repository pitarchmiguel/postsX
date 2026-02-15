import { AppNav } from "@/components/app-nav";
import { CommandPalette } from "@/components/command-palette";
import { Toaster } from "@/components/ui/sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <CommandPalette />
      <AppNav />
      <main className="pb-16 pt-4 md:pb-4 md:pt-16">
        <div className="mx-auto max-w-4xl px-4">{children}</div>
      </main>
      <Toaster />
    </div>
  );
}
