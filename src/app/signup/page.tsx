import { googleAvailability } from "@/lib/auth-providers";
import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "Create account" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const google = await googleAvailability();
  return <AuthForm signup googleEnabled={google.enabled} next={params.next} />;
}
