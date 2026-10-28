"use client";
import Link from "next/link";
import type { Event } from "@/lib/data";
import { useDemo } from "./demo-provider";
import { Category, Icon } from "./ui";
export function EventDetail({ event: e }: { event: Event }) {
  const demo = useDemo();
  const registered = demo.registered.includes(e.id);
  const saved = demo.saved.includes(e.id);
  return (
    <div className="page">
      <Link className="backlink" href="/">
        ← Back to map
      </Link>
      <div className="cols-main">
        <div className="stack">
          <section className="card card-pad">
            <div className="event-hero">
              <img src={`/reference/${e.image}`} alt={e.title} />
              <div>
                <Category event={e} />
                <h1>{e.title}</h1>
                <div className="event-meta">
                  <p>
                    <Icon name="calendar" />
                    {e.date}, 2026
                  </p>
                  <p>
                    <Icon name="clock" />
                    {e.time}
                  </p>
                  <p>
                    <Icon name="pin" />
                    {e.place}
                  </p>
                  <p>
                    <Icon name="user" />
                    {e.organizer}
                  </p>
                </div>
                <div className="row wrap">
                  <button
                    className="btn"
                    onClick={() => demo.toggleRegistration(e.id)}
                  >
                    {registered ? "Cancel sample RSVP" : "Try sample RSVP"}
                  </button>
                  <button
                    className="btn ghost"
                    aria-pressed={saved}
                    onClick={() => demo.toggleSave(e.id)}
                  >
                    <Icon name="bookmark" />
                    {saved ? "Saved" : "Save"}
                  </button>
                </div>
                <p className="small muted about" role="status">
                  {registered
                    ? "Sample RSVP added. Find it in Profile → Upcoming. No real spot is reserved."
                    : `${e.spots} sample spots left · No real registration is sent.`}
                </p>
              </div>
            </div>
            <hr />
            <div className="stats">
              <div>
                <b>{e.capacity}</b>
                <span>Capacity</span>
              </div>
              <div>
                <b>{e.points}</b>
                <span>Points after attendance</span>
              </div>
            </div>
          </section>
          <section className="card card-pad">
            <h2>About This Event</h2>
            <p className="muted about">{e.description}</p>
            <hr />
            <h3>What to expect</h3>
            <p className="muted about">
              Friendly neighbors, clear instructions from the organizer, and
              attendance confirmed after participation.
            </p>
          </section>
        </div>
        <aside className="stack">
          <section className="card card-pad">
            <h2>Event Location</h2>
            <div className="side-map" />
            <h3>{e.place}</h3>
            <p className="muted small">{e.address}</p>
            <p className="small muted about">
              Illustrative location. Live Mapbox map coming next.
            </p>
          </section>
          <section className="card card-pad">
            <h2>Organizer</h2>
            <p className="about">{e.organizer}</p>
            <p className="muted small">Sample organization</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
