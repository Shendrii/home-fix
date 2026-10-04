"use client";

import Link from "next/link";
import { Wrench } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { authenticatedPortalPath, shouldShowPublicSignIn } from "@/lib/auth-display";

const textLink =
  "inline-flex h-11 items-center justify-center rounded-xl px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring sm:px-4";
const primaryLink =
  "inline-flex h-11 items-center justify-center rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring active:translate-y-px sm:px-4";

export function PublicSiteHeader() {
  const { user, profile, loading } = useAuth();
  const showSignIn = shouldShowPublicSignIn({
    loading,
    userId: user?.id ?? null,
    profile,
  });
  const portalPath = authenticatedPortalPath(profile?.role);

  return (
    <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-5">
      <Link href="/" className="flex h-11 items-center gap-2 rounded-xl text-xl font-bold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring">
        <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Wrench className="size-5" aria-hidden="true" />
        </span>
        <span translate="no">Home<span className="text-primary">Fix</span></span>
      </Link>
      <nav aria-label="Public" className="flex w-full min-w-0 flex-wrap items-center justify-end gap-1 sm:w-auto sm:gap-2">
        <Link href="/services" className={textLink}>
          Services
        </Link>
        {!loading && user && (
          <Link href={portalPath} className={primaryLink}>
            {profile?.role === "client" ? "My dashboard" : "Open workspace"}
          </Link>
        )}
        {showSignIn && (
          <>
            <Link href="/auth/sign-in" className={textLink}>
              Sign in
            </Link>
            <Link href="/auth/sign-up" className={primaryLink}>
              Create account
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}

export function PublicSiteFooter() {
  return (
    <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-sm text-muted-foreground">
      <p translate="no">HomeFix</p>
      <nav aria-label="Legal" className="flex gap-4">
        <Link href="/privacy" className="rounded-md underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring">
          Privacy
        </Link>
        <Link href="/terms" className="rounded-md underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring">
          Terms
        </Link>
      </nav>
    </footer>
  );
}
