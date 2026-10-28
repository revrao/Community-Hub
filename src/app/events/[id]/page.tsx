import { notFound } from "next/navigation";
import { getEvent } from "@/lib/events";
import { EventDetail } from "@/components/event-detail";
export const dynamic = "force-dynamic";
export async function generateMetadata() {
  return { title: "Event Details" };
}
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { event, error } = await getEvent(id);
  if (error)
    return (
      <div className="page">
        <h1>Event unavailable</h1>
        <p className="error-note" role="alert">
          {error}
        </p>
      </div>
    );
  if (!event) notFound();
  return <EventDetail event={event} />;
}
