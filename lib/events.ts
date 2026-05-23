// ─── Event room types ─────────────────────────────────────────────────────────

/** Flat effects allowed as sub-effects inside "multi" (no nested multi / gamble). */
export type SimpleEventEffect =
  | { type: "none" }
  | { type: "money"; delta: number }
  | { type: "lives"; delta: number }
  | { type: "difficulty_set"; value: number }
  | { type: "difficulty_delta"; delta: number }
  | { type: "shield" }
  | { type: "freeze"; count: number }
  | { type: "mulligan" }
  | { type: "hint" }
  | { type: "fifty_fifty" };

export type EventEffectDef =
  | SimpleEventEffect
  | { type: "gamble"; prizeOnWin: number; winMessage: string; loseMessage: string }
  | { type: "multi"; effects: SimpleEventEffect[] };

export interface EventOutcome {
  moneyDelta: number;
  livesDelta: number;
  difficultySet: number | null;
  difficultyDelta: number;
  shieldAdd: number;
  freezeAdd: number;
  mulliganAdd: number;
  grantHint: boolean;
  grantFiftyFifty: boolean;
  message: string;
}

export interface EventChoice {
  id: string;
  label: string;
  description: string;        // shown under the button label
  cost?: number;              // money cost; choice disabled if run.runMoney < cost
  requireMinLives?: number;   // choice disabled if run.livesRemaining < this
  effect: EventEffectDef;
  outcomeMessage?: string;    // thematic result text (used for non-gamble effects)
}

export interface EventDef {
  id: string;
  title: string;
  description: string;
  choices: EventChoice[];
}

// ─── Category-slug → theme-group mapping ─────────────────────────────────────

const SLUG_TO_THEME: Record<string, string> = {
  // Art
  art: "art", impressionism: "art", "famous-art": "art", photography: "art",
  "graphic-design": "art", architecture: "art", "art-movements": "art", cinematography: "art",
  // Science
  science: "science", biology: "science", "earth-science": "science", genetics: "science",
  "human-anatomy": "science", chemistry: "science", meteorology: "science",
  botany: "science", forensics: "science",
  // History
  history: "history", "world-war-1": "history", "world-war-2": "history",
  "ancient-rome": "history", "industrial-revolution": "history",
  "cold-war": "history", "ancient-egypt": "history",
  // Geography
  geography: "geography", "world-capitals": "geography", "national-parks": "geography",
  "oceans-seas": "geography", islands: "geography", "us-states": "geography",
  countries: "geography",
  // Math
  math: "math", algebra: "math", geometry: "math", trigonometry: "math",
  calculus: "math", statistics: "math", "math-puzzles": "math",
  // Standalone
  sports: "sports",
  technology: "technology",
  "video-games": "video-games",
  astronomy: "astronomy",
  food: "food",
};

// ─── Event definitions (one per theme group) ──────────────────────────────────

const EVENTS_BY_THEME: Record<string, EventDef> = {

  // ── Art ── Mireille Vos ────────────────────────────────────────────────────
  art: {
    id: "mireille_vos",
    title: "Mireille Vos",
    description:
      "A painter in a paint-splattered coat glances up from a canvas she has inexplicably " +
      "propped against the dungeon wall. She studies you with one eye closed. " +
      "\"I am Mireille Vos. Every journey has a composition — " +
      "and I can help you with yours. For a modest fee, of course.\"",
    choices: [
      {
        id: "portrait",
        label: "Commission a portrait",
        description: "Absorb your next wrong answer",
        cost: 35,
        effect: { type: "shield" },
        outcomeMessage:
          "Vos nods briskly, mixing colours. \"Every mistake is a stroke. I'll cover this one for you.\"",
      },
      {
        id: "study",
        label: "Buy a quick study",
        description: "One wrong option eliminated on your next question",
        cost: 15,
        effect: { type: "hint" },
        outcomeMessage:
          "She sketches something in charcoal and hands it to you. \"The eye sees what the mind ignores.\"",
      },
      {
        id: "admire",
        label: "Admire the work and move on",
        description: "Nothing happens",
        effect: { type: "none" },
        outcomeMessage: "\"You have good taste,\" Vos calls after you. \"That, at least, is free.\"",
      },
    ],
  },

  // ── Science ── Professor Aldric Crane ─────────────────────────────────────
  science: {
    id: "professor_crane",
    title: "Professor Aldric Crane",
    description:
      "A wild-haired professor in a singed lab coat strides from a side passage, nearly colliding " +
      "with you. \"Professor Aldric Crane — extraordinary timing! I need a— that is to say, " +
      "I could use a brief consultation. Are you open to a small experiment?\"",
    choices: [
      {
        id: "formula",
        label: "Try the formula",
        description: "Freeze difficulty for 3 wrong answers (results may vary)",
        effect: { type: "freeze", count: 3 },
        outcomeMessage:
          "Crane scribbles your reaction on a notepad. \"Fascinating. The neural-buffering compound appears functional.\"",
      },
      {
        id: "antidote",
        label: "Buy the antidote ($20)",
        description: "Absorb your next wrong answer",
        cost: 20,
        effect: { type: "shield" },
        outcomeMessage:
          "\"The antidote counteracts one critical failure,\" Crane confirms, handing over a small vial.",
      },
      {
        id: "decline",
        label: "Decline the experiment",
        description: "Nothing happens",
        effect: { type: "none" },
        outcomeMessage:
          "\"Completely understandable,\" says Crane, already writing up your refusal as a data point.",
      },
    ],
  },

  // ── History ── Chancellor Varnoth ─────────────────────────────────────────
  history: {
    id: "chancellor_varnoth",
    title: "Chancellor Varnoth",
    description:
      "A spectral figure in ancient robes materializes in your path, parchment scroll in hand. " +
      "\"I am Chancellor Varnoth,\" the apparition intones, " +
      "\"administrator of realms since crumbled to dust. " +
      "My decrees still carry weight — as does my knowledge. Bow, and perhaps I shall share it.\"",
    choices: [
      {
        id: "counsel",
        label: "Heed his counsel",
        description: "Absorb your next wrong answer (he respects deference)",
        effect: { type: "shield" },
        outcomeMessage:
          "The Chancellor nods slowly. \"History rewards those who listen.\" He gestures you through.",
      },
      {
        id: "challenge",
        label: "Challenge his authority",
        description: "Wager $20 for $55 — 50% chance",
        cost: 20,
        effect: {
          type: "gamble",
          prizeOnWin: 55,
          winMessage:
            "The ghost laughs. \"Impertinent! But correct.\" A coin-filled purse materialises in your hand.",
          loseMessage:
            "\"As I expected,\" Varnoth says coldly. The coins evaporate before you can close your fingers.",
        },
      },
      {
        id: "bow",
        label: "Bow and continue",
        description: "Nothing happens",
        effect: { type: "none" },
        outcomeMessage: "Varnoth gestures you through with imperious grace. \"Wisely done.\"",
      },
    ],
  },

  // ── Geography ── Captain Sable Finch ──────────────────────────────────────
  geography: {
    id: "captain_finch",
    title: "Captain Sable Finch",
    description:
      "A weathered woman in a patched captain's coat is crouched over an enormous hand-drawn map " +
      "she has spread across the floor, making notes in the margins. She looks up. " +
      "\"Sable Finch, cartographer and navigator. These passages are more tangled than they look. " +
      "I know them all — for the right consideration.\"",
    choices: [
      {
        id: "charts",
        label: "Buy her charts ($20)",
        description: "Difficulty −15 (she marks the easier paths)",
        cost: 20,
        effect: { type: "difficulty_delta", delta: -15 },
        outcomeMessage:
          "Finch rolls up a chart and hands it over. \"The scenic route. Fewer traps, better views.\"",
      },
      {
        id: "trade",
        label: "Trade information ($10)",
        description: "Pay $10, earn $35",
        cost: 10,
        effect: { type: "money", delta: 35 },
        outcomeMessage:
          "A quick exchange. \"Local knowledge for coin. Fair enough,\" Finch says, marking her ledger.",
      },
      {
        id: "walk",
        label: "You know the way",
        description: "Nothing happens",
        effect: { type: "none" },
        outcomeMessage: "\"Suit yourself,\" Finch mutters, returning to her charts.",
      },
    ],
  },

  // ── Math ── Theron Quill ───────────────────────────────────────────────────
  math: {
    id: "theron_quill",
    title: "Theron Quill",
    description:
      "A reed-thin man in ink-stained robes spins around from a wall he has covered in equations, " +
      "startled to see you. \"Theron Quill — mathematician! I have been computing the optimal path " +
      "through this dungeon for eleven days. The answer is irrational, but beautiful. " +
      "May I offer a demonstration?\"",
    choices: [
      {
        id: "formula",
        label: "Ask for the formula",
        description: "Two wrong options eliminated on your next question",
        effect: { type: "fifty_fifty" },
        outcomeMessage:
          "Quill scribbles furiously. \"By process of elimination — two solutions are clearly false. Take note.\"",
      },
      {
        id: "probability",
        label: "Test his probability ($15)",
        description: "Wager $15 for $40 — 50% chance",
        cost: 15,
        effect: {
          type: "gamble",
          prizeOnWin: 40,
          winMessage:
            "\"Yes! The expected value resolves favourably!\" Quill beams, handing over the winnings.",
          loseMessage:
            "Quill sighs. \"The median outcome. Statistically unsurprising. Better luck next sigma.\"",
        },
      },
      {
        id: "excuse",
        label: "Politely extricate yourself",
        description: "Nothing happens",
        effect: { type: "none" },
        outcomeMessage: "Quill barely notices your departure, already recalculating from first principles.",
      },
    ],
  },

  // ── Sports ── Rowan Ironstone ─────────────────────────────────────────────
  sports: {
    id: "rowan_ironstone",
    title: "Rowan Ironstone",
    description:
      "A barrel-chested former champion plants himself in your way, a bag of trophies clanking at " +
      "his side. He beams. \"Rowan Ironstone! Three-time regional champion, head coach, " +
      "and living legend. You look like you could use some coaching — or at least a trophy " +
      "for morale.\"",
    choices: [
      {
        id: "train",
        label: "Train with Rowan",
        description: "Difficulty +15, earn $45 (hardship builds strength)",
        effect: {
          type: "multi",
          effects: [
            { type: "difficulty_delta", delta: 15 },
            { type: "money", delta: 45 },
          ],
        },
        outcomeMessage:
          "Ironstone puts you through a brutal warm-up. \"Pain is just weakness leaving the mind. Or the dungeon. Either way.\"",
      },
      {
        id: "trophy",
        label: "Buy a trophy ($25)",
        description: "Absorb your next wrong answer",
        cost: 25,
        effect: { type: "shield" },
        outcomeMessage:
          "\"Good for morale,\" Ironstone declares, pressing a small trophy into your hands. \"Champions bounce back.\"",
      },
      {
        id: "sidestep",
        label: "Politely step around him",
        description: "Nothing happens",
        effect: { type: "none" },
        outcomeMessage: "\"Your loss!\" Ironstone calls after you. \"The training montage would have been incredible.\"",
      },
    ],
  },

  // ── Technology ── Zephyr Vance ────────────────────────────────────────────
  technology: {
    id: "zephyr_vance",
    title: "Zephyr Vance",
    description:
      "A hooded figure crouches over a quietly humming device in the middle of the corridor, " +
      "muttering serial numbers. They look up sharply. " +
      "\"Zephyr Vance. Engineer. Optimiser. Your performance metrics suggest room for improvement. " +
      "I have two solutions in stock.\"",
    choices: [
      {
        id: "upgrade",
        label: "Install the upgrade ($30)",
        description: "Freeze difficulty for 3 wrong answers",
        cost: 30,
        effect: { type: "freeze", count: 3 },
        outcomeMessage:
          "Vance installs something behind your ear with a small click. \"Stability patch deployed. You're welcome.\"",
      },
      {
        id: "diagnostic",
        label: "Run diagnostics ($15)",
        description: "Two wrong options eliminated on your next question",
        cost: 15,
        effect: { type: "fifty_fifty" },
        outcomeMessage:
          "\"System scan complete. Two variables eliminated from the decision space.\" Vance turns back to their device.",
      },
      {
        id: "decline",
        label: "Decline all devices",
        description: "Nothing happens",
        effect: { type: "none" },
        outcomeMessage:
          "\"Acceptable,\" Vance says, logging your refusal. \"Control group data is still useful.\"",
      },
    ],
  },

  // ── Video games ── Pixel ──────────────────────────────────────────────────
  "video-games": {
    id: "pixel",
    title: "Pixel",
    description:
      "A blocky figure rendered in glitching pixels materialises from a crack in the wall, " +
      "arms raised in greeting. " +
      "\"HI I AM PIXEL,\" it announces in chunky retro text. " +
      "\"I KNOW THE OLD CODES. THE CHEAT CODES. THEY STILL WORK DOWN HERE. INTERESTED?\"",
    choices: [
      {
        id: "life_code",
        label: "Enter the life code ($40)",
        description: "Gain 1 life",
        cost: 40,
        effect: { type: "lives", delta: 1 },
        outcomeMessage:
          "PIXEL flashes. \"EXTRA LIFE ADDED. RESPAWN POINT SET. GOOD LUCK PLAYER.\"",
      },
      {
        id: "skip_code",
        label: "Enter the skip code ($15)",
        description: "Gain a free skip",
        cost: 15,
        effect: { type: "mulligan" },
        outcomeMessage:
          "PIXEL nods. \"SKIP TOKEN LOADED. USE WISELY. OR NOT WISELY. PIXEL DOES NOT JUDGE.\"",
      },
      {
        id: "close",
        label: "Close the menu",
        description: "Nothing happens",
        effect: { type: "none" },
        outcomeMessage: "PIXEL shrugs in nine pixels. \"OK. PIXEL WILL BE HERE IF YOU CHANGE MIND.\"",
      },
    ],
  },

  // ── Astronomy ── Lyra Coldstone ───────────────────────────────────────────
  astronomy: {
    id: "lyra_coldstone",
    title: "Lyra Coldstone",
    description:
      "A cloaked figure stands motionless with her back to you, eye pressed to a floating telescope " +
      "aimed at a crack of sky far overhead. She speaks without turning. " +
      "\"Lyra Coldstone. The stars have been tracking your progress. " +
      "A difficult alignment approaches. Let me adjust your trajectory.\"",
    choices: [
      {
        id: "reading",
        label: "Request a star reading",
        description: "Difficulty −15 (the cosmos arrange in your favour)",
        effect: { type: "difficulty_delta", delta: -15 },
        outcomeMessage:
          "\"A fortuitous conjunction,\" Coldstone murmurs. \"The questions ahead will bend toward you.\"",
      },
      {
        id: "forecast",
        label: "Commission a forecast ($15)",
        description: "One wrong option eliminated on your next question",
        cost: 15,
        effect: { type: "hint" },
        outcomeMessage:
          "She traces a line across a star chart. \"One possibility is clearly false. The rest is up to you.\"",
      },
      {
        id: "pass",
        label: "The stars can wait",
        description: "Nothing happens",
        effect: { type: "none" },
        outcomeMessage: "\"They always do,\" says Coldstone, not moving.",
      },
    ],
  },

  // ── Food ── Chef Barnabas Holt ────────────────────────────────────────────
  food: {
    id: "chef_barnabas",
    title: "Chef Barnabas Holt",
    description:
      "A stout chef in a flour-dusted apron waves you over from behind a portable stove, " +
      "already ladling. \"Chef Barnabas Holt! Sit down! You look underfed. " +
      "A hungry mind is a wrong-answer mind — this I have proven extensively " +
      "over a distinguished career.\"",
    choices: [
      {
        id: "meal",
        label: "Accept the hearty meal ($35)",
        description: "Gain 1 life",
        cost: 35,
        effect: { type: "lives", delta: 1 },
        outcomeMessage:
          "Holt watches you eat with parental satisfaction. \"Colour returning to the cheeks. Excellent.\"",
      },
      {
        id: "snack",
        label: "Take a quick snack ($10)",
        description: "Pay $10, earn $30",
        cost: 10,
        effect: { type: "money", delta: 30 },
        outcomeMessage:
          "He waves away your money and presses change into your hand. \"On the house — mostly. Tips are appreciated.\"",
      },
      {
        id: "decline",
        label: "I ate before the dungeon",
        description: "Nothing happens",
        effect: { type: "none" },
        outcomeMessage:
          "Holt looks personally affronted. \"Before the dungeon,\" he repeats. \"Before the dungeon.\"",
      },
    ],
  },

  // ── Mystery fallback ── The Chronicler ───────────────────────────────────
  mystery: {
    id: "the_chronicler",
    title: "The Chronicler",
    description:
      "A hooded figure sits cross-legged in the corridor, surrounded by floating scrolls and " +
      "ink-stained hands. They look up calmly. " +
      "\"I am the Chronicler. I have recorded every run made through this dungeon — " +
      "victories, failures, and everything between. Perhaps I can be of assistance.\"",
    choices: [
      {
        id: "counsel",
        label: "Request counsel",
        description: "Two wrong options eliminated on your next question",
        effect: { type: "fifty_fifty" },
        outcomeMessage:
          "The Chronicler consults a scroll. \"Two paths lead nowhere. I have noted which ones.\"",
      },
      {
        id: "trade",
        label: "Trade a secret ($20)",
        description: "Pay $20, earn $50",
        cost: 20,
        effect: { type: "money", delta: 50 },
        outcomeMessage:
          "A small pouch exchanges hands. \"Knowledge for knowledge. The oldest economy.\"",
      },
      {
        id: "pass",
        label: "Pass through in silence",
        description: "Nothing happens",
        effect: { type: "none" },
        outcomeMessage: "The Chronicler makes a note. Every choice, even silence, is recorded.",
      },
    ],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function themeForSlug(categorySlug: string): string {
  return SLUG_TO_THEME[categorySlug] ?? "mystery";
}

/**
 * Pick the themed event for a map node.
 * `themeSlug` is a category slug stored on the node at map-generation time.
 * Falls back to the "mystery" event for unknown slugs or when themeSlug is absent.
 */
export function pickEventForNode(nodeId: string, themeSlug?: string): EventDef {
  const theme = themeSlug ? themeForSlug(themeSlug) : "mystery";
  return EVENTS_BY_THEME[theme] ?? EVENTS_BY_THEME.mystery;
}

/** Look up an event by its id across all themes. */
export function getEventById(id: string): EventDef | undefined {
  return Object.values(EVENTS_BY_THEME).find((e) => e.id === id);
}

export function getChoiceById(event: EventDef, choiceId: string): EventChoice | undefined {
  return event.choices.find((c) => c.id === choiceId);
}

// ─── Effect resolution ────────────────────────────────────────────────────────

function resolveMechanical(
  effect: Exclude<EventEffectDef, { type: "gamble" }>
): Omit<EventOutcome, "message"> {
  const zero = {
    moneyDelta: 0,
    livesDelta: 0,
    difficultySet: null as number | null,
    difficultyDelta: 0,
    shieldAdd: 0,
    freezeAdd: 0,
    mulliganAdd: 0,
    grantHint: false,
    grantFiftyFifty: false,
  };

  if (effect.type === "multi") {
    return effect.effects.reduce((acc, e) => {
      const sub = resolveMechanical(e);
      return {
        moneyDelta:      acc.moneyDelta + sub.moneyDelta,
        livesDelta:      acc.livesDelta + sub.livesDelta,
        difficultySet:   sub.difficultySet ?? acc.difficultySet,
        difficultyDelta: acc.difficultyDelta + sub.difficultyDelta,
        shieldAdd:       acc.shieldAdd + sub.shieldAdd,
        freezeAdd:       acc.freezeAdd + sub.freezeAdd,
        mulliganAdd:     acc.mulliganAdd + sub.mulliganAdd,
        grantHint:       acc.grantHint || sub.grantHint,
        grantFiftyFifty: acc.grantFiftyFifty || sub.grantFiftyFifty,
      };
    }, zero);
  }

  switch (effect.type) {
    case "none":             return zero;
    case "money":            return { ...zero, moneyDelta: effect.delta };
    case "lives":            return { ...zero, livesDelta: effect.delta };
    case "difficulty_set":   return { ...zero, difficultySet: effect.value };
    case "difficulty_delta": return { ...zero, difficultyDelta: effect.delta };
    case "shield":           return { ...zero, shieldAdd: 1 };
    case "freeze":           return { ...zero, freezeAdd: effect.count };
    case "mulligan":         return { ...zero, mulliganAdd: 1 };
    case "hint":             return { ...zero, grantHint: true };
    case "fifty_fifty":      return { ...zero, grantFiftyFifty: true };
  }
}

/**
 * Resolve a choice's effect into a concrete outcome.
 * `fallbackMessage` is used for non-gamble effects; gamble effects supply their own win/lose messages.
 */
export function resolveEffect(effect: EventEffectDef, fallbackMessage: string): EventOutcome {
  if (effect.type === "gamble") {
    const won = Math.random() < 0.5;
    return {
      moneyDelta:      won ? effect.prizeOnWin : 0,
      livesDelta:      0,
      difficultySet:   null,
      difficultyDelta: 0,
      shieldAdd:       0,
      freezeAdd:       0,
      mulliganAdd:     0,
      grantHint:       false,
      grantFiftyFifty: false,
      message: won ? effect.winMessage : effect.loseMessage,
    };
  }
  return { ...resolveMechanical(effect), message: fallbackMessage };
}
