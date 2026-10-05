"use client";

import { useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { Navigation } from "lucide-react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

type LocationRow = { lat: number; lng: number; updated_at: string };

/**
 * Only ever rendered while a job is `en_route` (caller's responsibility).
 * RLS already restricts reads of `partner_locations` to that same window,
 * so this component simply reflects whatever the client is allowed to see
 * — no separate "should we show this" logic needed here.
 */
export function LivePartnerMap({
  companyId,
  destinationLat,
  destinationLng,
}: {
  companyId: string;
  destinationLat?: number | null;
  destinationLng?: number | null;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const partnerMarkerRef = useRef<google.maps.Marker | null>(null);
  const [location, setLocation] = useState<LocationRow | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    let cancelled = false;

    void (async () => {
      const { data } = await supabase
        .from("partner_locations")
        .select("lat, lng, updated_at")
        .eq("company_id", companyId)
        .maybeSingle();
      if (!cancelled && data) setLocation(data as LocationRow);
    })();

    const channel = supabase
      .channel(`partner-location-${companyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "partner_locations", filter: `company_id=eq.${companyId}` },
        (payload: RealtimePostgresChangesPayload<LocationRow>) => {
          if (payload.new && "lat" in payload.new) setLocation(payload.new as LocationRow);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [companyId]);

  useEffect(() => {
    if (!mapsApiKey || !mapContainerRef.current) return;
    let cancelled = false;
    void (async () => {
      setOptions({ key: mapsApiKey, v: "weekly" });
      await importLibrary("maps");
      await importLibrary("marker");
      if (cancelled || !mapContainerRef.current) return;
      mapRef.current = new google.maps.Map(mapContainerRef.current, {
        center: { lat: destinationLat ?? 14.5995, lng: destinationLng ?? 120.9842 },
        zoom: 13,
        disableDefaultUI: true,
        zoomControl: true,
      });
      if (destinationLat != null && destinationLng != null) {
        new google.maps.Marker({
          position: { lat: destinationLat, lng: destinationLng },
          map: mapRef.current,
          label: { text: "🏠", fontSize: "16px" },
        });
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [destinationLat, destinationLng]);

  useEffect(() => {
    if (!ready || !mapRef.current || !location) return;
    const position = { lat: location.lat, lng: location.lng };
    if (!partnerMarkerRef.current) {
      partnerMarkerRef.current = new google.maps.Marker({
        position,
        map: mapRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#0d9488",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });
    } else {
      partnerMarkerRef.current.setPosition(position);
    }
    mapRef.current.panTo(position);
  }, [ready, location]);

  return (
    <Card className="border-0 bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Navigation className="size-4 text-primary" /> Live location
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!mapsApiKey && (
          <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
            Live map unavailable — Maps API key not configured.
          </p>
        )}
        {mapsApiKey && !location && (
          <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
            Waiting for your professional to share their location…
          </p>
        )}
        {mapsApiKey && (
          <div ref={mapContainerRef} className="h-64 w-full overflow-hidden rounded-xl" />
        )}
        {location && (
          <p className="mt-2 text-xs text-muted-foreground">
            Updated {new Date(location.updated_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
