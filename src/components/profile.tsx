"use client";
import { useState } from "react";
import { useDemo } from "./demo-provider";
import { events } from "@/lib/data";
import { EventCard, Stats } from "./ui";
export function Profile() {
  const demo = useDemo();
  const [tab, setTab] = useState("Overview");
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [interests, setInterests] = useState(demo.interests);
  const choices = [
    "Environment",
    "Community Events",
    "Food",
    "Education",
    "Animals",
    "Volunteering",
  ];
  return (
    <div className="page">
      <section className="card profile-header">
        <div className="row">
          <div className="avatar large">
            {demo.name
              .split(" ")
              .map((x) => x[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div className="grow">
            <h1>{demo.name}</h1>
            <p className="muted">Ourtown, CA · Sample member profile</p>
          </div>
          <button
            className="btn outline"
            onClick={() => {
              setInterests(demo.interests);
              setEditing(!editing);
              setMessage("");
            }}
          >
            {editing ? "Cancel" : "Edit Profile"}
          </button>
        </div>
        <Stats />
      </section>
      {editing && (
        <form
          className="card card-pad editor"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            demo.updateProfile(
              String(data.get("name")).trim(),
              String(data.get("bio")).trim(),
              interests,
            );
            setEditing(false);
            setMessage(
              "Profile updated for this preview. Changes reset on refresh.",
            );
          }}
        >
          <h2>Edit Your Profile</h2>
          <label className="field-label" htmlFor="name">
            Full name
          </label>
          <input
            id="name"
            name="name"
            defaultValue={demo.name}
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
            defaultValue={demo.bio}
          />
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
          <button className="btn" type="submit">
            Apply preview changes
          </button>
        </form>
      )}
      {message && (
        <p className="soft-note" role="status">
          {message}
        </p>
      )}
      <div className="tabs" role="tablist" aria-label="Profile sections">
        {["Overview", "Upcoming", "Past Activity", "Saved", "Settings"].map(
          (t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              aria-controls="profile-panel"
              id={`tab-${t.replace(" ", "-")}`}
              className={tab === t ? "active" : ""}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ),
        )}
      </div>
      <div
        id="profile-panel"
        role="tabpanel"
        aria-labelledby={`tab-${tab.replace(" ", "-")}`}
      >
        {tab === "Overview" ? (
          <div className="grid2">
            <section className="card card-pad">
              <h2>About Me</h2>
              <p className="muted about">{demo.bio}</p>
              <hr />
              <h2>Interests</h2>
              <div className="pills">
                {demo.interests.map((i) => (
                  <span key={i} className="chip">
                    {i}
                  </span>
                ))}
              </div>
            </section>
            <section className="card card-pad">
              <h2>My Upcoming Events</h2>
              {demo.registered.length ? (
                events
                  .filter((e) => demo.registered.includes(e.id))
                  .map((e) => <EventCard key={e.id} event={e} />)
              ) : (
                <p className="soft-note">
                  No sample registrations yet. Explore an opportunity and try a
                  sample RSVP.
                </p>
              )}
            </section>
          </div>
        ) : tab === "Upcoming" || tab === "Saved" ? (
          <section className="card card-pad">
            <h2>
              {tab === "Saved" ? "Saved Opportunities" : "Upcoming Events"}
            </h2>
            {events
              .filter((e) =>
                (tab === "Saved" ? demo.saved : demo.registered).includes(e.id),
              )
              .map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            {!(tab === "Saved" ? demo.saved : demo.registered).length && (
              <p className="empty">
                {tab === "Saved"
                  ? "No saved opportunities yet. Save an event from its details."
                  : "No sample registrations yet."}
              </p>
            )}
          </section>
        ) : tab === "Past Activity" ? (
          <section className="card card-pad">
            <h2>Past Activity</h2>
            {[
              "Community Garden Help",
              "Neighborhood Book Swap",
              "Food Pantry Volunteer Shift",
            ].map((t) => (
              <div className="activity-row" key={t}>
                <div>
                  <h3>{t}</h3>
                  <p className="muted small">
                    Sample completed activity · Organizer verified
                  </p>
                </div>
                <span className="tag">Completed</span>
              </div>
            ))}
            <p className="small muted">
              Illustrative history only. Real points require verified
              attendance.
            </p>
          </section>
        ) : (
          <section className="card card-pad">
            <h2>Account Settings</h2>
            <p className="muted about">
              Authentication, privacy preferences, and account management will
              be available after Supabase is connected.
            </p>
            <button
              className="btn outline"
              onClick={() => {
                setInterests(demo.interests);
                setEditing(true);
              }}
            >
              Edit Profile & Interests
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
