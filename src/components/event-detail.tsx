"use client";
import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Event } from "@/lib/data";
import { useSession } from "./session-provider";
import { browserClient } from "@/lib/supabase/browser";
import { databaseMessage } from "@/lib/auth";
import { Category, Icon } from "./ui";
import { EventMap } from "./event-map";
import { eventActions, type RegistrationStatus } from "@/lib/event-actions";
export function EventDetail({ event: e }: { event: Event }) {
  const { user, loading } = useSession();
  const router = useRouter();
  const [registration, setRegistration] = useState<RegistrationStatus>(null);
  const registered = registration === "registered";
  const generation = useRef(0);
  const [owner, setOwner] = useState<string | null | undefined>(undefined);
  const [now, setNow] = useState(() => new Date());
  const [saved, setSaved] = useState(false);
  const [spots, setSpots] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(true);
  const [stateReady, setStateReady] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [report, setReport] = useState(false);
  const load = useCallback(async () => {
    const version = ++generation.current;
    setPending(true);
    setStateReady(false);
    try {
      const db = browserClient();
      const available = await db.rpc("event_availability", {
        p_event_id: e.id,
      });
      if (version !== generation.current) return;
      setSpots(available.error ? null : available.data);
      if (user) {
        const [r, s] = await Promise.all([
          db
            .from("registrations")
            .select("status")
            .eq("event_id", e.id)
            .eq("user_id", user.id)
            .maybeSingle(),
          db
            .from("saved_events")
            .select("event_id")
            .eq("event_id", e.id)
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);
        if (version !== generation.current) return;
        if (r.error || s.error)
          setError(databaseMessage((r.error || s.error)!.message));
        else {
          setRegistration(r.data?.status ?? null);
          setSaved(Boolean(s.data));
          setStateReady(true);
        }
      } else {
        setRegistration(null);
        setSaved(false);
        setStateReady(true);
      }
    } catch {
      if (version === generation.current)
        setError("Unable to load your registration. Please try again.");
    } finally {
      if (version === generation.current) {
        setOwner(user?.id ?? null);
        setPending(false);
      }
    }
  }, [e.id, user]);
  useEffect(() => {
    void load();
  }, [load]);
  const login = `/login?next=${encodeURIComponent("/events/" + e.id)}`;
  useEffect(() => {
    const next = [Date.parse(e.startsAt), Date.parse(e.endsAt)]
      .filter((t) => t > now.getTime())
      .sort((a, b) => a - b)[0];
    if (!next) return;
    const timer = setTimeout(
      () => setNow(new Date()),
      Math.min(next - Date.now() + 100, 2147483647),
    );
    return () => clearTimeout(timer);
  }, [e.startsAt, e.endsAt, now]);
  const actions = eventActions(e, registration, spots, now);
  const checking = loading || pending || owner !== (user?.id ?? null);
  const mutate = async (
    action: () => PromiseLike<{ error: { message: string } | null }>,
    success: string,
    completed?: () => void,
  ) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { error } = await action();
      if (error) {
        setError(error.message);
        return;
      }
      completed?.();
      setMessage(success);
      await load();
      router.refresh();
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page">
      <Link className="backlink" href="/">
        ← Back to map
      </Link>
      {e.status !== "approved" && (
        <p className="soft-note">
          Event status: {e.status}. Registration is unavailable.
        </p>
      )}
      <div className="cols-main">
        <div className="stack">
          <section className="card card-pad">
            <div className="event-hero">
              <img src={`/reference/${e.image}`} alt="Category illustration" />
              <div>
                <Category event={e} />
                <h1>{e.title}</h1>
                <div className="event-meta">
                  <p>
                    <Icon name="calendar" />
                    {e.date}
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
                  {checking ? (
                    <p role="status">Checking your registration…</p>
                  ) : !stateReady ? (
                    <button className="btn outline" onClick={() => void load()}>
                      Retry registration status
                    </button>
                  ) : (
                    <>
                      {actions.cancel && (
                        <button
                          className="btn"
                          disabled={busy}
                          onClick={() =>
                            void mutate(
                              () =>
                                browserClient().rpc("cancel_registration", {
                                  p_event_id: e.id,
                                }),
                              "Registration cancelled. Your spot has been released.",
                              () => setRegistration("cancelled"),
                            )
                          }
                        >
                          Cancel Registration
                        </button>
                      )}
                      {actions.register &&
                        (user ? (
                          <button
                            className="btn"
                            disabled={busy || spots === null}
                            onClick={() =>
                              void mutate(
                                () =>
                                  browserClient().rpc("register_for_event", {
                                    p_event_id: e.id,
                                  }),
                                "You’re registered! View your upcoming events in Profile.",
                                () => setRegistration("registered"),
                              )
                            }
                          >
                            {actions.label}
                          </button>
                        ) : (
                          <Link className="btn" href={login}>
                            Sign Up for Event
                          </Link>
                        ))}
                      {actions.save &&
                        (user ? (
                          <button
                            className="btn ghost"
                            disabled={busy}
                            aria-pressed={saved}
                            onClick={() =>
                              void mutate(
                                () =>
                                  saved
                                    ? browserClient()
                                        .from("saved_events")
                                        .delete()
                                        .eq("user_id", user.id)
                                        .eq("event_id", e.id)
                                    : browserClient()
                                        .from("saved_events")
                                        .insert({
                                          user_id: user.id,
                                          event_id: e.id,
                                        }),
                                saved
                                  ? "Removed from saved opportunities."
                                  : "Saved to your profile.",
                              )
                            }
                          >
                            <Icon name="bookmark" />
                            {saved ? "Saved" : "Save"}
                          </button>
                        ) : (
                          <Link className="btn ghost" href={login}>
                            <Icon name="bookmark" />
                            Save
                          </Link>
                        ))}
                    </>
                  )}
                </div>
                {!checking && (
                  <p className="small muted about">
                    {e.status === "cancelled"
                      ? "This event has been cancelled by the organizer."
                      : actions.ended
                        ? "This event has ended."
                        : !actions.open
                          ? "Registration is closed."
                          : registration === "cancelled"
                            ? "Your registration is cancelled. Saved opportunities are unchanged."
                            : registered
                              ? "You are registered for this event."
                              : spots === 0
                                ? "This event is full."
                                : spots === null
                                  ? "Availability could not be checked. Please try again."
                                  : `${spots} ${spots === 1 ? "spot" : "spots"} left`}
                  </p>
                )}

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
                <span>Points after verified attendance</span>
              </div>
            </div>
          </section>
          <section className="card card-pad">
            <h2>About This Event</h2>
            <p className="muted about preserve-lines">{e.description}</p>
            <hr />
            <h3>Participation</h3>
            <p className="muted about">
              Attendance is confirmed by an authorized organizer after the
              event. An RSVP alone does not award points.
            </p>
            {e.status === "approved" &&
              (user ? (
                <button
                  className="linkbutton"
                  onClick={() => setReport(!report)}
                >
                  {report ? "Cancel report" : "Report this event"}
                </button>
              ) : (
                <Link href={login}>Sign in to report a concern</Link>
              ))}
            {report && (
              <form
                className="editor"
                onSubmit={async (f) => {
                  f.preventDefault();
                  const reason = String(
                    new FormData(f.currentTarget).get("reason"),
                  );
                  await mutate(
                    () =>
                      browserClient().rpc("report_event", {
                        p_event_id: e.id,
                        p_reason: reason,
                      }),
                    "Report submitted for administrator review.",
                  );
                }}
              >
                <label className="field-label" htmlFor="reason">
                  Describe your concern
                </label>
                <textarea
                  id="reason"
                  name="reason"
                  minLength={5}
                  maxLength={2000}
                  required
                />
                <button className="btn outline" disabled={busy}>
                  Submit Report
                </button>
              </form>
            )}
          </section>
        </div>
        <aside className="stack">
          <section className="card card-pad">
            <h2>Event Location</h2>
            <div className="location-map">
              <EventMap events={[e]} />
            </div>
            <h3>{e.place}</h3>
            <p className="muted small">{e.address}</p>
            <a
              className="backlink"
              href={`https://www.google.com/maps/search/?api=1&query=${e.latitude},${e.longitude}`}
              target="_blank"
              rel="noreferrer"
            >
              Open directions ↗
            </a>
          </section>
          <section className="card card-pad">
            <h2>Organizer</h2>
            <p className="about">{e.organizer}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
