import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLocations, validLocation } from "../src/lib/geocoding.ts";
test("Mapbox addresses retain longitude/latitude order and full regional context", () => {
  const results = parseLocations({
    features: [
      {
        properties: {
          mapbox_id: "test",
          name: "1 Main St",
          place_formatted: "Springfield, Illinois 62701, United States",
          full_address: "1 Main St, Springfield, Illinois 62701, United States",
          coordinates: { longitude: -89.65, latitude: 39.78 },
        },
      },
    ],
  });
  assert.equal(results[0].latitude, 39.78);
  assert.equal(results[0].longitude, -89.65);
  assert.match(results[0].address, /Illinois/);
  assert.equal(results[0].title, "1 Main St");
});
test("invalid or incomplete geocoding results cannot confirm an event location", () => {
  assert.deepEqual(
    parseLocations({
      features: [
        { properties: { name: "Missing coordinates" } },
        {
          properties: {
            full_address: "Invalid latitude",
            coordinates: { longitude: 0, latitude: 91 },
          },
        },
      ],
    }),
    [],
  );
  assert.equal(validLocation(null), false);
  assert.equal(validLocation({ latitude: NaN, longitude: 0 }), false);
  assert.equal(validLocation({ latitude: 0, longitude: 0 }), true);
  assert.deepEqual(parseLocations({}), []);
});
test("geocoding falls back to geometry and combines address components", () => {
  const results = parseLocations({
    features: [
      {
        id: "a",
        geometry: { coordinates: [-122, 38] },
        properties: {
          name: "Main Street",
          place_formatted: "California, United States",
        },
      },
    ],
  });
  assert.equal(results[0].address, "Main Street, California, United States");
  assert.equal(results[0].longitude, -122);
});

test("forward/reverse geocoding use permanent storage and surface permission/rate failures", async () => {
  const { geocode } = await import("../src/lib/geocoding.ts");
  const originalFetch = globalThis.fetch;
  const previous = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN = "test-public-token";
  const urls: URL[] = [];
  try {
    globalThis.fetch = async (input) => {
      urls.push(new URL(String(input)));
      return Response.json({ features: [] });
    };
    const controller = new AbortController();
    await geocode("1 Main Street", controller.signal);
    await geocode({ latitude: 38, longitude: -122 }, controller.signal);
    assert.equal(urls[0].pathname, "/search/geocode/v6/forward");
    assert.equal(urls[0].searchParams.get("permanent"), "true");
    assert.equal(urls[0].searchParams.get("autocomplete"), "true");
    assert.equal(urls[1].pathname, "/search/geocode/v6/reverse");
    assert.equal(urls[1].searchParams.get("longitude"), "-122");
    assert.equal(urls[1].searchParams.get("latitude"), "38");
    assert.equal(urls[1].searchParams.get("permanent"), "true");
    globalThis.fetch = async () => new Response("", { status: 403 });
    await assert.rejects(
      () => geocode("Main Street", controller.signal),
      /permanent-geocoding/,
    );
    globalThis.fetch = async () => new Response("", { status: 429 });
    await assert.rejects(
      () => geocode("Main Street", controller.signal),
      /busy/,
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (previous === undefined)
      delete process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    else process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN = previous;
  }
});
