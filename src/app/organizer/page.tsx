import Link from "next/link";
import { roleAccess } from "@/lib/access";
import { Organizer } from "@/components/organizer";
export const metadata = { title: "Organizer" };
export default async function Page() {
  const { allowed } = await roleAccess("/organizer");
  if (!allowed)
    return (
      <div className="page">
        <h1>Organizer access required</h1>
        <p className="muted about">
          Request organizer access from Profile → Settings. An administrator
          must approve your request before you can create events.
        </p>
        <Link className="btn" href="/profile">
          Go to Profile
        </Link>
      </div>
    );
  return <Organizer />;
}
