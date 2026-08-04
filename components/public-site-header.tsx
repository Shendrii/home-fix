"use client";

import Link from "next/link";
import { Wrench } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { authenticatedPortalPath, shouldShowPublicSignIn } from "@/lib/auth-display";

export function PublicSiteHeader() {
  const { user, profile, loading } = useAuth();
  const showSignIn = shouldShowPublicSignIn({
    loading,
    userId: user?.id ?? null,
    profile,
  });
  const portalPath = authenticatedPortalPath(profile?.role);

  return (
    <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
      <Link href="/" className="flex items-center gap-2 text-xl font-bold">
        <span className="grid size-9 place-items-center rounded-xl bg-teal-600 text-white">
          <Wrench className="size-5" />
        </span>
        Home<span className="text-teal-600">Fix</span>
      </Link>
      <div className="flex gap-2">
        <Link
          href="/services"
          className="inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
        >
          Services
        </Link>
        {!loading && user && (
          <Link
            href={portalPath}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
          >
            {profile?.role === "client" ? "My dashboard" : "Open workspace"}
          </Link>
        )}
        {showSignIn && (
          <>
            <Link
              href="/auth/sign-in"
              className="inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
            >
              Sign in
            </Link>
            <Link
              href="/auth/sign-up"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
            >
              Create account
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
