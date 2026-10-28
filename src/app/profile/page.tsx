import { Profile } from "@/components/profile";
import { parseProfileTab } from "@/lib/profile-navigation";
export const metadata = { title: "Profile" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; notice?: string }>;
}) {
  const params = await searchParams;
  return (
    <Profile initialTab={parseProfileTab(params.tab)} notice={params.notice} />
  );
}
