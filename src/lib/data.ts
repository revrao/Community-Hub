export type Event = {
  id: string;
  title: string;
  type: "volunteer" | "event";
  date: string;
  isoDate: string;
  time: string;
  place: string;
  address: string;
  distance: number;
  image: string;
  spots: number;
  capacity: number;
  points: number;
  description: string;
  organizer: string;
  x: number;
  y: number;
};
export const events: Event[] = [
  {
    id: "cleanup",
    title: "Riverside Park Cleanup",
    type: "volunteer",
    date: "Sat, Oct 31",
    isoDate: "2026-10-31",
    time: "9:00 AM – 12:00 PM",
    place: "Riverside Park",
    address: "123 Park Rd, Ourtown, CA",
    distance: 0.4,
    image: "cleanup.png",
    spots: 12,
    capacity: 20,
    points: 50,
    description:
      "Join us for a community cleanup at Riverside Park! We’ll be picking up litter, improving trails, and helping keep our local park clean and beautiful. All supplies will be provided.",
    organizer: "Green City Initiative",
    x: 40,
    y: 23,
  },
  {
    id: "food",
    title: "Community Food Drive",
    type: "volunteer",
    date: "Sun, Nov 1",
    isoDate: "2026-11-01",
    time: "10:00 AM – 1:00 PM",
    place: "Community Center",
    address: "50 Center St, Ourtown, CA",
    distance: 1.1,
    image: "foodbank.png",
    spots: 8,
    capacity: 30,
    points: 40,
    description:
      "Help sort and distribute donated food and support families in our community.",
    organizer: "Ourtown Food Pantry",
    x: 28,
    y: 60,
  },
  {
    id: "festival",
    title: "Fall Community Festival",
    type: "event",
    date: "Sat, Nov 7",
    isoDate: "2026-11-07",
    time: "12:00 PM – 5:00 PM",
    place: "Main Street",
    address: "200 Main St, Ourtown, CA",
    distance: 1.3,
    image: "festival.png",
    spots: 90,
    capacity: 150,
    points: 10,
    description:
      "Meet neighbors, explore local vendors, enjoy live music, and celebrate our community.",
    organizer: "Ourtown Events",
    x: 73,
    y: 36,
  },
  {
    id: "market",
    title: "Local Farmers Market",
    type: "event",
    date: "Sun, Nov 8",
    isoDate: "2026-11-08",
    time: "8:00 AM – 1:00 PM",
    place: "Central Plaza",
    address: "Central Plaza, Ourtown, CA",
    distance: 1.6,
    image: "market.png",
    spots: 80,
    capacity: 100,
    points: 10,
    description:
      "Discover local produce, handmade goods, and community food vendors.",
    organizer: "Market Association",
    x: 61,
    y: 72,
  },
];
export const leaders = [
  { name: "Maya Chen", points: 250, events: 8, hours: 32 },
  { name: "Alex Johnson", points: 220, events: 7, hours: 28 },
  { name: "Priya Patel", points: 180, events: 6, hours: 24 },
  { name: "Daniel Kim", points: 150, events: 5, hours: 20 },
  { name: "Jordan Lee", points: 130, events: 4, hours: 18 },
  { name: "Community Member", points: 120, events: 6, hours: 14 },
];
