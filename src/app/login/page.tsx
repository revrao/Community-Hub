import { googleAvailability } from "@/lib/auth-providers";
import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "Log in" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const google = await googleAvailability();
  return (
    <AuthForm
      googleEnabled={google.enabled}
      next={params.next}
      error={params.error}
    />
  );
}
