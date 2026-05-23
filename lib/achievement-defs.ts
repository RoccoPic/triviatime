// ─── Achievement definitions (pure data — safe to import in client components) ──

export type AchievementTier = "bronze" | "silver" | "gold";

export type AchievementDef = {
  id: string;
  name: string;
  icon: string;
  description: string;
  tier: AchievementTier;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── First steps ────────────────────────────────────────────────────────────
  {
    id: "first-run",
    name: "Into the Fray",
    icon: "⚔️",
    description: "Complete your first run — win or lose.",
    tier: "bronze",
  },
  {
    id: "first-win",
    name: "Victorious",
    icon: "🏆",
    description: "Win your first run.",
    tier: "silver",
  },

  // ── Score milestones ────────────────────────────────────────────────────────
  {
    id: "score-10",
    name: "Curious Mind",
    icon: "🧠",
    description: "Answer 10 questions correctly in a single run.",
    tier: "bronze",
  },
  {
    id: "score-25",
    name: "Scholar",
    icon: "📖",
    description: "Answer 25 questions correctly in a single run.",
    tier: "silver",
  },
  {
    id: "score-50",
    name: "Mastermind",
    icon: "🎓",
    description: "Answer 50 questions correctly in a single run.",
    tier: "gold",
  },

  // ── Streaks ─────────────────────────────────────────────────────────────────
  {
    id: "hot-streak",
    name: "On Fire",
    icon: "🔥",
    description: "Answer 5 questions correctly in a row.",
    tier: "silver",
  },
  {
    id: "unstoppable",
    name: "Unstoppable",
    icon: "⚡",
    description: "Answer 10 questions correctly in a row.",
    tier: "gold",
  },

  // ── Money ───────────────────────────────────────────────────────────────────
  {
    id: "loaded",
    name: "Loaded",
    icon: "💰",
    description: "Accumulate $200 in run money at once.",
    tier: "silver",
  },

  // ── Relics ──────────────────────────────────────────────────────────────────
  {
    id: "relic-hunter",
    name: "Relic Hunter",
    icon: "🏺",
    description: "Collect 3 relics in a single run.",
    tier: "silver",
  },
  {
    id: "relic-hoarder",
    name: "Relic Hoarder",
    icon: "🔮",
    description: "Collect 5 relics in a single run.",
    tier: "gold",
  },

  // ── Waves ───────────────────────────────────────────────────────────────────
  {
    id: "wave-2",
    name: "Wave Rider",
    icon: "🌊",
    description: "Advance to Wave 2.",
    tier: "silver",
  },
  {
    id: "wave-3",
    name: "Storm Chaser",
    icon: "⛈️",
    description: "Advance to Wave 3.",
    tier: "gold",
  },

  // ── Feats ───────────────────────────────────────────────────────────────────
  {
    id: "survivor",
    name: "Barely Made It",
    icon: "💀",
    description: "Win a run with exactly 1 life remaining.",
    tier: "gold",
  },
  {
    id: "comeback-kid",
    name: "Comeback Kid",
    icon: "💪",
    description: "Win a run after dropping to 1 life.",
    tier: "gold",
  },
  {
    id: "perfectionist",
    name: "Flawless",
    icon: "✨",
    description: "Win a run with no wrong answers.",
    tier: "gold",
  },
  {
    id: "skip-never",
    name: "No Shortcuts",
    icon: "🎯",
    description: "Win a run without skipping a single question.",
    tier: "silver",
  },
];

export function getAchievementById(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
