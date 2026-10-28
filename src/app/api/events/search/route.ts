import { NextResponse, type NextRequest } from "next/server";
import { getEvents } from "@/lib/events";
import { filterEvents } from "@/lib/data";
export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "")
    .trim()
    .slice(0, 200);
  if (!query) return NextResponse.json({ events: [], total: 0 });
  const data = await getEvents();
  if (data.error)
    return NextResponse.json(
      { error: data.error },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  const events = filterEvents(
    data.events,
    query,
    ["volunteer", "event"],
    "any",
    "any",
    null,
  );
  return NextResponse.json(
    {
      events: events
        .slice(0, 6)
        .map((e) => ({
          id: e.id,
          title: e.title,
          place: e.place,
          date: e.date,
        })),
      total: events.length,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
