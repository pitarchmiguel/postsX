"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboardIcon,
  FileTextIcon,
  PenSquareIcon,
  BarChart3Icon,
  SettingsIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/posts", label: "Posts", icon: FileTextIcon },
  { href: "/composer", label: "Composer", icon: PenSquareIcon },
  { href: "/analytics", label: "Analytics", icon: BarChart3Icon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:bottom-auto md:top-0 md:border-b md:border-t-0">
      <div className="flex h-14 items-center justify-around gap-1 px-2 md:justify-start md:gap-0 md:px-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Button
              key={href}
              variant={isActive ? "secondary" : "ghost"}
              size="sm"
              asChild
              className={cn(
                "flex-1 md:flex-none md:px-4",
                isActive && "bg-muted"
              )}
            >
              <Link href={href} className="flex items-center gap-2">
                <Icon className="size-4" />
                <span className="sr-only md:not-sr-only text-xs md:text-sm">{label}</span>
              </Link>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
