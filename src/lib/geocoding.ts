import type { Coordinates } from "./data.ts";
export type EventLocation = Coordinates & { address: string };
export type LocationSuggestion = EventLocation & {
  id: string;
  title: string;
  context: string;
};
export function validLocation(point: Coordinates | null): point is Coordinates {
  return Boolean(
    point &&
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    Math.abs(point.latitude) <= 90 &&
    Math.abs(point.longitude) <= 180,
  );
}
export function parseLocations(data: unknown): LocationSuggestion[] {
  const features = (data as { features?: unknown[] })?.features;
  if (!Array.isArray(features)) return [];
  return features.flatMap((feature) => {
    if (!feature || typeof feature !== "object") return [];
    const f = feature as {
      id?: string;
      properties?: {
        mapbox_id?: string;
        name?: string;
        name_preferred?: string;
        place_formatted?: string;
        full_address?: string;
        coordinates?: Coordinates;
      };
      geometry?: { coordinates?: number[] };
    };
    const p = f.properties;
    const point = {
      longitude: p?.coordinates?.longitude ?? f.geometry?.coordinates?.[0]!,
      latitude: p?.coordinates?.latitude ?? f.geometry?.coordinates?.[1]!,
    };
    const title = p?.name_preferred || p?.name || "";
    const context = p?.place_formatted || "";
    const address =
      p?.full_address || [title, context].filter(Boolean).join(", ");
    if (!validLocation(point) || !address || address.length > 300) return [];
    return [
      {
        ...point,
        id: p?.mapbox_id || f.id || address,
        title: title || address,
        context,
        address,
      },
    ];
  });
}
export async function geocode(
  query: string | Coordinates,
  signal: AbortSignal,
): Promise<LocationSuggestion[]> {
  const token =
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token)
    throw new Error(
      "Address search is not configured. Contact the administrator.",
    );
  const reverse = typeof query !== "string";
  const url = new URL(
    `https://api.mapbox.com/search/geocode/v6/${reverse ? "reverse" : "forward"}`,
  );
  url.searchParams.set("access_token", token);
  url.searchParams.set("permanent", "true");
  url.searchParams.set("types", "address,street");
  url.searchParams.set("limit", reverse ? "1" : "5");
  if (reverse) {
    url.searchParams.set("latitude", String(query.latitude));
    url.searchParams.set("longitude", String(query.longitude));
  } else {
    url.searchParams.set("q", query);
    url.searchParams.set("autocomplete", "true");
  }
  const response = await fetch(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
    cache: "no-store",
    referrerPolicy: "strict-origin-when-cross-origin",
  });
  if (!response.ok)
    throw new Error(
      response.status === 401 || response.status === 403
        ? "Address search is unavailable. The administrator should check Mapbox token and permanent-geocoding access."
        : response.status === 429
          ? "Address search is busy. Please try again shortly."
          : "Address search could not connect. Please try again.",
    );
  return parseLocations(await response.json());
}
