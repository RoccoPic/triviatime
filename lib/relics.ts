// ─── Relic definitions ────────────────────────────────────────────────────────
// Relics are passive run items acquired from boss / elite clears.
// They persist across wave progressions but reset on a new run.

export type RelicDef = {
  id: string;
  name: string;
  icon: string;
  description: string;
  /** One-liner shown in the picker with the mechanical detail. */
  detail: string;
};

export const RELICS: RelicDef[] = [
  {
    id: "scholars-tome",
    name: "Scholar's Tome",
    icon: "📚",
    description: "Knowledge compounds.",
    detail: "Each correct answer earns +$8 extra.",
  },
  {
    id: "iron-shield",
    name: "Iron Shield",
    icon: "🛡",
    description: "Enter every fight protected.",
    detail: "Automatically gain +1 shield when entering any battle, elite, or boss node.",
  },
  {
    id: "philosophers-stone",
    name: "Philosopher's Stone",
    icon: "⚗",
    description: "Even failure has value.",
    detail: "Wrong answers still earn $7 consolation money.",
  },
  {
    id: "hardened-mind",
    name: "Hardened Mind",
    icon: "🧘",
    description: "A ceiling on suffering.",
    detail: "Your difficulty score can never exceed 70.",
  },
  {
    id: "adrenaline-rush",
    name: "Adrenaline Rush",
    icon: "⚡",
    description: "Failure only makes you sharper.",
    detail: "Wrong answers no longer raise your difficulty.",
  },
  {
    id: "golden-fleece",
    name: "Golden Fleece",
    icon: "✨",
    description: "Heroes deserve heroic rewards.",
    detail: "Correct answers earn double money on boss floors.",
  },
  {
    id: "vampires-fang",
    name: "Vampire's Fang",
    icon: "🔮",
    description: "Vitality flows more freely.",
    detail: "Life-gain streak reduced to 2 correct answers in a row (instead of 3).",
  },
  {
    id: "lucky-coin",
    name: "Lucky Coin",
    icon: "🍀",
    description: "Fortune favors the bold.",
    detail: "25% chance each correct answer pays double money.",
  },
  {
    id: "double-edged-sword",
    name: "Double-Edged Sword",
    icon: "⚔",
    description: "High risk, high reward.",
    detail: "All money earned is doubled, but wrong answers cost you $10.",
  },
  {
    id: "cats-paw",
    name: "Cat's Paw",
    icon: "🐱",
    description: "Nine lives — well, one extra.",
    detail: "Once per run, survive what would have been your killing blow at 1 HP.",
  },
  {
    id: "bargain-hunter",
    name: "Bargain Hunter",
    icon: "💰",
    description: "Everything is negotiable.",
    detail: "All in-run shop items cost 20% less.",
  },
  {
    id: "relentless-spirit",
    name: "Relentless Spirit",
    icon: "💪",
    description: "Wave after wave, unbowed.",
    detail: "Gain +1 life every time you progress to a new wave.",
  },
];

export function getRelicById(id: string): RelicDef | undefined {
  return RELICS.find((r) => r.id === id);
}

/** Pick `count` random relics the player doesn't already own. */
export function pickRandomRelics(count: number, ownedIds: string[]): RelicDef[] {
  const pool = RELICS.filter((r) => !ownedIds.includes(r.id));
  // Fisher-Yates shuffle
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, Math.min(count, arr.length));
}
