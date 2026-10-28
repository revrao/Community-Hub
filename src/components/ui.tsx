import Link from "next/link";
import type { Event } from "@/lib/data";
export function Icon({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  const paths: Record<string, string> = {
    map: "m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16",
    trophy:
      "M8 3h8v5a4 4 0 0 1-8 0V3Zm0 2H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4m-4 1v7m-4 2h8",
    user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2",
    leaf: "M20 3C6 2 2 9 6 16s15 1 14-13ZM5 21l10-12",
    calendar: "M4 5h16v16H4V5Zm3-3v6m10-6v6M4 10h16",
    pin: "M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0ZM9 10a3 3 0 1 0 6 0 3 3 0 0 0-6 0",
    clock: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-5v5l3 2",
    search: "M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-2 5 6 6",
    arrow: "m9 5 7 7-7 7",
    bookmark: "M6 3h12v18l-6-4-6 4V3",
    check: "m5 12 4 4L19 6",
    list: "M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1",
  };
  return (
    <svg
      className={`icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.calendar} />
    </svg>
  );
}
export function Category({ event }: { event: Event }) {
  return (
    <span className={`tag ${event.type === "event" ? "purple" : ""}`}>
      <Icon name={event.type === "event" ? "calendar" : "leaf"} />
      {event.type === "event" ? "Community Event" : "Volunteering"}
    </span>
  );
}
export function EventCard({ event }: { event: Event }) {
  return (
    <Link href={`/events/${event.id}`} className="event-tile">
      <img src={`/reference/${event.image}`} alt="" />
      <div className="grow">
        <Category event={event} />
        <h3>{event.title}</h3>
        <p className="meta">
          <Icon name="clock" />
          {event.date} · {event.time.split(" – ")[0]}
        </p>
        <p className="meta">
          <Icon name="pin" />
          {event.place} · {event.distance} mi
        </p>
      </div>
      <Icon name="arrow" />
    </Link>
  );
}
export function Stats() {
  return (
    <div className="stats">
      {[
        ["120", "Points"],
        ["6", "Events"],
        ["14", "Volunteer hours"],
      ].map(([n, label]) => (
        <div key={label}>
          <b>{n}</b>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
