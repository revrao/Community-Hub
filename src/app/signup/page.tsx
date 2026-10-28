import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "Create account" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  return <AuthForm signup next={params.next} />;
}
