"use client";
import { useEffect, useId, useRef, useState } from "react";
import { EventMap } from "./event-map";
import {
  geocode,
  type EventLocation,
  type LocationSuggestion,
} from "@/lib/geocoding";
import type { Coordinates } from "@/lib/data";
const emptyEvents: never[] = [];
export function EventLocationPicker({
  initial,
  onChange,
}: {
  initial: EventLocation | null;
  onChange: (location: EventLocation | null) => void;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const [text, setText] = useState(initial?.address ?? "");
  const [point, setPoint] = useState<Coordinates | null>(initial);
  const [selected, setSelected] = useState(Boolean(initial));
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<LocationSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const cancel = () => {
    generation.current++;
    request.current?.abort();
  };
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (search.trim().length < 3) return;
    const controller = new AbortController();
    request.current = controller;
    const version = generation.current;
    const timer = setTimeout(async () => {
      setStatus("Searching addresses…");
      try {
        const results = await geocode(search.trim(), controller.signal);
        if (controller.signal.aborted || version !== generation.current) return;
        setItems(results);
        setActive(-1);
        setStatus(
          results.length
            ? `${results.length} address suggestions available. Use the arrow keys to choose.`
            : "No matching addresses. Try adding a city or street number.",
        );
      } catch (e) {
        if (!controller.signal.aborted && version === generation.current) {
          setError(e instanceof Error ? e.message : "Address search failed.");
          setStatus("");
        }
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search]);
  useEffect(() => {
    if (open && active >= 0)
      root.current
        ?.querySelectorAll('[role="option"]')
        [active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);
  const choose = (item: LocationSuggestion) => {
    cancel();
    setSearch("");
    setText(item.address);
    setPoint(item);
    setSelected(true);
    setOpen(false);
    setItems([]);
    setError("");
    setStatus("Location selected. You can adjust the pin on the map.");
    onChange(item);
  };
  const pick = async (value: Coordinates) => {
    cancel();
    const version = generation.current;
    const controller = new AbortController();
    request.current = controller;
    setSearch("");
    setOpen(false);
    setItems([]);
    setPoint(value);
    setSelected(false);
    setText("");
    setError("");
    setStatus("Finding the address for this pin…");
    onChange(null);
    try {
      const results = await geocode(value, controller.signal);
      if (controller.signal.aborted || version !== generation.current) return;
      if (!results.length) {
        setStatus("");
        setError(
          "No street address was found here. Choose a nearby public venue or search for its address.",
        );
        return;
      }
      const location = { ...value, address: results[0].address };
      setText(location.address);
      setSelected(true);
      setStatus(
        "Map location selected. Address updated to the nearest street address.",
      );
      onChange(location);
    } catch (e) {
      if (!controller.signal.aborted && version === generation.current) {
        setStatus("");
        setError(
          e instanceof Error ? e.message : "Unable to find this address.",
        );
      }
    }
  };
  return (
    <div
      ref={root}
      className="event-location-picker"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <label className="field-label" htmlFor={id}>
        Public event address
      </label>
      <div className="address-search">
        <input
          id={id}
          name="address"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && items.length > 0}
          aria-controls={`${id}-results`}
          aria-activedescendant={
            open && active >= 0 ? `${id}-${active}` : undefined
          }
          aria-describedby={`${id}-help ${id}-status`}
          aria-invalid={Boolean(error) || (!selected && text.length > 0)}
          autoComplete="off"
          required
          maxLength={256}
          value={text}
          onFocus={() => {
            if (!selected && items.length) setOpen(true);
          }}
          onChange={(e) => {
            cancel();
            setText(e.target.value);
            setSearch(e.target.value);
            setSelected(false);
            onChange(null);
            setItems([]);
            setActive(-1);
            setOpen(true);
            setError("");
            setStatus(
              e.target.value.trim().length < 3
                ? "Type at least 3 characters to search."
                : "Searching addresses…",
            );
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              setOpen(false);
            } else if (
              (e.key === "ArrowDown" || e.key === "ArrowUp") &&
              items.length
            ) {
              e.preventDefault();
              setOpen(true);
              setActive((i) =>
                e.key === "ArrowDown"
                  ? (i + 1) % items.length
                  : i <= 0
                    ? items.length - 1
                    : i - 1,
              );
            } else if (e.key === "Enter" && !selected) {
              e.preventDefault();
              if (open && active >= 0 && items[active]) choose(items[active]);
              else
                setStatus(
                  "Choose an address from the suggestions before submitting.",
                );
            }
          }}
        />
        {open && items.length > 0 && (
          <ul
            id={`${id}-results`}
            role="listbox"
            aria-label="Address suggestions"
            className="address-suggestions"
          >
            {items.map((item, i) => (
              <li
                key={item.id}
                id={`${id}-${i}`}
                role="option"
                aria-selected={active === i}
                className={active === i ? "active" : ""}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => choose(item)}
              >
                <strong>{item.title}</strong>
                <span>{item.context}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p id={`${id}-help`} className="small muted about">
        Choose a suggested public venue address, then click the map to adjust
        its pin if needed. Only use public event locations.
      </p>
      <p
        id={`${id}-status`}
        className="small muted"
        role="status"
        aria-live="polite"
      >
        {status}
      </p>
      {error && (
        <p className="error-note" role="alert">
          {error}
        </p>
      )}
      <div className="location-map">
        <EventMap events={emptyEvents} origin={point} onPick={pick} />
      </div>
    </div>
  );
}
