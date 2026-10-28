import { Explore } from "@/components/explore";
import { getEvents } from "@/lib/events";
export const dynamic = "force-dynamic";
export default async function Page() {
  const data = await getEvents();
  return <Explore {...data} />;
}
