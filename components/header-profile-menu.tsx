"use client";

import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/profile";

export function HeaderProfileMenu({
  profile,
  initials,
  roleLabel,
  setupLock = false,
  hideAccount = false,
}: {
  profile: Profile | null;
  initials: string;
  roleLabel: string;
  setupLock?: boolean;
  hideAccount?: boolean;
}) {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const displayName =
    profile?.full_name?.trim() ||
    user?.email?.split("@")[0] ||
    "HomeFix member";
  const email = user?.email ?? "";

  async function logout() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "group flex size-11 shrink-0 items-center justify-center rounded-full",
          "bg-primary text-xs font-bold text-primary-foreground",
          "shadow-[0_4px_14px_oklch(0.24_0.045_245/0.18)] ring-2 ring-card",
          "transition-[box-shadow,background-color] duration-200 hover:bg-primary/90",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "data-popup-open:ring-primary/40 data-popup-open:shadow-[0_0_0_3px_rgba(45,212,191,0.25)]",
        )}
        aria-label="Open account menu"
      >
        <span aria-hidden="true">{initials}</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className={cn(
          "w-[min(100vw-2rem,17.5rem)] overflow-hidden rounded-2xl border border-border bg-card p-0",
          "shadow-[0_24px_60px_rgba(15,23,42,0.14)]",
        )}
      >
        <DropdownMenuGroup className="p-0">
          <div className="border-b border-border bg-gradient-to-br from-secondary via-card to-background px-4 py-4">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "grid size-11 shrink-0 place-items-center rounded-full",
                  "bg-primary text-sm font-bold text-primary-foreground",
                  "shadow-inner shadow-primary/15 ring-2 ring-white",
                )}
              >
                {initials}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="truncate text-[15px] font-semibold leading-tight text-foreground">
                  {displayName}
                </p>
                {email && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{email}</p>
                )}
                <span className="mt-2 inline-flex rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>
        </DropdownMenuGroup>

        <DropdownMenuGroup className="space-y-0.5 p-2">
          {!setupLock && !hideAccount && (
            <DropdownMenuItem
              className={cn(
                "cursor-pointer gap-3 rounded-xl px-2 py-2.5",
                "text-foreground focus:bg-secondary focus:text-foreground",
              )}
              onClick={() => router.push("/account")}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground ring-1 ring-border/60">
                <User className="size-4" strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-sm font-semibold leading-tight">My profile</span>
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                  Account & preferences
                </span>
              </span>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="mx-2 my-0 bg-muted" />

        <DropdownMenuGroup className="p-2 pt-1">
          <DropdownMenuItem
            variant="destructive"
            className={cn(
              "cursor-pointer gap-3 rounded-xl px-2 py-2.5",
              "text-rose-700 focus:bg-rose-50 focus:text-rose-800",
              "data-[variant=destructive]:focus:bg-rose-50",
            )}
            onClick={() => void logout()}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
              <LogOut className="size-4" strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-sm font-semibold leading-tight">Log out</span>
              <span className="mt-0.5 block text-xs font-normal text-rose-600/80">
                Sign out of HomeFix
              </span>
            </span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
