"use client";
import { useState } from "react";
import { leaders } from "@/lib/data";
import { Stats } from "./ui";
export function Leaderboard() {
  const [period, setPeriod] = useState("This Month");
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
            {["This Month", "All Time"].map((p) => (
              <button
                key={p}
                className={`pill ${period === p ? "selected" : ""}`}
                aria-pressed={period === p}
                onClick={() => setPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <p className="small muted board-note">
            Sample rankings ·{" "}
            {period === "This Month" ? "October 2026" : "All time"}
          </p>
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
                {[...leaders].map((l, i) => (
                  <tr key={l.name} className={i === 5 ? "you" : ""}>
                    <td>
                      <span className={`rank rank-${i}`}>{i + 1}</span>
                    </td>
                    <th scope="row">
                      <span className="member">
                        <span className="avatar small-avatar">
                          {l.name
                            .split(" ")
                            .map((x) => x[0])
                            .join("")}
                        </span>
                        {i === 5 ? "You" : l.name}
                      </span>
                    </th>
                    <td>{l.points * (period === "All Time" ? 4 : 1)}</td>
                    <td>{l.events * (period === "All Time" ? 4 : 1)}</td>
                    <td>{l.hours * (period === "All Time" ? 4 : 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <aside className="stack">
          <section className="card card-pad">
            <h2>My Stats</h2>
            <p className="muted about">
              Your sample participation · #{6} this month
            </p>
            <Stats />
          </section>
          <section className="card card-pad">
            <h2>How points work</h2>
            <p className="muted about">
              Points recognize verified participation. An organizer confirms
              attendance before points and volunteer hours are added.
            </p>
            <div className="soft-note">
              No points are awarded for an RSVP alone.
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
