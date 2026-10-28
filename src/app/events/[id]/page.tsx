import { notFound } from "next/navigation";
import { events } from "@/lib/data";
import { EventDetail } from "@/components/event-detail";
export function generateStaticParams() {
  return events.map((e) => ({ id: e.id }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return { title: events.find((e) => e.id === id)?.title || "Event not found" };
}
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = events.find((e) => e.id === id);
  if (!event) notFound();
  return <EventDetail event={event} />;
}
