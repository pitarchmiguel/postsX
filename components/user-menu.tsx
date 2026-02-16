"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { UserIcon, LogOutIcon, CheckCircleIcon, XCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type UserData = {
  email: string;
  xUsername: string | null;
  xName: string | null;
  xProfileImageUrl: string | null;
  xConnected: boolean;
};

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

export function UserMenu() {
  const [user, setUser] = useState<UserData | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((data: UserData & { error?: string }) => {
        if (data.email && !data.error) {
          setUser(data);
        }
      })
      .catch(() => {});
  }, []);

  if (!user) {
    return (
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted md:ml-4">
        <UserIcon className="size-5 text-muted-foreground" aria-hidden />
      </div>
    );
  }

  const initial = user.email?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="shrink-0 md:ml-4">
      <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 rounded-full p-0"
          aria-label="Menú de usuario"
        >
          {user.xProfileImageUrl ? (
            <img
              src={user.xProfileImageUrl}
              alt=""
              className="size-9 rounded-full object-cover"
            />
          ) : (
            <span
              className={cn(
                "flex size-9 items-center justify-center rounded-full text-sm font-medium",
                "bg-primary text-primary-foreground"
              )}
            >
              {initial}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side={isMobile ? "top" : "bottom"}
        className="min-w-56"
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium leading-none">{user.email}</p>
            {user.xConnected && user.xUsername && (
              <p className="text-xs text-muted-foreground">@{user.xUsername}</p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {user.xConnected ? (
            <div className="flex items-center gap-2 px-2 py-2 text-xs text-green-600 dark:text-green-400">
              <CheckCircleIcon className="size-4 shrink-0" />
              <span>
                Conectado a X{user.xUsername ? `: @${user.xUsername}` : ""}
              </span>
            </div>
          ) : (
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2">
                <XCircleIcon className="size-4" />
                <span>No conectado a X — Conectar en Ajustes</span>
              </Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <form action="/auth/signout" method="post">
          <DropdownMenuItem asChild>
            <button
              type="submit"
              className="flex w-full cursor-default items-center gap-2"
            >
              <LogOutIcon className="size-4" />
              Salir
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
    </div>
  );
}
