import { roleAccess } from "@/lib/access";
import { Admin } from "@/components/admin";
export const metadata = { title: "Administration" };
export default async function Page() {
  const { allowed } = await roleAccess("/admin", true);
  if (!allowed)
    return (
      <div className="page">
        <h1>Administrator access required</h1>
        <p className="muted about">
          Your account does not have administrative permissions.
        </p>
      </div>
    );
  return <Admin />;
}
