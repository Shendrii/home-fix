"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseBusiness, Building2, ClipboardList, CircleDollarSign,
  Grid2X2, HeartHandshake, Home, LayoutDashboard, MapPin, Menu, Search, Settings, Trophy, Users, Wrench,
} from "lucide-react";
import { ProfileSetupProgress } from "@/components/profile-setup-progress";
import { HeaderProfileMenu } from "@/components/header-profile-menu";
import { ExitViewAsButton } from "@/components/view-as-controls";
import { NotificationMenu } from "@/components/notification-menu";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Profile } from "@/lib/profile";
import { profileNeedsPersonalDetails } from "@/lib/profile";
import type { Role } from "@/lib/types";

type NavItem = { label: string; href: string; icon: typeof Home };
const nav = {
  client: [
    { label: "Dashboard", href: "/dashboard", icon: Home },
    { label: "Services", href: "/services", icon: Search },
    { label: "My jobs", href: "/jobs", icon: ClipboardList },
    { label: "Account", href: "/account", icon: Settings },
  ],
  partner: [
    { label: "Job queue", href: "/partner", icon: LayoutDashboard },
    { label: "My jobs", href: "/partner/jobs", icon: BriefcaseBusiness },
    { label: "Estimated activity", href: "/partner/earnings", icon: CircleDollarSign },
    { label: "Company", href: "/partner/company", icon: Building2 },
    { label: "Team", href: "/partner/team", icon: Users },
    { label: "Account", href: "/account", icon: Settings },
  ],
  admin: [
    { label: "Overview", href: "/admin", icon: Grid2X2 },
    { label: "Jobs", href: "/admin/jobs", icon: ClipboardList },
    { label: "Leaderboard", href: "/admin/leaderboard", icon: Trophy },
    { label: "Coverage map", href: "/admin/heatmap", icon: MapPin },
    { label: "Services", href: "/admin/services", icon: Wrench },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Account", href: "/account", icon: Settings },
  ],
} satisfies Record<string, NavItem[]>;

function NavLinks({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return items.map(({ label, href, icon: Icon }) => {
    const active = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "tap-target flex items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
          active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Icon className="size-5" strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
        {label}
      </Link>
    );
  });
}

function homeHref(role: Role) {
  if (role === "partner") return "/partner";
  if (role === "admin" || role === "superadmin") return "/admin";
  return "/dashboard";
}

export function AppShell({
  children,
  role,
  profile,
  onboardingLock = false,
  /** Portfolio / marketing previews — highlight nav as if on this path. */
  navPathname,
  actingLabel,
}: {
  children: React.ReactNode;
  role: Role;
  profile: Profile | null;
  /** Client onboarding: hide app nav until profile is complete (server also redirects). */
  onboardingLock?: boolean;
  navPathname?: string;
  /** Set while a superadmin is inside someone else's workspace. */
  actingLabel?: string | null;
}) {
  const pathname = usePathname();
  const activePath = navPathname ?? pathname;
  const allItems = role === "superadmin" ? [...nav.admin, { label: "Partners", href: "/admin/partners", icon: Building2 }] : nav[role];
  const setupLock = onboardingLock && role === "client" && !actingLabel;
  const hideAccount = Boolean(actingLabel) && (role === "client" || role === "partner");
  const items = (setupLock ? allItems.filter((item) => item.href === "/account") : allItems).filter(
    (item) => !(hideAccount && item.href === "/account"),
  );
  const roleLabel = role === "client" ? "Homeowner" : role === "partner" ? "Service partner" : role === "superadmin" ? "Super admin" : "Operations";
  const initials = profile?.full_name?.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() ?? "HF";
  const brandHref = setupLock ? "/account" : homeHref(role);
  const showSetupProgress =
    setupLock && profile && profileNeedsPersonalDetails(profile);

  return (
    <div className="min-h-dvh bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden h-svh w-64 flex-col border-r border-border bg-card p-4 md:flex">
        <div className="flex min-h-0 flex-1 flex-col">
          <Link href={brandHref} className="mb-8 flex h-11 items-center gap-2 rounded-xl px-2 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><HeartHandshake className="size-5" aria-hidden="true" /></span>
            <span translate="no" className="text-xl font-bold tracking-tight text-foreground">Home<span className="text-primary">Fix</span></span>
          </Link>
          <p className="mb-2 px-3 text-sm font-semibold text-muted-foreground">{roleLabel}</p>
          {showSetupProgress && (
            <ProfileSetupProgress
              className="mb-4"
              fullName={profile.full_name}
              phone={profile.phone}
              defaultAddress={profile.default_address}
            />
          )}
          <nav className="flex flex-col gap-1 overflow-y-auto">
            <NavLinks items={items} pathname={activePath} />
          </nav>
        </div>
        {!setupLock && !hideAccount && (
          <div className="shrink-0 border-t pt-4">
            <Link href="/account" className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring">
              <span className="grid size-9 place-items-center rounded-full bg-foreground text-xs font-bold text-white">{initials}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{profile?.full_name ?? "HomeFix member"}</p>
                <p className="text-xs text-muted-foreground">{roleLabel} · Account settings</p>
              </div>
            </Link>
          </div>
        )}
      </aside>

      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur md:ml-64 md:px-8">
        <Link href={brandHref} className="flex h-11 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring md:hidden">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground"><HeartHandshake className="size-4" aria-hidden="true" /></span>
          <span translate="no" className="font-bold">Home<span className="text-primary">Fix</span></span>
        </Link>
        <div className="hidden md:block">
          <p className="text-xs font-medium text-muted-foreground">{roleLabel}</p>
          <p className="font-semibold">{setupLock ? "Finish setting up your account" : "Welcome back"}</p>
        </div>
        <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-3">
          {actingLabel && (
            <p className="max-w-[10rem] truncate text-sm text-muted-foreground sm:max-w-xs">
              Viewing as: <span className="font-semibold text-foreground">{actingLabel}</span>
            </p>
          )}
          {actingLabel && <ExitViewAsButton />}
          {!setupLock && (
            <NotificationMenu />
          )}
          <HeaderProfileMenu profile={profile} initials={initials} roleLabel={roleLabel} setupLock={setupLock} hideAccount={hideAccount} />
          {!setupLock && (
            <Sheet>
              <SheetTrigger render={<Button variant="ghost" size="icon" className="tap-target md:hidden" aria-label="Open menu" />}><Menu aria-hidden="true" /></SheetTrigger>
              <SheetContent side="right" className="w-[85vw] p-5">
                <SheetHeader><SheetTitle>Navigate HomeFix</SheetTitle></SheetHeader>
                <nav className="mt-6 flex flex-col gap-2"><NavLinks items={items} pathname={pathname} /></nav>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </header>

      <main id="main-content" className={cn("px-4 pt-6 md:ml-64 md:px-8 lg:px-10", setupLock ? "pb-24 md:pb-10" : "pb-28 md:pb-10")}>
        <div className="mx-auto max-w-7xl">
          {showSetupProgress && (
            <ProfileSetupProgress
              className="mb-6 md:hidden"
              fullName={profile.full_name}
              phone={profile.phone}
              defaultAddress={profile.default_address}
            />
          )}
          {children}
        </div>
      </main>

      <nav
        aria-label="Primary"
        className="safe-bottom fixed inset-x-0 bottom-0 z-30 flex gap-1 overflow-x-auto border-t border-border bg-card/95 px-2 pt-2 backdrop-blur md:hidden"
      >
        {items.map(({ label, href, icon: Icon }) => {
          const active = activePath === href || (href !== "/" && activePath.startsWith(`${href}/`));
          const name = setupLock ? "Setup" : label;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              aria-label={name}
              className={cn(
                "flex min-h-12 min-w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              <span className="max-w-20 truncate">{name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div>{eyebrow && <p className="mb-1 text-sm font-semibold text-primary">{eyebrow}</p>}<h1 className="text-2xl font-bold tracking-tight text-balance text-foreground sm:text-3xl">{title}</h1>{description && <p className="mt-1 max-w-2xl text-sm leading-6 text-pretty text-muted-foreground">{description}</p>}</div>{action}</div>;
}
