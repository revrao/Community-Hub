import type { Coordinates } from "./data.ts";
export type EventLocation = Coordinates & { address: string };
export function validLocation(point: Coordinates | null): point is Coordinates {
  return Boolean(
    point && Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
    && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180,
  );
}
