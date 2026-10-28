"use client";
import { useId, useState } from "react";
import { EventMap } from "./event-map";
import { validLocation, type EventLocation } from "@/lib/event-location";
import type { Coordinates } from "@/lib/data";
const emptyEvents: never[] = [];
export function EventLocationPicker({ initial, onChange }: {
  initial: EventLocation | null;
  onChange: (location: EventLocation | null) => void;
}) {
  const id = useId();
  const [address, setAddress] = useState(initial?.address ?? "");
  const [point, setPoint] = useState<Coordinates | null>(initial);
  const [confirmed, setConfirmed] = useState(Boolean(initial && validLocation(initial)));
  const [message, setMessage] = useState("");
  const updateAddress = (value: string) => {
    setAddress(value);
    // A changed address needs pin confirmation to avoid stale coordinates.
    setConfirmed(false);
    onChange(null);
    setMessage("Click the map to confirm the pin for this address.");
  };
  const choosePoint = (value: Coordinates) => {
    setPoint(value);
    setConfirmed(true);
    onChange(address.trim() ? { ...value, address: address.trim() } : null);
    setMessage(address.trim()
      ? "Pin confirmed. Check that it matches the address you entered."
      : "Pin placed. Enter the public address, then confirm its pin.");
  };
  return (
    <div className="event-location-picker">
      <label className="field-label" htmlFor={id}>Public event address</label>
      <input id={id} name="address" required maxLength={300} value={address}
        onChange={e => updateAddress(e.target.value)}
        aria-describedby={`${id}-help ${id}-status`} autoComplete="off" />
      <p className="small muted about" id={`${id}-help`}>
        Enter the full public venue address, then click the map to place its pin.
        Addresses are entered manually; no address lookup is performed.
      </p>
      <div className="location-map">
        <EventMap events={emptyEvents} origin={point} onPick={choosePoint} />
      </div>
      {point && <button type="button" className="btn outline"
        onClick={() => choosePoint(point)}>Confirm current pin</button>}
      <p className="small muted" role="status" id={`${id}-status`}>
        {message || (confirmed ? "Existing location loaded."
          : "Choose the event location on the map before submitting.")}
      </p>
    </div>
  );
}
