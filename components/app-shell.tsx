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
    { label: "Account", href: "/account", icon: Settings },
  ],
  admin: [
    { label: "Overview", href: "/admin", icon: Grid2X2 },
    { label: "Jobs", href: "/admin/jobs", icon: ClipboardList },
    { label: "Companies", href: "/admin/companies", icon: Building2 },
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
      <Link key={href} href={href} className={cn(
        "tap-target flex items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
        active ? "bg-teal-50 text-teal-800" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      )}>
        <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
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
  const setupLock = onboardingLock && role === "client";
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
    <div className="min-h-dvh bg-[#faf8f3]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden h-svh w-64 flex-col border-r bg-white p-4 md:flex">
        <div className="flex min-h-0 flex-1 flex-col">
          <Link href={brandHref} className="mb-8 flex h-11 items-center gap-2 px-2">
            <span className="grid size-9 place-items-center rounded-xl bg-teal-600 text-white"><HeartHandshake className="size-5" /></span>
            <span className="text-xl font-bold tracking-tight text-slate-900">Home<span className="text-teal-600">Fix</span></span>
          </Link>
          <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[.16em] text-slate-400">{roleLabel}</p>
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
            <Link href="/account" className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-slate-50">
              <span className="grid size-9 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">{initials}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{profile?.full_name ?? "HomeFix member"}</p>
                <p className="text-xs text-slate-500">{roleLabel} · Account settings</p>
              </div>
            </Link>
          </div>
        )}
      </aside>

      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-[#faf8f3]/90 px-4 backdrop-blur md:ml-64 md:px-8">
        <Link href={brandHref} className="flex items-center gap-2 md:hidden">
          <span className="grid size-8 place-items-center rounded-lg bg-teal-600 text-white"><HeartHandshake className="size-4" /></span>
          <span className="font-bold">Home<span className="text-teal-600">Fix</span></span>
        </Link>
        <div className="hidden md:block">
          <p className="text-xs font-medium text-slate-500">{roleLabel}</p>
          <p className="font-semibold">{setupLock ? "Finish setting up your account" : "Welcome back"}</p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {!setupLock && (
            <NotificationMenu />
          )}
          <HeaderProfileMenu profile={profile} initials={initials} roleLabel={roleLabel} setupLock={setupLock} hideAccount={hideAccount} />
          {!setupLock && (
            <Sheet>
              <SheetTrigger render={<Button variant="ghost" size="icon" className="tap-target md:hidden" aria-label="Open menu" />}><Menu /></SheetTrigger>
              <SheetContent side="right" className="w-[85vw] p-5">
                <SheetHeader><SheetTitle>Navigate HomeFix</SheetTitle></SheetHeader>
                <nav className="mt-6 flex flex-col gap-2"><NavLinks items={items} pathname={pathname} /></nav>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </header>

      <main className={cn("px-4 pt-6 md:ml-64 md:px-8 lg:px-10", setupLock ? "pb-24 md:pb-10" : "pb-28 md:pb-10")}>
        <div className="mx-auto max-w-7xl">
          {actingLabel && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
              <p className="text-sm font-semibold">Viewing as {actingLabel}</p>
              <ExitViewAsButton />
            </div>
          )}
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
        className="safe-bottom fixed inset-x-0 bottom-0 z-30 grid border-t bg-white/95 px-2 pt-2 backdrop-blur md:hidden"
        style={{ gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))` }}
      >
        {items.map(({ label, href, icon: Icon }) => {
          const active = activePath === href || (href !== "/" && activePath.startsWith(`${href}/`));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium",
                active ? "text-teal-700" : "text-slate-500",
              )}
            >
              <Icon className="size-5" />
              <span className="truncate">{setupLock ? "Setup" : label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div>{eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-[.16em] text-teal-700">{eyebrow}</p>}<h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{title}</h1>{description && <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}</div>{action}</div>;
}
