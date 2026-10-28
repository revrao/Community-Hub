export type EventRow = {
  id: string;
  organizer_id: string;
  organizer_name?: string | null;
  title: string;
  description: string;
  category: "volunteering" | "community_event";
  starts_at: string;
  ends_at: string;
  timezone: string;
  location_name: string;
  address: string;
  latitude: number;
  longitude: number;
  capacity: number;
  status: "pending" | "approved" | "rejected" | "cancelled";
};
export type Event = {
  id: string;
  title: string;
  type: "volunteer" | "event";
  date: string;
  time: string;
  place: string;
  address: string;
  image: string;
  capacity: number;
  points: number;
  description: string;
  organizer: string;
  organizerId: string;
  latitude: number;
  longitude: number;
  startsAt: string;
  endsAt: string;
  timezone: string;
  status: EventRow["status"];
  distance?: number;
};
export function eventFromRow(value: unknown): Event {
  const row = value as EventRow;
  const zone = { timeZone: row.timezone };
  return {
    id: row.id,
    title: row.title,
    type: row.category === "volunteering" ? "volunteer" : "event",
    date: new Intl.DateTimeFormat("en-US", {
      ...zone,
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(row.starts_at)),
    time:
      new Intl.DateTimeFormat("en-US", {
        ...zone,
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(row.starts_at)) +
      " – " +
      new Intl.DateTimeFormat("en-US", {
        ...zone,
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(new Date(row.ends_at)),
    place: row.location_name,
    address: row.address,
    image: row.category === "volunteering" ? "cleanup.png" : "festival.png",
    capacity: row.capacity,
    points: row.category === "volunteering" ? 50 : 10,
    description: row.description,
    organizer: row.organizer_name || "Community organizer",
    organizerId: row.organizer_id,
    latitude: row.latitude,
    longitude: row.longitude,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    timezone: row.timezone,
    status: row.status,
  };
}
export type Coordinates = { latitude: number; longitude: number };
export function milesBetween(a: Coordinates, b: Coordinates) {
  const rad = Math.PI / 180;
  const dlat = (b.latitude - a.latitude) * rad;
  const dlon = (b.longitude - a.longitude) * rad;
  const n =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(a.latitude * rad) *
      Math.cos(b.latitude * rad) *
      Math.sin(dlon / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(n), Math.sqrt(Math.max(0, 1 - n)));
}
export function filterEvents(
  events: Event[],
  query: string,
  types: string[],
  date: string,
  distance: string,
  origin: Coordinates | null,
  now = new Date(),
) {
  return events
    .map((e) => ({
      ...e,
      distance: origin ? milesBetween(origin, e) : undefined,
    }))
    .filter((e) => {
      const start = new Date(e.startsAt);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() + 7);
      return (
        e.status === "approved" &&
        new Date(e.endsAt) > now &&
        types.includes(e.type) &&
        [
          e.title,
          e.place,
          e.description,
          e.address,
          e.organizer,
          e.type === "volunteer"
            ? "volunteering volunteer"
            : "community events community_event",
        ]
          .join(" ")
          .toLowerCase()
          .includes(query.trim().toLowerCase()) &&
        (date === "any" || start < (date === "week" ? weekEnd : monthEnd)) &&
        (distance === "any" ||
          (e.distance !== undefined && e.distance <= Number(distance)))
      );
    })
    .sort((a, b) =>
      origin
        ? (a.distance ?? 0) - (b.distance ?? 0)
        : Date.parse(a.startsAt) - Date.parse(b.startsAt),
    );
}
