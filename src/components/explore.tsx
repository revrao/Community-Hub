"use client";
import { useState } from "react";
import Link from "next/link";
import { events } from "@/lib/data";
import { Category, EventCard, Icon } from "./ui";
export function Explore() {
  const [query, setQuery] = useState("");
  const [types, setTypes] = useState(["volunteer", "event"]);
  const [date, setDate] = useState("any");
  const [distance, setDistance] = useState("10");
  const [view, setView] = useState("map");
  const [selected, setSelected] = useState<string | null>(null);
  const list = events.filter(
    (e) =>
      types.includes(e.type) &&
      `${e.title} ${e.place} ${e.description}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      e.distance <= Number(distance) &&
      (date === "any" ||
        (date === "week"
          ? e.isoDate <= "2026-11-01"
          : e.isoDate <= "2026-10-31")),
  );
  const event = list.find((e) => e.id === selected);
  const reset = () => {
    setQuery("");
    setTypes(["volunteer", "event"]);
    setDate("any");
    setDistance("10");
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
            onChange={(e) => setQuery(e.target.value)}
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
              <span>2</span>
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
            <option value="week">This week</option>
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
            <option value="1">Within 1 mile</option>
            <option value="5">Within 5 miles</option>
            <option value="10">Within 10 miles</option>
          </select>
          <button className="btn ghost" onClick={reset}>
            Reset filters
          </button>
        </div>
        <p className="small muted">
          Sample opportunities in Ourtown, CA.
          <br />
          Dates relative to Oct 27, 2026; distances are illustrative.
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
      <section
        className="map-pane"
        aria-label="Illustrative map with sample opportunities"
      >
        <div className="map-art" />
        {list.map((e) => (
          <button
            key={e.id}
            className={`map-marker ${e.type === "event" ? "purple" : ""}`}
            style={{ left: `${e.x}%`, top: `${e.y}%` }}
            aria-label={`Preview ${e.title}`}
            aria-pressed={selected === e.id}
            onClick={() => setSelected(e.id)}
          >
            <Icon name={e.type === "event" ? "calendar" : "leaf"} />
          </button>
        ))}
        <span className="map-label">Illustrative map · Mapbox coming next</span>
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
            {list.length} results
          </span>
        </div>
        {list.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
        {!list.length && (
          <div className="empty">
            <p>No opportunities match these filters.</p>
            <button className="btn outline" onClick={reset}>
              Reset filters
            </button>
          </div>
        )}
        <div className="soft-note">
          Want to share an opportunity?
          <p>Organizer submissions will be available after backend setup.</p>
        </div>
      </aside>
    </div>
  );
}
