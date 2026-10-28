"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { browserClient } from "@/lib/supabase/browser";
import { type EventRow } from "@/lib/data";
import { databaseMessage } from "@/lib/auth";
type Request = {
  user_id: string;
  display_name: string;
  status: string;
  created_at: string;
};
type Report = {
  id: string;
  event_id: string;
  reason: string;
  status: string;
  created_at: string;
};
type Audit = { id: string; action: string; reason: string; created_at: string };
export function Admin() {
  const [tab, setTab] = useState("Event Approvals");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const db = browserClient();
      const [e, o, r, a] = await Promise.all([
        db
          .from("events")
          .select("*")
          .eq("status", "pending")
          .order("created_at"),
        db.rpc("admin_organizer_requests"),
        db.from("reports").select("*").eq("status", "open").order("created_at"),
        db
          .from("moderation_actions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      const err = e.error || o.error || r.error || a.error;
      if (err) setError(databaseMessage(err.message));
      else {
        setEvents(e.data ?? []);
        setRequests(o.data ?? []);
        setReports(r.data ?? []);
        setAudit(a.data ?? []);
      }
    } catch {
      setError("Unable to load administration data.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const act = async (
    name: string,
    args: Record<string, unknown>,
    success: string,
  ) => {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const { error } = await browserClient().rpc(name, args);
      if (error) {
        setError(error.message);
        return;
      }
      setMessage(success);
      await load();
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page">
      <div className="heading-row">
        <h1>Administration</h1>
        <p className="muted about">
          Review community opportunities, organizers, and reported content.
        </p>
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
      <div className="tabs">
        {[
          "Event Approvals",
          "Organizer Requests",
          "Reports",
          "Moderation History",
        ].map((t) => (
          <button
            key={t}
            aria-pressed={tab === t}
            className={t === tab ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <section className="card card-pad">
        <h2>{tab}</h2>
        {loading ? (
          <p className="empty" role="status">
            Loading review queues…
          </p>
        ) : tab === "Event Approvals" ? (
          events.length ? (
            events.map((e) => (
              <form
                className="review-item"
                key={e.id}
                onSubmit={(f) => {
                  f.preventDefault();
                  const data = new FormData(f.currentTarget);
                  const submitter = (f.nativeEvent as SubmitEvent)
                    .submitter as HTMLButtonElement;
                  void act(
                    "review_event",
                    {
                      p_event_id: e.id,
                      p_approve: submitter.value === "approve",
                      p_reason: String(data.get("reason")),
                    },
                    "Event review recorded.",
                  );
                }}
              >
                <h3>{e.title}</h3>
                <p className="muted small">
                  {e.category === "volunteering"
                    ? "Volunteering"
                    : "Community Event"}{" "}
                  · {new Date(e.starts_at).toLocaleString()} · Capacity{" "}
                  {e.capacity}
                </p>
                <p className="about preserve-lines">{e.description}</p>
                <p className="muted small">
                  {e.location_name} · {e.address} · {e.latitude}, {e.longitude}
                </p>
                <Link className="backlink" href={`/events/${e.id}`}>
                  Review Event Details
                </Link>
                <label className="field-label" htmlFor={`reason-${e.id}`}>
                  Review notes
                </label>
                <input id={`reason-${e.id}`} name="reason" maxLength={2000} />
                <div className="row wrap">
                  <button className="btn" value="approve" disabled={busy}>
                    Approve Event
                  </button>
                  <button className="btn ghost" value="reject" disabled={busy}>
                    Reject Event
                  </button>
                </div>
              </form>
            ))
          ) : (
            <p className="empty">No events awaiting approval.</p>
          )
        ) : tab === "Organizer Requests" ? (
          requests.filter((r) => r.status === "pending").length ? (
            requests
              .filter((r) => r.status === "pending")
              .map((r) => (
                <div className="manage-row" key={r.user_id}>
                  <div>
                    <h3>{r.display_name}</h3>
                    <p className="small muted">
                      Requested {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="row wrap">
                    <button
                      className="btn"
                      disabled={busy}
                      onClick={() =>
                        void act(
                          "review_organizer",
                          { p_user_id: r.user_id, p_approve: true },
                          "Organizer approved.",
                        )
                      }
                    >
                      Approve
                    </button>
                    <button
                      className="btn ghost"
                      disabled={busy}
                      onClick={() =>
                        void act(
                          "review_organizer",
                          { p_user_id: r.user_id, p_approve: false },
                          "Organizer request rejected.",
                        )
                      }
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
          ) : (
            <p className="empty">No organizer requests awaiting review.</p>
          )
        ) : tab === "Reports" ? (
          reports.length ? (
            reports.map((r) => (
              <form
                className="review-item"
                key={r.id}
                onSubmit={(e) => {
                  e.preventDefault();
                  const reason = String(
                    new FormData(e.currentTarget).get("reason"),
                  );
                  const button = (e.nativeEvent as SubmitEvent)
                    .submitter as HTMLButtonElement;
                  void act(
                    "resolve_report",
                    {
                      p_report_id: r.id,
                      p_remove: button.value === "remove",
                      p_reason: reason,
                    },
                    "Moderation decision recorded.",
                  );
                }}
              >
                <h3>Reported Event</h3>
                <p className="about preserve-lines">{r.reason}</p>
                <Link className="backlink" href={`/events/${r.event_id}`}>
                  Review Event
                </Link>
                <label className="field-label" htmlFor={`report-${r.id}`}>
                  Moderation reason
                </label>
                <input
                  id={`report-${r.id}`}
                  name="reason"
                  minLength={3}
                  maxLength={2000}
                  required
                />
                <div className="row wrap">
                  <button className="btn ghost" value="remove" disabled={busy}>
                    Remove Event
                  </button>
                  <button
                    className="btn outline"
                    value="dismiss"
                    disabled={busy}
                  >
                    Dismiss Report
                  </button>
                </div>
              </form>
            ))
          ) : (
            <p className="empty">No open reports.</p>
          )
        ) : audit.length ? (
          audit.map((a) => (
            <div className="manage-row" key={a.id}>
              <div>
                <h3>{a.action.replaceAll("_", " ")}</h3>
                <p className="muted small preserve-lines">{a.reason}</p>
              </div>
              <span className="small muted">
                {new Date(a.created_at).toLocaleString()}
              </span>
            </div>
          ))
        ) : (
          <p className="empty">No moderation actions yet.</p>
        )}
      </section>
    </div>
  );
}
