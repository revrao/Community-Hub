"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "./session-provider";
import { browserClient } from "@/lib/supabase/browser";
import { type EventRow } from "@/lib/data";
import { databaseMessage } from "@/lib/auth";
import { EventLocationPicker } from "./event-location-picker";
import { validLocation, type EventLocation } from "@/lib/event-location";
type Registrant = {
  registration_id: string;
  user_id: string;
  display_name: string;
  status: string;
};
const localDate = (value: string) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
export function Organizer() {
  const { user } = useSession();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [editing, setEditing] = useState<EventRow | null | undefined>(
    undefined,
  );
  const [selected, setSelected] = useState<EventRow | null>(null);
  const [registrants, setRegistrants] = useState<Registrant[]>([]);
  const [verified, setVerified] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [location, setLocation] = useState<EventLocation | null>(null);
  const load = useCallback(async () => {
    if (!user) return;
    try {
      const result = await browserClient()
        .from("events")
        .select("*")
        .eq("organizer_id", user.id)
        .order("starts_at", { ascending: false });
      if (result.error) setError(databaseMessage(result.error.message));
      else setEvents(result.data ?? []);
    } catch {
      setError("Unable to load your events.");
    } finally {
      setLoading(false);
    }
  }, [user]);
  useEffect(() => {
    void load();
  }, [load]);
  const loadAttendees = async (event: EventRow) => {
    setSelected(event);
    setError("");
    setAttendeesLoading(true);
    setRegistrants([]);
    setVerified([]);
    try {
      const db = browserClient();
      const [r, a] = await Promise.all([
        db.rpc("event_registrants", { p_event_id: event.id }),
        db.from("attendance").select("user_id").eq("event_id", event.id),
      ]);
      if (r.error || a.error) setError((r.error || a.error)!.message);
      else {
        setRegistrants(r.data ?? []);
        setVerified(
          (a.data ?? []).map((row: { user_id: string }) => row.user_id),
        );
      }
    } catch {
      setError("Unable to load participants.");
    } finally {
      setAttendeesLoading(false);
    }
  };
  const action = async (
    call: () => PromiseLike<{ error: { message: string } | null }>,
    success: string,
  ) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await call();
      if (result.error) {
        setError(result.error.message);
        return false;
      }
      setMessage(success);
      await load();
      return true;
    } catch {
      setError("Unable to connect. Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };
  const startEdit = (event: EventRow | null) => {
    setEditing(event);
    setSelected(null);
    setError("");
    setMessage("");
    setLocation(
      event
        ? {
            latitude: event.latitude,
            longitude: event.longitude,
            address: event.address,
          }
        : null,
    );
  };
  return (
    <div className="page">
      <div className="row between heading-row">
        <div>
          <h1>Organizer Portal</h1>
          <p className="muted about">
            Create opportunities and manage participation.
          </p>
        </div>
        <button className="btn" onClick={() => startEdit(null)}>
          Create Event
        </button>
      </div>
      {error && (
        <p className="error-note" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="soft-note" role="status">
          {message}
        </p>
      )}
      {editing !== undefined && (
        <form
          key={editing?.id ?? "new"}
          className="card card-pad editor event-editor"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);

            const start = new Date(String(f.get("start"))),
              end = new Date(String(f.get("end")));
            if (
              !Number.isFinite(start.getTime()) ||
              !Number.isFinite(end.getTime()) ||
              end <= start
            ) {
              setError("Choose an end time after the start time.");
              return;
            }
            if (!validLocation(location) || !location.address.trim()) {
              setError(
                "Enter the public address and confirm its map pin before submitting.",
              );
              return;
            }
            const ok = await action(
              () =>
                browserClient().rpc("save_event", {
                  p_event_id: editing?.id ?? null,
                  p_title: String(f.get("title")),
                  p_description: String(f.get("description")),
                  p_category: String(f.get("category")),
                  p_starts_at: new Date(String(f.get("start"))).toISOString(),
                  p_ends_at: new Date(String(f.get("end"))).toISOString(),
                  p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                  p_location_name: String(f.get("place")),
                  p_address: location.address,
                  p_latitude: location.latitude,
                  p_longitude: location.longitude,
                  p_capacity: Number(f.get("capacity")),
                }),
              "Event submitted for administrator approval. It will be public after approval.",
            );
            if (ok) setEditing(undefined);
          }}
        >
          <h2>{editing ? "Edit Event" : "Create a New Event"}</h2>
          <label className="field-label" htmlFor="title">
            Event Title
          </label>
          <input
            id="title"
            name="title"
            required
            maxLength={120}
            defaultValue={editing?.title}
          />
          <label className="field-label" htmlFor="category">
            Category
          </label>
          <select
            id="category"
            name="category"
            defaultValue={editing?.category ?? "volunteering"}
          >
            <option value="volunteering">Volunteering</option>
            <option value="community_event">Community Event</option>
          </select>
          <label className="field-label" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            required
            maxLength={10000}
            defaultValue={editing?.description}
          />
          <div className="two-inputs">
            <div>
              <label className="field-label" htmlFor="start">
                Start
              </label>
              <input
                id="start"
                name="start"
                type="datetime-local"
                required
                defaultValue={
                  editing ? localDate(editing.starts_at) : undefined
                }
              />
            </div>
            <div>
              <label className="field-label" htmlFor="end">
                End
              </label>
              <input
                id="end"
                name="end"
                type="datetime-local"
                required
                defaultValue={editing ? localDate(editing.ends_at) : undefined}
              />
            </div>
          </div>
          <p className="small muted">
            Times use your device timezone:{" "}
            {Intl.DateTimeFormat().resolvedOptions().timeZone}.
          </p>
          <label className="field-label" htmlFor="capacity">
            Participant limit
          </label>
          <input
            id="capacity"
            name="capacity"
            type="number"
            min={1}
            max={10000}
            required
            defaultValue={editing?.capacity ?? 20}
          />
          <label className="field-label" htmlFor="place">
            Venue name
          </label>
          <input
            id="place"
            name="place"
            required
            maxLength={160}
            defaultValue={editing?.location_name}
          />
          <EventLocationPicker
            initial={
              editing
                ? {
                    address: editing.address,
                    latitude: editing.latitude,
                    longitude: editing.longitude,
                  }
                : null
            }
            onChange={setLocation}
          />
          <div className="row wrap">
            <button
              type="button"
              className="btn ghost"
              onClick={() => setEditing(undefined)}
            >
              Cancel
            </button>
            <button className="btn" disabled={busy}>
              {busy ? "Submitting…" : "Submit for Approval"}
            </button>
          </div>
          <p className="small muted about">
            Editing an approved event sends it back for review. Current
            registrations are retained.
          </p>
        </form>
      )}
      <section className="card card-pad">
        <h2>My Events</h2>
        {loading ? (
          <p className="empty" role="status">
            Loading events…
          </p>
        ) : !events.length ? (
          <p className="empty">No events yet. Create your first opportunity.</p>
        ) : (
          events.map((event) => (
            <div className="manage-row" key={event.id}>
              <div className="grow">
                <h3>{event.title}</h3>
                <p className="small muted">
                  {new Date(event.starts_at).toLocaleString()} ·{" "}
                  {event.location_name}
                </p>
                <span
                  className={`tag ${event.status === "approved" ? "" : "purple"}`}
                >
                  {event.status}
                </span>
              </div>
              <div className="row wrap">
                <Link className="btn ghost" href={`/events/${event.id}`}>
                  View
                </Link>
                <button
                  className="btn outline"
                  onClick={() => void loadAttendees(event)}
                >
                  Participants
                </button>
                {event.status !== "cancelled" &&
                  new Date(event.starts_at) > new Date() && (
                    <button
                      className="btn outline"
                      onClick={() => startEdit(event)}
                    >
                      Edit
                    </button>
                  )}
                {event.status !== "cancelled" &&
                  new Date(event.ends_at) > new Date() && (
                    <button
                      className="btn ghost"
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            "Cancel this event? Participants will see it as cancelled.",
                          )
                        )
                          void action(
                            () =>
                              browserClient().rpc("cancel_event", {
                                p_event_id: event.id,
                              }),
                            "Event cancelled.",
                          );
                      }}
                    >
                      Cancel Event
                    </button>
                  )}
              </div>
            </div>
          ))
        )}
      </section>
      {selected && (
        <section className="card card-pad participants">
          <div className="row between">
            <h2>Participants · {selected.title}</h2>
            <button className="btn ghost" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
          <p className="small muted about">
            Attendance verification is available after the event ends. Each
            person can earn points only once per event.
          </p>
          {attendeesLoading ? (
            <p role="status">Loading participants…</p>
          ) : !registrants.length ? (
            <p className="empty">No registrations yet.</p>
          ) : (
            registrants.map((r) => (
              <div className="manage-row" key={r.registration_id}>
                <div>
                  <h3>{r.display_name}</h3>
                  <p className="small muted">
                    {r.status}
                    {verified.includes(r.user_id)
                      ? " · Attendance verified"
                      : ""}
                  </p>
                </div>
                {r.status === "registered" && !verified.includes(r.user_id) && (
                  <form
                    className="row wrap"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const minutes = Number(
                        new FormData(e.currentTarget).get("minutes") ?? 0,
                      );
                      const ok = await action(
                        () =>
                          browserClient().rpc("verify_attendance", {
                            p_event_id: selected.id,
                            p_user_id: r.user_id,
                            p_volunteer_minutes: minutes,
                          }),
                        "Attendance verified. Participation points awarded.",
                      );
                      if (ok) await loadAttendees(selected);
                    }}
                  >
                    {selected.category === "volunteering" && (
                      <label className="small">
                        Volunteer minutes
                        <input
                          className="minutes-input"
                          name="minutes"
                          type="number"
                          min={0}
                          max={Math.floor(
                            (Date.parse(selected.ends_at) -
                              Date.parse(selected.starts_at)) /
                              60000,
                          )}
                          defaultValue={0}
                          required
                        />
                      </label>
                    )}
                    <button
                      className="btn outline"
                      disabled={
                        busy ||
                        r.user_id === user?.id ||
                        selected.status !== "approved" ||
                        new Date(selected.ends_at) > new Date()
                      }
                    >
                      Verify Attendance
                    </button>
                  </form>
                )}
              </div>
            ))
          )}
        </section>
      )}
    </div>
  );
}
