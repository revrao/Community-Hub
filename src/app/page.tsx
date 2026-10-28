import { Explore } from "@/components/explore";
import { getEvents } from "@/lib/events";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const data = await getEvents();
  return (
    <Explore
      {...data}
      initialQuery={typeof params.q === "string" ? params.q.slice(0, 200) : ""}
    />
  );
}
