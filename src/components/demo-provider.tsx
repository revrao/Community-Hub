"use client";
import { createContext, useContext, useState } from "react";
type Demo = {
  saved: string[];
  registered: string[];
  toggleSave: (id: string) => void;
  toggleRegistration: (id: string) => void;
  name: string;
  bio: string;
  interests: string[];
  updateProfile: (name: string, bio: string, interests: string[]) => void;
};
const Context = createContext<Demo | null>(null);
export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [saved, setSaved] = useState(["festival"]);
  const [registered, setRegistered] = useState<string[]>([]);
  const [name, setName] = useState("Community Member");
  const [bio, setBio] = useState(
    "Interested in environmental conservation, local events, and meeting new people in the community.",
  );
  const [interests, setInterests] = useState([
    "Environment",
    "Community Events",
    "Food",
    "Education",
    "Animals",
  ]);
  const toggle = (arr: string[], id: string) =>
    arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
  return (
    <Context.Provider
      value={{
        saved,
        registered,
        name,
        bio,
        interests,
        toggleSave: (id) => setSaved((a) => toggle(a, id)),
        toggleRegistration: (id) => setRegistered((a) => toggle(a, id)),
        updateProfile: (n, b, i) => {
          setName(n);
          setBio(b);
          setInterests(i);
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useDemo() {
  const value = useContext(Context);
  if (!value) throw new Error("Demo provider missing");
  return value;
}
