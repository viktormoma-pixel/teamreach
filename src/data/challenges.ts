export type Participant = {
  name: string;
  avatar?: string;
  value: number;
};

export type Challenge = {
  id: string;
  title: string;
  emoji: string;
  unit: string;
  goal: number;
  current: number;
  totalAll: number;
  daysLeft: number;
  surface: "blue" | "mint" | "peach" | "lilac";
  joined: boolean;
  members: number;
  subscribersOnly: boolean;
  history: { day: string; value: number }[];
  participants: Participant[];
  // --- streak/PIN challenges (additive; numeric challenges leave these unset) ---
  /** "numeric" (default, log amounts) or "streak" (check off days). */
  type?: "numeric" | "streak";
  /** ISO date strings (YYYY-MM-DD) the current user has checked off. Streak only. */
  checkedDays?: string[];
  /** Streak window start (ISO YYYY-MM-DD). Streak only; the grid spans startDate..endDate. */
  startDate?: string;
  /** Streak window end = deadline (ISO YYYY-MM-DD). Streak only. */
  endDate?: string;
  /** True when an admin set a PIN; joining requires entering it. */
  pinProtected?: boolean;
};

export const initialChallenges: Challenge[] = [
  {
    id: "pushups",
    title: "Push-ups Marathon",
    emoji: "💪",
    unit: "reps",
    goal: 300,
    current: 120,
    totalAll: 15400,
    daysLeft: 7,
    surface: "blue",
    joined: true,
    members: 12,
    subscribersOnly: false,
    history: [
      { day: "Mon", value: 20 },
      { day: "Tue", value: 25 },
      { day: "Wed", value: 15 },
      { day: "Thu", value: 30 },
      { day: "Fri", value: 30 },
      { day: "Sat", value: 0 },
      { day: "Sun", value: 0 },
    ],
    participants: [
      { name: "Anna", value: 280 },
      { name: "Marco", value: 240 },
      { name: "Lena", value: 195 },
      { name: "Tom", value: 150 },
      { name: "Sven", value: 90 },
      { name: "Maya", value: 60 },
    ],
  },
  {
    id: "running",
    title: "Run 50 km",
    emoji: "🏃",
    unit: "km",
    goal: 50,
    current: 18,
    totalAll: 642,
    daysLeft: 12,
    surface: "mint",
    joined: true,
    members: 8,
    subscribersOnly: false,
    history: [
      { day: "Mon", value: 4 },
      { day: "Tue", value: 0 },
      { day: "Wed", value: 6 },
      { day: "Thu", value: 3 },
      { day: "Fri", value: 5 },
      { day: "Sat", value: 0 },
      { day: "Sun", value: 0 },
    ],
    participants: [
      { name: "Marco", value: 32 },
      { name: "Anna", value: 27 },
      { name: "Lena", value: 22 },
      { name: "Tom", value: 12 },
      { name: "Sven", value: 8 },
    ],
  },
  {
    id: "meditation",
    title: "Daily Meditation",
    emoji: "🧘",
    unit: "min",
    goal: 200,
    current: 0,
    totalAll: 3210,
    daysLeft: 21,
    surface: "lilac",
    joined: false,
    members: 24,
    subscribersOnly: false,
    history: [],
    participants: [
      { name: "Lena", value: 180 },
      { name: "Anna", value: 145 },
      { name: "Tom", value: 110 },
    ],
  },
  {
    id: "water",
    title: "Drink Water",
    emoji: "💧",
    unit: "glasses",
    goal: 56,
    current: 0,
    totalAll: 1840,
    daysLeft: 5,
    surface: "peach",
    joined: false,
    members: 16,
    subscribersOnly: false,
    history: [],
    participants: [
      { name: "Maya", value: 42 },
      { name: "Sven", value: 38 },
      { name: "Marco", value: 30 },
    ],
  },
];

export const leaderboard = [
  { name: "Hassan", score: 1240, you: false },
  { name: "Anna", score: 1180, you: false },
  { name: "You", score: 980, you: true },
  { name: "Marco", score: 870, you: false },
  { name: "Lena", score: 720, you: false },
  { name: "Tom", score: 540, you: false },
];
