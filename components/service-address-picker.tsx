"use client";

import { useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { MapPin } from "lucide-react";
import { toast } from "sonner";

export type ServiceAddressValue = {
  address: string;
  lat: number | null;
  lng: number | null;
  confirmed: boolean;
};

const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

/** Bias autocomplete toward the Philippines (soft bounds — still allows valid PH picks). */
const PHILIPPINES_BOUNDS = {
  north: 21.5,
  south: 4.0,
  east: 127.0,
  west: 116.0,
};

function placeIsInPhilippines(place: google.maps.places.PlaceResult) {
  const country = place.address_components?.find((component) => component.types.includes("country"));
  return country?.short_name === "PH";
}

export function ServiceAddressPicker({
  value,
  onChange,
}: {
  value: ServiceAddressValue;
  onChange: (next: ServiceAddressValue) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [mapsReady, setMapsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapsApiKey || !inputRef.current) {
      if (!mapsApiKey) setLoadError("Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable Maps and autocomplete.");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setOptions({ key: mapsApiKey, v: "weekly" });
        await importLibrary("places");
        await importLibrary("maps");
        await importLibrary("geocoding");
        if (cancelled || !inputRef.current) return;

        geocoderRef.current = new google.maps.Geocoder();
        autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
          fields: ["formatted_address", "geometry", "name", "address_components"],
          componentRestrictions: { country: "ph" },
          // "address" is very strict and omits many valid PH streets; geocode includes routes & localities.
          types: ["geocode"],
          bounds: PHILIPPINES_BOUNDS,
          strictBounds: false,
        });
        autocompleteRef.current.addListener("place_changed", () => {
          const place = autocompleteRef.current?.getPlace();
          if (!place?.geometry?.location) {
            toast.error("Couldn’t read that address", { description: "Pick a suggestion from the list." });
            onChangeRef.current({ address: inputRef.current?.value ?? "", lat: null, lng: null, confirmed: false });
            return;
          }
          if (!placeIsInPhilippines(place)) {
            toast.error("Philippines addresses only", { description: "Choose a location in the Philippines." });
            onChangeRef.current({ address: inputRef.current?.value ?? "", lat: null, lng: null, confirmed: false });
            return;
          }
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const address = place.formatted_address ?? place.name ?? inputRef.current?.value ?? "";
          if (inputRef.current) inputRef.current.value = address;
          onChangeRef.current({ address, lat, lng, confirmed: true });
        });
        setMapsReady(true);
      } catch {
        setLoadError("Google Maps failed to load. Check your API key and billing.");
      }
    })();

    return () => {
      cancelled = true;
      if (autocompleteRef.current) google.maps.event.clearInstanceListeners(autocompleteRef.current);
    };
  }, []);

  useEffect(() => {
    if (!value.confirmed || value.lat == null || value.lng == null || !mapContainerRef.current || !mapsReady) return;

    const center = { lat: value.lat, lng: value.lng };
    if (!mapRef.current) {
      mapRef.current = new google.maps.Map(mapContainerRef.current, {
        center,
        zoom: 17,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      markerRef.current = new google.maps.Marker({
        map: mapRef.current,
        position: center,
        draggable: true,
      });
      markerRef.current.addListener("dragend", () => {
        const position = markerRef.current?.getPosition();
        if (!position || !geocoderRef.current) return;
        geocoderRef.current.geocode(
          { location: position, region: "ph", componentRestrictions: { country: "PH" } },
          (results, status) => {
          if (status !== "OK" || !results?.[0]) return;
          const address = results[0].formatted_address;
          if (inputRef.current) inputRef.current.value = address;
          onChangeRef.current({
            address,
            lat: position.lat(),
            lng: position.lng(),
            confirmed: true,
          });
        });
      });
    } else {
      mapRef.current.setCenter(center);
      markerRef.current?.setPosition(center);
    }
  }, [value.confirmed, value.lat, value.lng, mapsReady]);

  useEffect(() => {
    if (!value.confirmed) {
      markerRef.current = null;
      mapRef.current = null;
    }
  }, [value.confirmed]);

  function handleManualInput(event: React.ChangeEvent<HTMLInputElement>) {
    const address = event.target.value;
    onChange({ address, lat: null, lng: null, confirmed: false });
  }

  return (
    <div className="space-y-3">
      <label htmlFor="service-address" className="flex items-center gap-2 text-sm font-semibold">
        <MapPin className="size-4 text-primary" aria-hidden="true" />
        Service address
      </label>
      <input
        id="service-address"
        name="street-address"
        ref={inputRef}
        defaultValue={value.address}
        onChange={handleManualInput}
        placeholder="Street, barangay, subdivision, city…"
        className="h-12 w-full rounded-xl border border-input bg-transparent px-3 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
        autoComplete="off"
      />
      {loadError && (
        <p className="text-xs leading-5 text-amber-800">{loadError}</p>
      )}
      {mapsReady && !value.confirmed && (
        <p className="text-xs text-muted-foreground">
          Suggestions are limited to the Philippines. Pick one, then drag the pin if the exact gate or unit is off.
        </p>
      )}
      {value.confirmed && value.lat != null && value.lng != null && (
        <div className="overflow-hidden rounded-2xl border border-border">
          <div
            ref={mapContainerRef}
            className="h-56 w-full bg-muted sm:h-64"
            role="region"
            aria-label="Map confirming service location"
          />
          <p className="border-t border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
            Drag the pin to fine-tune where the professional should arrive.
          </p>
        </div>
      )}
    </div>
  );
}
