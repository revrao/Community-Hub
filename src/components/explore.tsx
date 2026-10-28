"use client";
import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type Event, type Coordinates, filterEvents } from "@/lib/data";
import { Category, EventCard, Icon } from "./ui";
import { EventMap } from "./event-map";
export function Explore({
  events,
  error,
  initialQuery = "",
}: {
  events: Event[];
  error: string;
  initialQuery?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  useEffect(() => {
    setQuery(initialQuery);
    setSelected(null);
  }, [initialQuery]);
  useEffect(() => {
    const sync = () =>
      setQuery(new URL(window.location.href).searchParams.get("q") ?? "");
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  const changeQuery = (value: string) => {
    setQuery(value);
    setSelected(null);
    const url = new URL(window.location.href);
    if (value.trim()) url.searchParams.set("q", value);
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", url.pathname + url.search);
  };
  const [types, setTypes] = useState(["volunteer", "event"]);
  const [date, setDate] = useState("any");
  const [distance, setDistance] = useState("any");
  const [view, setView] = useState("map");
  const [selected, setSelected] = useState<string | null>(null);
  const [origin, setOrigin] = useState<Coordinates | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const list = useMemo(
    () => filterEvents(events, query, types, date, distance, origin),
    [events, query, types, date, distance, origin],
  );
  const event = list.find((e) => e.id === selected);
  const reset = () => {
    changeQuery("");
    setTypes(["volunteer", "event"]);
    setDate("any");
    setDistance("any");
    setOrigin(null);
    setLocationMessage("");
    setSelected(null);
  };
  const locate = () => {
    if (!navigator.geolocation) {
      setLocationMessage(
        "Location is unavailable. Pan the map and use Search this area.",
      );
      return;
    }
    setLocationMessage("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setOrigin({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
        });
        setDistance("10");
        setLocationMessage(
          "Showing events near your current location. Your position is not saved.",
        );
      },
      () =>
        setLocationMessage(
          "Location access was unavailable. Pan the map and use Search this area.",
        ),
      { timeout: 10000, maximumAge: 60000 },
    );
  };
  return (
    <div className={`explore ${view === "list" ? "list-only" : ""}`}>
      <aside className="filters-pane">
        <div className="mobile-heading">
          <h1>Explore Your Community</h1>
          <p className="muted">Find volunteering and local events near you.</p>
        </div>
        <label className="field-label" htmlFor="search">
          Find an opportunity
        </label>
        <div className="search-field">
          <Icon name="search" />
          <input
            id="search"
            placeholder="Search events or places..."
            value={query}
            maxLength={200}
            onChange={(e) => changeQuery(e.target.value)}
          />
        </div>
        <h3>Categories</h3>
        <div className="categories">
          {[
            ["volunteer", "Volunteering", "leaf"],
            ["event", "Community Events", "calendar"],
          ].map(([type, label, icon]) => (
            <button
              key={type}
              aria-pressed={types.includes(type)}
              className={`category-btn ${type === "event" ? "purple" : ""} ${types.includes(type) ? "selected" : ""}`}
              onClick={() =>
                setTypes((a) =>
                  a.includes(type) ? a.filter((x) => x !== type) : [...a, type],
                )
              }
            >
              <Icon name={icon} />
              {label}
              <span>{events.filter((e) => e.type === type).length}</span>
            </button>
          ))}
        </div>
        <div className="filter-controls">
          <h3>Filters</h3>
          <label className="field-label" htmlFor="date">
            Date
          </label>
          <select
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          >
            <option value="any">Any date</option>
            <option value="week">Next 7 days</option>
            <option value="month">This month</option>
          </select>
          <label className="field-label" htmlFor="distance">
            Distance
          </label>
          <select
            id="distance"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
          >
            <option value="any">Any distance</option>
            {origin && (
              <>
                <option value="1">Within 1 mile</option>
                <option value="5">Within 5 miles</option>
                <option value="10">Within 10 miles</option>
                <option value="25">Within 25 miles</option>
              </>
            )}
          </select>
          <button className="btn outline" onClick={locate}>
            <Icon name="pin" />
            Use my location
          </button>
          <button className="btn ghost" onClick={reset}>
            Reset filters
          </button>
        </div>
        <p className="small muted" role="status">
          {locationMessage ||
            "Choose a map area or use your location to find nearby opportunities."}
        </p>
        <div className="view-switch">
          <button onClick={() => setView("map")} aria-pressed={view === "map"}>
            <Icon name="map" />
            Map + List
          </button>
          <button
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
          >
            <Icon name="list" />
            List Only
          </button>
        </div>
      </aside>
      <section className="map-pane" aria-label="Local opportunities map">
        <EventMap
          events={list}
          origin={origin}
          onSelect={setSelected}
          onArea={(area) => {
            setOrigin(area);
            setDistance("10");
            setLocationMessage(
              "Showing events within 10 miles of the map center.",
            );
          }}
        />
        {event && (
          <div className="map-popover">
            <div className="row between">
              <Category event={event} />
              <button
                className="close"
                aria-label="Close preview"
                onClick={() => setSelected(null)}
              >
                ×
              </button>
            </div>
            <h3>{event.title}</h3>
            <p className="muted small">
              {event.date} · {event.place}
            </p>
            <Link className="btn" href={`/events/${event.id}`}>
              View Details <Icon name="arrow" />
            </Link>
          </div>
        )}
        <div className="map-badge">
          <span className="dot" />
          Volunteering <span className="dot purple" />
          Community events
        </div>
      </section>
      <aside className="results-pane">
        <div className="row between">
          <h2>Nearby Opportunities</h2>
          <span className="small muted" aria-live="polite">
            {list.length} {list.length === 1 ? "result" : "results"}
          </span>
        </div>
        {error ? (
          <div className="error-note" role="alert">
            <p>{error}</p>
            <button className="btn outline" onClick={() => router.refresh()}>
              Try again
            </button>
          </div>
        ) : (
          list.map((e) => <EventCard key={e.id} event={e} />)
        )}
        {!error && !list.length && (
          <div className="empty">
            <p>
              {events.length
                ? query.trim()
                  ? `No events match “${query.trim()}”. Try a title, organizer, category, or location.`
                  : "No opportunities match these filters."
                : "No approved upcoming events yet."}
            </p>
            {events.length > 0 && (
              <button className="btn outline" onClick={reset}>
                Reset filters
              </button>
            )}
          </div>
        )}
        <div className="soft-note">
          Want to share an opportunity?{" "}
          <Link href="/organizer">Post an event</Link>
        </div>
      </aside>
    </div>
  );
}
