"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const MIN_UPDATE_INTERVAL_MS = 12_000;

/**
 * Writes the partner's live position while — and only while — a job is
 * `en_route`. No historical trail is kept: `partner_locations` is a
 * single upserted row per company, and read access is gated to that same
 * status window by RLS, so this component intentionally stops calling
 * `watchPosition` the moment the job leaves `en_route`.
 */
export function PartnerLocationBroadcaster({
  companyId,
  active,
}: {
  companyId: string;
  active: boolean;
}) {
  const lastSentRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    const supabase = createClient();
    if (!supabase) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        if (now - lastSentRef.current < MIN_UPDATE_INTERVAL_MS) return;
        lastSentRef.current = now;
        void supabase.from("partner_locations").upsert({
          company_id: companyId,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          updated_at: new Date().toISOString(),
        });
      },
      () => {
        // Location denied/unavailable — silently skip; tracking is a
        // convenience, not a requirement to advance the job.
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [active, companyId]);

  return null;
}
