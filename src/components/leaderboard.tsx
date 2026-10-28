"use client";
import { useEffect, useState } from "react";
import { browserClient } from "@/lib/supabase/browser";
import { useSession } from "./session-provider";
import { Stats } from "./ui";
import { databaseMessage } from "@/lib/auth";
type Leader = {
  user_id: string;
  display_name: string;
  points: number;
  events: number;
  hours: number;
};
export function Leaderboard() {
  const { user } = useSession();
  const [period, setPeriod] = useState("month");
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [stats, setStats] = useState({ points: 0, events: 0, hours: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const db = browserClient();
        const result = await db.rpc("community_leaderboard", {
          p_period: period,
        });
        if (!active) return;
        if (result.error) setError(databaseMessage(result.error.message));
        else setLeaders(result.data ?? []);
        if (user) {
          const s = await db.rpc("my_stats");
          if (active && s.data?.[0]) setStats(s.data[0]);
        } else setStats({ points: 0, events: 0, hours: 0 });
      } catch {
        if (active) setError("Unable to load rankings. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [period, user, retry]);
  const rank = leaders.findIndex((l) => l.user_id === user?.id) + 1;
  return (
    <div className="page">
      <div className="heading-row">
        <h1>Community Leaderboard</h1>
        <p className="muted">
          Recognizing people who make a difference in our community.
        </p>
      </div>
      <div className="cols-main">
        <section className="card card-pad">
          <div className="pills">
            {[
              ["month", "This Month"],
              ["all", "All Time"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={`pill ${period === value ? "selected" : ""}`}
                aria-pressed={period === value}
                onClick={() => setPeriod(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="small muted board-note">
            Verified participation ·{" "}
            {period === "month" ? "Current calendar month (UTC)" : "All time"} ·
            Top 100
          </p>
          {loading ? (
            <p className="empty" role="status">
              Loading rankings…
            </p>
          ) : error ? (
            <div className="error-note" role="alert">
              {error}
              <button
                className="btn outline"
                onClick={() => setRetry((n) => n + 1)}
              >
                Try again
              </button>
            </div>
          ) : !leaders.length ? (
            <p className="empty">
              No verified participation yet. Be among the first to get involved.
            </p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Name</th>
                    <th scope="col">Points</th>
                    <th scope="col">Events</th>
                    <th scope="col">Volunteer Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {leaders.map((l, i) => (
                    <tr
                      key={l.user_id}
                      className={l.user_id === user?.id ? "you" : ""}
                    >
                      <td>
                        <span className={`rank rank-${i}`}>{i + 1}</span>
                      </td>
                      <th scope="row">
                        <span className="member">
                          <span className="avatar small-avatar">
                            {l.display_name
                              .split(" ")
                              .map((x) => x[0])
                              .slice(0, 2)
                              .join("")}
                          </span>
                          {l.display_name}
                          {l.user_id === user?.id ? " (You)" : ""}
                        </span>
                      </th>
                      <td>{l.points}</td>
                      <td>{l.events}</td>
                      <td>{l.hours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <aside className="stack">
          {user && (
            <section className="card card-pad">
              <h2>My Stats</h2>
              <p className="muted about">
                {rank
                  ? `#${rank} in this ranking`
                  : "No public ranking in the top 100 for this period."}
              </p>
              <p className="small muted">
                Your all-time verified participation
              </p>
              <Stats values={stats} />
            </section>
          )}
          <section className="card card-pad">
            <h2>How points work</h2>
            <p className="muted about">
              Verified volunteering earns 50 points per event. Verified
              community-event attendance earns 10. An organizer confirms
              attendance after the event ends.
            </p>
            <div className="soft-note">
              No points are awarded for an RSVP alone. You can hide your name
              from rankings in Profile.
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
