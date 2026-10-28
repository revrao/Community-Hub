import { test } from "node:test";
import assert from "node:assert/strict";
import { eventActions } from "../src/lib/event-actions.ts";
import { filterEvents, eventFromRow } from "../src/lib/data.ts";
const now = new Date("2026-10-27T12:00:00Z");
const event = {
  status: "approved" as const,
  startsAt: "2026-11-15T12:00:00Z",
  endsAt: "2026-11-15T13:00:00Z",
};
test("registration actions distinguish initial, registered and persisted cancelled states", () => {
  assert.deepEqual(eventActions(event, null, 2, now), {
    open: true,
    ended: false,
    cancel: false,
    register: true,
    save: true,
    label: "Sign Up",
  });
  const registered = eventActions(event, "registered", 1, now);
  assert.equal(registered.cancel, true);
  assert.equal(registered.register, false);
  assert.equal(registered.save, true);
  const cancelled = eventActions(event, "cancelled", 2, now);
  assert.equal(cancelled.cancel, false);
  assert.equal(cancelled.save, false);
  assert.equal(cancelled.register, true);
  assert.equal(cancelled.label, "Register Again");
  assert.equal(eventActions(event, "cancelled", 0, now).register, false);
});
test("organizer cancellation, pending events, started and completed events have no registration actions", () => {
  for (const e of [
    { ...event, status: "cancelled" as const },
    { ...event, status: "pending" as const },
    { ...event, startsAt: "2026-10-27T11:00:00Z" },
    {
      ...event,
      startsAt: "2026-10-27T10:00:00Z",
      endsAt: "2026-10-27T11:00:00Z",
    },
  ]) {
    for (const status of [null, "registered", "cancelled"] as const) {
      const a = eventActions(e, status, 2, now);
      assert.equal(a.register, false);
      assert.equal(a.cancel, false);
    }
  }
  assert.equal(
    eventActions({ ...event, status: "cancelled" }, "registered", 2, now).save,
    false,
  );
});
test("discovery search matches all requested fields using the shared filter", () => {
  const e = eventFromRow({
    id: "a",
    organizer_id: "o",
    organizer_name: "Helping Hands Group",
    title: "River cleanup",
    description: "Restore habitat together",
    category: "volunteering",
    starts_at: event.startsAt,
    ends_at: event.endsAt,
    timezone: "UTC",
    location_name: "Civic Park",
    address: "12 Main Street, Oakland",
    latitude: 38,
    longitude: -122,
    capacity: 20,
    status: "approved",
  });
  for (const q of [
    "river",
    "habitat",
    "volunteering",
    "Helping Hands",
    "Civic Park",
    "Oakland",
  ])
    assert.equal(
      filterEvents([e], q, ["volunteer", "event"], "any", "any", null, now)
        .length,
      1,
      q,
    );
  assert.equal(
    filterEvents(
      [e],
      "unmatched phrase",
      ["volunteer", "event"],
      "any",
      "any",
      null,
      now,
    ).length,
    0,
  );
  assert.equal(
    filterEvents(
      [{ ...e, status: "cancelled" }],
      "river",
      ["volunteer", "event"],
      "any",
      "any",
      null,
      now,
    ).length,
    0,
  );
});
