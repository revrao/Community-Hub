"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "./session-provider";
import { browserClient } from "@/lib/supabase/browser";
import { databaseMessage } from "@/lib/auth";
import { EventCard, Stats } from "./ui";
import { eventFromRow, type Event } from "@/lib/data";
export function Profile() {
  const session = useSession();
  const router = useRouter();
  const { profile, user } = session;
  const [tab, setTab] = useState("Overview");
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activity, setActivity] = useState<Event[]>([]);
  const [saved, setSaved] = useState<Event[]>([]);
  const [verified, setVerified] = useState<string[]>([]);
  const [stats, setStats] = useState({ points: 0, events: 0, hours: 0 });
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!user) return;
    setError("");
    setActivityLoading(true);
    try {
      const db = browserClient();
      const [r, s, a, t, o] = await Promise.all([
        db
          .from("registrations")
          .select("events(*)")
          .eq("user_id", user.id)
          .eq("status", "registered"),
        db.from("saved_events").select("events(*)").eq("user_id", user.id),
        db.from("attendance").select("event_id").eq("user_id", user.id),
        db.rpc("my_stats"),
        db
          .from("organizer_requests")
          .select("status")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      if (r.error || s.error || a.error || t.error) {
        setError(
          databaseMessage((r.error || s.error || a.error || t.error)!.message),
        );
        return;
      }
      setActivity(
        (r.data ?? []).flatMap((x: { events: unknown }) =>
          x.events ? [eventFromRow(x.events)] : [],
        ),
      );
      setSaved(
        (s.data ?? []).flatMap((x: { events: unknown }) =>
          x.events ? [eventFromRow(x.events)] : [],
        ),
      );
      setVerified((a.data ?? []).map((x: { event_id: string }) => x.event_id));
      if (t.data?.[0]) setStats(t.data[0]);
      setRequestStatus(o.data?.status ?? null);
    } catch {
      setError("Unable to load your activity. Please try again.");
    } finally {
      setActivityLoading(false);
    }
  }, [user]);
  useEffect(() => {
    void load();
  }, [load]);
  const choices = [
    "Environment",
    "Community Events",
    "Food",
    "Education",
    "Animals",
    "Volunteering",
  ];
  if (session.loading)
    return (
      <div className="page" role="status">
        Loading your profile…
      </div>
    );
  if (!user)
    return (
      <div className="page auth-page card-pad">
        <h1>Your CommunityHub profile</h1>
        <p className="muted about">
          Sign in to manage your activity, interests, and registrations.
        </p>
        <Link className="btn" href="/login?next=/profile">
          Log in
        </Link>{" "}
        <Link className="btn outline" href="/signup?next=/profile">
          Create account
        </Link>
      </div>
    );
  if (!profile)
    return (
      <div className="page">
        <h1>Profile unavailable</h1>
        <p className="error-note" role="alert">
          {session.error || "Your profile could not be loaded."}
        </p>
        <button className="btn" onClick={() => void session.refresh()}>
          Try again
        </button>
      </div>
    );
  const upcoming = activity.filter((e) => new Date(e.endsAt) > new Date());
  const past = activity.filter((e) => new Date(e.endsAt) <= new Date());
  return (
    <div className="page">
      <section className="card profile-header">
        <div className="row">
          <div className="avatar large">
            {profile.display_name
              .split(" ")
              .map((x) => x[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div className="grow">
            <h1>{profile.display_name}</h1>
            <p className="muted">
              {profile.location_area || "Community member"}
            </p>
          </div>
          <button
            className="btn outline"
            onClick={() => {
              setInterests(profile.interests);
              setEditing(!editing);
              setMessage("");
            }}
          >
            {editing ? "Cancel" : "Edit Profile"}
          </button>
        </div>
        <Stats values={stats} />
      </section>
      {(error || session.error) && (
        <p className="error-note" role="alert">
          {error || session.error}
        </p>
      )}
      {message && (
        <p className="soft-note" role="status">
          {message}
        </p>
      )}
      {editing && (
        <form
          className="card card-pad editor"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            setMessage("");
            const f = new FormData(e.currentTarget);
            try {
              const { error } = await browserClient()
                .from("profiles")
                .update({
                  display_name: String(f.get("name")).trim(),
                  bio: String(f.get("bio")).trim(),
                  location_area: String(f.get("area")).trim(),
                  interests,
                  leaderboard_visible: f.get("visible") === "on",
                })
                .eq("id", user.id);
              if (error) {
                setError("Unable to save your profile. Please try again.");
                return;
              }
              await session.refresh();
              setEditing(false);
              setMessage("Your profile has been saved.");
            } catch {
              setError("Unable to connect. Please try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2>Edit Your Profile</h2>
          <label className="field-label" htmlFor="name">
            Full name
          </label>
          <input
            id="name"
            name="name"
            defaultValue={profile.display_name}
            required
            maxLength={80}
            pattern=".*\S.*"
          />
          <label className="field-label" htmlFor="bio">
            Short bio
          </label>
          <textarea
            id="bio"
            name="bio"
            maxLength={500}
            defaultValue={profile.bio}
          />
          <label className="field-label" htmlFor="area">
            Town or neighborhood
          </label>
          <input
            id="area"
            name="area"
            maxLength={120}
            defaultValue={profile.location_area}
          />
          <p className="small muted">
            Use a general area, rather than a home address.
          </p>
          <p className="field-label">Interests</p>
          <div className="pills">
            {choices.map((i) => (
              <button
                type="button"
                key={i}
                className={`pill ${interests.includes(i) ? "selected" : ""}`}
                aria-pressed={interests.includes(i)}
                onClick={() =>
                  setInterests((a) =>
                    a.includes(i) ? a.filter((x) => x !== i) : [...a, i],
                  )
                }
              >
                {i}
              </button>
            ))}
          </div>
          <label className="check-label">
            <input
              name="visible"
              type="checkbox"
              defaultChecked={profile.leaderboard_visible}
            />
            Show my name in public rankings
          </label>
          <button className="btn" disabled={busy}>
            {busy ? "Saving…" : "Save Changes"}
          </button>
        </form>
      )}
      <div className="tabs" aria-label="Profile sections">
        {["Overview", "Upcoming", "Past Activity", "Saved", "Settings"].map(
          (t) => (
            <button
              key={t}
              aria-pressed={tab === t}
              className={tab === t ? "active" : ""}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ),
        )}
      </div>
      {activityLoading && (
        <p className="muted about" role="status">
          Loading your activity…
        </p>
      )}
      {tab === "Overview" ? (
        <div className="grid2">
          <section className="card card-pad">
            <h2>About Me</h2>
            <p className="muted about">
              {profile.bio || "Add a short bio to share your interests."}
            </p>
            <hr />
            <h2>Interests</h2>
            <div className="pills">
              {profile.interests.map((i) => (
                <span className="chip" key={i}>
                  {i}
                </span>
              ))}
            </div>
          </section>
          <section className="card card-pad">
            <h2>My Upcoming Events</h2>
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
            {!activityLoading && !error && !upcoming.length && (
              <p className="empty">
                No upcoming registrations.{" "}
                <Link href="/">Explore opportunities</Link>
              </p>
            )}
          </section>
        </div>
      ) : tab === "Upcoming" || tab === "Past Activity" || tab === "Saved" ? (
        <section className="card card-pad">
          <h2>{tab === "Saved" ? "Saved Opportunities" : tab}</h2>
          {(tab === "Saved" ? saved : tab === "Upcoming" ? upcoming : past).map(
            (e) => (
              <div key={e.id}>
                <EventCard event={e} />
                {tab === "Past Activity" && (
                  <p
                    className={verified.includes(e.id) ? "tag" : "small muted"}
                  >
                    {verified.includes(e.id)
                      ? "Attendance verified"
                      : "Attendance not yet verified"}
                  </p>
                )}
              </div>
            ),
          )}
          {!activityLoading &&
            !error &&
            !(tab === "Saved" ? saved : tab === "Upcoming" ? upcoming : past)
              .length && <p className="empty">No events here yet.</p>}
        </section>
      ) : (
        <section className="card card-pad">
          <h2>Account Settings</h2>
          <p className="muted about">{user.email}</p>
          <div className="row wrap">
            <button
              className="btn outline"
              onClick={() => {
                setInterests(profile.interests);
                setEditing(true);
              }}
            >
              Edit Profile & Interests
            </button>
            <button
              className="btn ghost"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const { error } = await browserClient().auth.signOut({
                  scope: "local",
                });
                setBusy(false);
                if (error) {
                  setError("Unable to log out. Please try again.");
                  return;
                }
                await session.refresh();
                router.push("/");
                router.refresh();
              }}
            >
              Log Out
            </button>
          </div>
          <hr />
          <h2>Community Tools</h2>
          <div className="pills">
            {session.role && (
              <Link className="btn outline" href="/organizer">
                Manage Events
              </Link>
            )}
            {session.role === "admin" && (
              <Link className="btn outline" href="/admin">
                Administration
              </Link>
            )}
            {!session.role && (
              <button
                className="btn outline"
                disabled={
                  busy ||
                  requestStatus === "pending" ||
                  requestStatus === "approved"
                }
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  const { error } =
                    await browserClient().rpc("request_organizer");
                  setBusy(false);
                  if (error) setError(error.message);
                  else {
                    setRequestStatus("pending");
                    setMessage(
                      "Organizer access requested. An administrator will review your request.",
                    );
                  }
                }}
              >
                {requestStatus === "pending"
                  ? "Organizer request pending"
                  : requestStatus === "approved"
                    ? "Organizer request approved"
                    : "Request organizer access"}
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
