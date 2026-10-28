import type { Event } from "./data.ts";
export type RegistrationStatus = "registered" | "cancelled" | null;
export function eventActions(
  event: Pick<Event, "status" | "startsAt" | "endsAt">,
  registration: RegistrationStatus,
  spots: number | null,
  now = new Date(),
) {
  const ended = Date.parse(event.endsAt) <= now.getTime();
  const open =
    event.status === "approved" && Date.parse(event.startsAt) > now.getTime();
  return {
    open,
    ended,
    cancel: open && registration === "registered",
    register: open && registration !== "registered" && spots !== 0,
    save: event.status === "approved" && !ended && registration !== "cancelled",
    label: registration === "cancelled" ? "Register Again" : "Sign Up",
  };
}
