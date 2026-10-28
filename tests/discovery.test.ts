import { test } from "node:test";
import assert from "node:assert/strict";
import {
  milesBetween,
  filterEvents,
  eventFromRow,
  type EventRow,
} from "../src/lib/data.ts";
import { safeNext } from "../src/lib/auth.ts";
const row: EventRow = {
  id: "event1",
  organizer_id: "org1",
  organizer_name: "Local Association",
  title: "Park Cleanup",
  description: "Improve the local park.",
  category: "volunteering",
  starts_at: "2026-10-31T16:00:00Z",
  ends_at: "2026-10-31T19:00:00Z",
  timezone: "America/Los_Angeles",
  location_name: "Public Park",
  address: "Park Road",
  latitude: 37,
  longitude: -122,
  capacity: 20,
  status: "approved",
};
const now = new Date("2026-10-27T12:00:00Z");
test("formats persisted event times in the stored timezone", () => {
  const event = eventFromRow(row);
  assert.match(event.date, /Oct 31/);
  assert.match(event.time, /9:00 AM/);
  assert.equal(event.organizer, "Local Association");
  assert.equal(event.type, "volunteer");
});
test("distance uses coordinates and does not need or store an address", () => {
  assert.equal(milesBetween(row, row), 0);
  assert.ok(
    Math.abs(
      milesBetween(
        { latitude: 0, longitude: 0 },
        { latitude: 0, longitude: 1 },
      ) - 69.09,
    ) < 0.1,
  );
});
test("shared discovery collection applies search, category, date and distance consistently", () => {
  const event = eventFromRow(row),
    community = eventFromRow({
      ...row,
      id: "event2",
      title: "Festival",
      category: "community_event",
      latitude: 38,
      starts_at: "2026-11-10T16:00:00Z",
      ends_at: "2026-11-10T19:00:00Z",
    });
  const events = [event, community];
  assert.equal(
    filterEvents(
      events,
      "  CLEANUP ",
      ["volunteer", "event"],
      "any",
      "any",
      null,
      now,
    ).length,
    1,
  );
  assert.equal(
    filterEvents(events, "", ["event"], "any", "any", null, now)[0].id,
    "event2",
  );
  assert.equal(
    filterEvents(events, "", ["volunteer", "event"], "week", "any", null, now)
      .length,
    1,
  );
  assert.equal(
    filterEvents(events, "", ["volunteer", "event"], "month", "any", null, now)
      .length,
    1,
  );
  assert.equal(
    filterEvents(events, "", ["volunteer", "event"], "any", "5", row, now)
      .length,
    1,
  );
  assert.equal(
    filterEvents(events, "", ["volunteer"], "any", "5", null, now).length,
    0,
  );
});
test("pending, cancelled and completed events cannot appear in discovery", () => {
  const events = [
    eventFromRow({ ...row, status: "pending" }),
    eventFromRow({ ...row, status: "cancelled" }),
    eventFromRow({ ...row, ends_at: "2026-10-26T19:00:00Z" }),
  ];
  assert.equal(
    filterEvents(events, "", ["volunteer", "event"], "any", "any", null, now)
      .length,
    0,
  );
});
test("auth return paths stay on the local site", () => {
  for (const next of [
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/\n/evil.test",
    "/\t/evil.test",
    "/\u0000/evil.test",
    undefined,
  ])
    assert.equal(safeNext(next), "/profile");
  assert.equal(safeNext("/events/example"), "/events/example");
});
