"use client";
import { useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "./ui";
type Result = { id: string; title: string; place: string; date: string };
export function HeaderSearch() {
  const router = useRouter();
  const path = usePathname();
  const id = useId();
  const root = useRef<HTMLFormElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [results, setResults] = useState<Result[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    setOpen(false);
  }, [path]);
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setStatus("");
      setError("");
      return;
    }
    const controller = new AbortController();
    setResults([]);
    setActive(-1);
    setStatus("Searching events…");
    setError("");
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/events/search?q=${encodeURIComponent(query.trim())}`,
          {
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(10000),
            ]),
            cache: "no-store",
          },
        );
        const data = await response.json();
        if (controller.signal.aborted) return;
        if (!response.ok)
          throw new Error("Unable to search right now. Please try again.");
        setResults(data.events);
        setStatus(
          data.total
            ? `${data.total} matching ${data.total === 1 ? "event" : "events"}.`
            : "No matching events. Try a title, category, organizer, or location.",
        );
      } catch {
        if (!controller.signal.aborted) {
          setError("Unable to search right now. Please try again.");
          setStatus("");
        }
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  useEffect(() => {
    if (open && active >= 0)
      root.current
        ?.querySelectorAll("[role=option]")
        [active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);
  const choose = (result: Result) => {
    setOpen(false);
    router.push(`/events/${result.id}`);
  };
  return (
    <form
      ref={root}
      role="search"
      aria-label="Site-wide event search"
      className="header-search"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
      onSubmit={(e) => {
        e.preventDefault();
        setOpen(false);
        router.push(
          query.trim() ? `/?q=${encodeURIComponent(query.trim())}` : "/",
        );
      }}
    >
      <div className="topsearch">
        <Icon name="search" />
        <input
          aria-label="Search opportunities"
          placeholder="Search opportunities"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && Boolean(query.trim())}
          aria-controls={`${id}-results`}
          aria-activedescendant={
            open && active >= 0 ? `${id}-${active}` : undefined
          }
          aria-describedby={`${id}-status`}
          value={query}
          maxLength={200}
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              setOpen(false);
              setActive(-1);
            } else if (
              (e.key === "ArrowDown" || e.key === "ArrowUp") &&
              results.length
            ) {
              e.preventDefault();
              setOpen(true);
              setActive((i) =>
                e.key === "ArrowDown"
                  ? (i + 1) % results.length
                  : i <= 0
                    ? results.length - 1
                    : i - 1,
              );
            } else if (
              e.key === "Enter" &&
              open &&
              active >= 0 &&
              results[active]
            ) {
              e.preventDefault();
              choose(results[active]);
            }
          }}
        />
      </div>
      {open && query.trim() && (
        <div className="header-search-panel">
          <ul
            className="event-search-results"
            role="listbox"
            id={`${id}-results`}
            aria-label="Matching events"
          >
            {results.map((result, i) => (
              <li
                role="option"
                aria-selected={i === active}
                id={`${id}-${i}`}
                key={result.id}
                className={active === i ? "active" : ""}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => choose(result)}
              >
                <strong>{result.title}</strong>
                <span>
                  {result.date} · {result.place}
                </span>
              </li>
            ))}
          </ul>
          <p id={`${id}-status`} className="small muted" role="status">
            {status}
          </p>
          {error && (
            <p role="alert" className="error-note">
              {error}
            </p>
          )}
          <button type="submit" className="linkbutton">
            View all search results
          </button>
        </div>
      )}
    </form>
  );
}
