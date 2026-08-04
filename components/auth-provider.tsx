"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";

type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, phone, default_address")
    .eq("id", userId)
    .single();
  return (data as Profile | null) ?? null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }
    const { data: { user: nextUser } } = await supabase.auth.getUser();
    setUser(nextUser);
    if (nextUser) {
      setProfile(await fetchProfile(nextUser.id));
    } else {
      setProfile(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;
    let subscription: { unsubscribe: () => void } | undefined;

    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      const initialUser = session?.user ?? null;
      setUser(initialUser);
      if (initialUser) {
        setProfile(await fetchProfile(initialUser.id));
      } else {
        setProfile(null);
      }
      setLoading(false);

      const { data } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, nextSession: Session | null) => {
        if (!mounted || event === "INITIAL_SESSION") return;
        const nextUser = nextSession?.user ?? null;
        setUser(nextUser);
        if (nextUser) {
          setProfile(await fetchProfile(nextUser.id));
        } else {
          setProfile(null);
        }
        setLoading(false);
      });
      subscription = data.subscription;
    })();

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({ user, profile, loading, refresh, signOut }),
    [user, profile, loading, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

/** Test helper: apply session snapshot without Supabase. */
export function AuthProviderTestHarness({
  value,
  children,
}: {
  value: AuthContextValue;
  children: React.ReactNode;
}) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export type { AuthContextValue };
