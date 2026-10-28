export const profileTabs = [
  "Overview",
  "Upcoming",
  "Past Activity",
  "Saved",
  "Settings",
] as const;
export type ProfileTab = (typeof profileTabs)[number];
const tabKeys: Record<ProfileTab, string> = {
  Overview: "overview",
  Upcoming: "upcoming",
  "Past Activity": "past",
  Saved: "saved",
  Settings: "settings",
};
export function profileHref(tab: ProfileTab) {
  return tab === "Overview" ? "/profile" : `/profile?tab=${tabKeys[tab]}`;
}
export function parseProfileTab(value: string | null | undefined): ProfileTab {
  return profileTabs.find((tab) => tabKeys[tab] === value) ?? "Overview";
}
export function accountLinks(role: string | null) {
  return [
    ...profileTabs.map((tab, i) => ({
      label: [
        "My Profile",
        "Upcoming Events",
        "Past Activity",
        "Saved Events",
        "Settings",
      ][i],
      href: profileHref(tab),
      icon: ["user", "calendar", "clock", "bookmark", "settings"][i],
    })),
    ...(role === "organizer" || role === "admin"
      ? [{ label: "Organizer Dashboard", href: "/organizer", icon: "calendar" }]
      : []),
    ...(role === "admin"
      ? [{ label: "Admin Dashboard", href: "/admin", icon: "shield" }]
      : []),
  ];
}
