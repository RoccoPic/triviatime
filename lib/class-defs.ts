// ─── Class definitions (pure data — safe to import in client components) ───────

export type ClassColor = "zinc" | "blue" | "red" | "amber" | "purple" | "violet" | "orange";

export type ClassDef = {
  id: string;
  name: string;
  icon: string;
  color: ClassColor;
  description: string;
  /** Achievement ID required to unlock this class. null = always unlocked. */
  unlockAchievementId: string | null;
  /** Human-readable unlock hint (shown to locked players). */
  unlockHint: string;
  passives: string[];
};

export const CLASSES: ClassDef[] = [
  {
    id: "regular",
    name: "Regular",
    icon: "🧑",
    color: "zinc",
    description: "No special abilities. A pure test of trivia knowledge.",
    unlockAchievementId: null,
    unlockHint: "Always available.",
    passives: ["No starting bonuses or drawbacks."],
  },
  {
    id: "scholar",
    name: "Scholar",
    icon: "📚",
    color: "blue",
    description: "Book-smart and well-funded. Easier questions and richer rewards.",
    unlockAchievementId: "first-win",
    unlockHint: "Win your first run.",
    passives: [
      "Start at difficulty 35 (easier questions from the start)",
      "Correct answers earn $20 instead of $15",
    ],
  },
  {
    id: "warrior",
    name: "Warrior",
    icon: "⚔️",
    color: "red",
    description: "Built to last. Extra life and automatic shields before every battle.",
    unlockAchievementId: "score-25",
    unlockHint: "Answer 25 questions correctly in a single run.",
    passives: [
      "Start with 4 lives instead of 3",
      "Gain +1 shield when entering any battle, elite, or boss node",
    ],
  },
  {
    id: "merchant",
    name: "Merchant",
    icon: "💰",
    color: "amber",
    description: "Money is no object. Starts loaded and pays less in every shop.",
    unlockAchievementId: "loaded",
    unlockHint: "Accumulate $200 in run money at once.",
    passives: [
      "Start with $40 run money",
      "All shop purchases cost 20% less",
    ],
  },
  {
    id: "rogue",
    name: "Rogue",
    icon: "🗡️",
    color: "purple",
    description: "Slippery and resourceful. Skips are cheap and never break your streak.",
    unlockAchievementId: "hot-streak",
    unlockHint: "Answer 5 questions correctly in a row.",
    passives: [
      "Skips cost $12 (instead of $28)",
      "Start with 2 free skips",
      "Skipping a question doesn't break your combo streak",
    ],
  },
  {
    id: "mystic",
    name: "Mystic",
    icon: "🔮",
    color: "violet",
    description: "Guided by intuition. Near-effortless questions and accelerated healing.",
    unlockAchievementId: "perfectionist",
    unlockHint: "Win a run with no wrong answers.",
    passives: [
      "Start at difficulty 25 (very easy questions)",
      "Start with 50/50 already active",
      "Gain a life after 2 correct in a row (instead of 3)",
    ],
  },
  {
    id: "berserker",
    name: "Berserker",
    icon: "🔥",
    color: "orange",
    description: "Double the reward, double the risk. Wrong answers cost 2 lives.",
    unlockAchievementId: "wave-3",
    unlockHint: "Advance to Wave 3.",
    passives: [
      "Start with 5 lives",
      "All money earned is doubled",
      "Wrong answers cost 2 lives (shields still block fully)",
    ],
  },
];

/** Quick ID → def lookup. */
export function getClassById(id: string): ClassDef | undefined {
  return CLASSES.find((c) => c.id === id);
}

/**
 * Map from achievement ID → the class that unlocks when that achievement is earned.
 * Used by the achievement engine to auto-unlock classes as side effects.
 */
export const ACHIEVEMENT_TO_CLASS: Record<string, string> = {
  "first-win":    "scholar",
  "score-25":     "warrior",
  "loaded":       "merchant",
  "hot-streak":   "rogue",
  "perfectionist":"mystic",
  "wave-3":       "berserker",
};

/** Tailwind color tokens per class color (used in the UI). */
export const CLASS_COLORS: Record<ClassColor, { border: string; bg: string; text: string; badge: string }> = {
  zinc:   { border: "border-zinc-600/50",   bg: "bg-zinc-800/50",   text: "text-zinc-300",   badge: "bg-zinc-700 text-zinc-300" },
  blue:   { border: "border-blue-500/50",   bg: "bg-blue-900/20",   text: "text-blue-300",   badge: "bg-blue-900 text-blue-300" },
  red:    { border: "border-red-500/50",    bg: "bg-red-900/20",    text: "text-red-300",    badge: "bg-red-900 text-red-300" },
  amber:  { border: "border-amber-500/50",  bg: "bg-amber-900/20",  text: "text-amber-300",  badge: "bg-amber-900 text-amber-300" },
  purple: { border: "border-purple-500/50", bg: "bg-purple-900/20", text: "text-purple-300", badge: "bg-purple-900 text-purple-300" },
  violet: { border: "border-violet-500/50", bg: "bg-violet-900/20", text: "text-violet-300", badge: "bg-violet-900 text-violet-300" },
  orange: { border: "border-orange-500/50", bg: "bg-orange-900/20", text: "text-orange-300", badge: "bg-orange-900 text-orange-300" },
};
