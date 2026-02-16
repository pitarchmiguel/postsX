"use client";

import dynamic from "next/dynamic";

// Import CommandPalette with SSR disabled to prevent hydration mismatches
// from Radix UI Dialog's randomly generated IDs
const CommandPalette = dynamic(
  () => import("@/components/command-palette").then((mod) => ({ default: mod.CommandPalette })),
  { ssr: false }
);

export function CommandPaletteWrapper() {
  return <CommandPalette />;
}
