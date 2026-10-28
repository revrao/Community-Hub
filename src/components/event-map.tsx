"use client";
import { useEffect, useRef, useState } from "react";
import type { Event, Coordinates } from "@/lib/data";
import type mapboxgl from "mapbox-gl";
export function EventMap({
  events,
  onSelect,
  onArea,
  origin,
  onPick,
}: {
  events: Event[];
  onSelect?: (id: string) => void;
  onArea?: (value: Coordinates) => void;
  origin?: Coordinates | null;
  onPick?: (value: Coordinates) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const initial = useRef({ events, origin });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let disposed = false;
    let observer: ResizeObserver | undefined;
    const token =
      process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      setError(
        "Mapbox is not configured. Events are still available in the list.",
      );
      return;
    }
    void import("mapbox-gl")
      .then(({ default: Mapbox }) => {
        if (disposed || !container.current) return;
        try {
          const first = initial.current.events[0];
          const center = initial.current.origin;
          const instance = new Mapbox.Map({
            container: container.current,
            accessToken: token,
            style: "mapbox://styles/mapbox/streets-v12",
            center: center
              ? [center.longitude, center.latitude]
              : first
                ? [first.longitude, first.latitude]
                : [-98, 39],
            zoom: center || first ? 11 : 3,
          });
          map.current = instance;
          instance.on("click", (event) => {
            const point = event.lngLat.wrap();
            pickRef.current?.({ latitude: point.lat, longitude: point.lng });
          });
          instance.addControl(new Mapbox.NavigationControl(), "top-right");
          instance.on("load", () => {
            if (disposed) return;
            setError("");
            setReady(true);
          });
          instance.on("error", () =>
            setError(
              "The map could not finish loading. Check your connection or Mapbox origin restrictions; the event list remains available.",
            ),
          );
          observer = new ResizeObserver(() => instance.resize());
          observer.observe(container.current);
        } catch {
          setError(
            "Interactive maps are unavailable in this browser. Use the event list instead.",
          );
        }
      })
      .catch(() =>
        setError("Unable to load the map. Use the event list instead."),
      );
    return () => {
      disposed = true;
      observer?.disconnect();
      markers.current.forEach((m) => m.remove());
      map.current?.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    if (!ready || !map.current) return;
    let disposed = false;
    void import("mapbox-gl").then(({ default: Mapbox }) => {
      if (disposed || !map.current) return;
      markers.current.forEach((m) => m.remove());
      markers.current = events.map((e) => {
        const el = document.createElement(selectRef.current ? "button" : "div");
        el.className = `live-marker ${e.type === "event" ? "purple" : ""}`;
        el.setAttribute(
          "aria-label",
          `${selectRef.current ? "Preview" : "Location of"} ${e.title}`,
        );
        el.setAttribute("role", selectRef.current ? "button" : "img");
        if (selectRef.current) el.setAttribute("type", "button");
        el.textContent = e.type === "event" ? "◈" : "♧";
        if (selectRef.current)
          el.addEventListener("click", () => selectRef.current?.(e.id));
        return new Mapbox.Marker({ element: el })
          .setLngLat([e.longitude, e.latitude])
          .addTo(map.current!);
      });
      if (events.length && !origin) {
        const bounds = new Mapbox.LngLatBounds();
        events.forEach((e) => bounds.extend([e.longitude, e.latitude]));
        map.current.fitBounds(bounds, {
          padding: 65,
          maxZoom: 13,
          duration: 600,
        });
      }
    });
    return () => {
      disposed = true;
    };
  }, [events, ready, origin]);
  useEffect(() => {
    if (ready && origin)
      map.current?.flyTo({
        center: [origin.longitude, origin.latitude],
        zoom: 12,
      });
  }, [origin, ready]);
  useEffect(() => {
    if (!ready || !origin || !onPick || !map.current) return;
    let disposed = false;
    let marker: mapboxgl.Marker | undefined;
    void import("mapbox-gl").then(({ default: Mapbox }) => {
      if (!disposed && map.current)
        marker = new Mapbox.Marker({ color: "#2367ea" })
          .setLngLat([origin.longitude, origin.latitude])
          .addTo(map.current);
    });
    return () => {
      disposed = true;
      marker?.remove();
    };
  }, [ready, origin, onPick]);
  return (
    <>
      <div
        ref={container}
        className="live-map"
        aria-label="Interactive event map"
      />
      {error && (
        <p className="map-error" role="alert">
          {error}
        </p>
      )}
      {onArea && ready && (
        <button
          className="btn map-area"
          onClick={() => {
            const center = map.current?.getCenter();
            if (center) onArea({ latitude: center.lat, longitude: center.lng });
          }}
        >
          Search this area
        </button>
      )}
    </>
  );
}
