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
  message: string; // thematic result message shown to player on return to map
}

export interface EventChoice {
  id: string;
  label: string;
  description: string;       // shown under the button label
  cost?: number;             // money cost; disables if run.runMoney < cost
  requireMinLives?: number;  // disables if run.livesRemaining < this
  effect: EventEffectDef;
  outcomeMessage?: string;   // thematic result message (used for non-gamble effects)
}

export interface EventDef {
  id: string;
  title: string;
  description: string;
  choices: EventChoice[];
}

// ─── Event definitions ────────────────────────────────────────────────────────

export const EVENTS: EventDef[] = [
  {
    id: "wandering_scholar",
    title: "The Wandering Scholar",
    description:
      "Between chambers you encounter a robed figure staggering under an impossible stack of books. " +
      "They peer at you over their spectacles. \"Ah, a fellow knowledge-seeker! I've assisted many in " +
      "their hour of need. My expertise is available — for a small consulting fee.\"",
    choices: [
      {
        id: "hire",
        label: "Hire the scholar",
        description: "Absorb your next wrong answer",
        cost: 40,
        effect: { type: "shield" },
        outcomeMessage:
          "The scholar nods briskly. \"Leave the difficult ones to me.\" They fall in step beside you.",
      },
      {
        id: "hint",
        label: "Buy a hint",
        description: "One wrong option eliminated on your next question",
        cost: 20,
        effect: { type: "hint" },
        outcomeMessage:
          "The scholar leans in and whispers a clue, then disappears back into the stacks.",
      },
      {
        id: "decline",
        label: "Politely decline",
        description: "Continue on your own",
        effect: { type: "none" },
        outcomeMessage:
          "The scholar shrugs. \"Your loss, your loss,\" they mutter, staggering away under their books.",
      },
    ],
  },

  {
    id: "cursed_tome",
    title: "The Cursed Tome",
    description:
      "A leather-bound book floats on a dusty pedestal, radiating faint violet light. Its spine reads " +
      "*Veritatis Infinitum*. The knowledge inside could sharpen your mind — or scramble it entirely.",
    choices: [
      {
        id: "study",
        label: "Study it carefully",
        description: "Reset your difficulty to Easy",
        effect: { type: "difficulty_set", value: 30 },
        outcomeMessage:
          "The text rearranges itself into something comprehensible. Your mind feels sharper, clearer.",
      },
      {
        id: "skim",
        label: "Skim the key pages",
        description: "Two wrong options eliminated on your next question",
        cost: 15,
        effect: { type: "fifty_fifty" },
        outcomeMessage:
          "You absorb just enough to spot the red herrings ahead. The page crumbles to dust.",
      },
      {
        id: "leave",
        label: "Leave it alone",
        description: "Nothing happens",
        effect: { type: "none" },
        outcomeMessage:
          "Probably wise. Cursed tomes rarely end well for the curious.",
      },
    ],
  },

  {
    id: "gambler",
    title: "The Gambler",
    description:
      "A wiry figure in a patched coat grins behind a rickety table, towers of coins gleaming beside them. " +
      "\"Every scholar bets on what they know,\" they say with a lopsided grin. " +
      "\"Why not put a little something on the line?\"",
    choices: [
      {
        id: "big_wager",
        label: "Big wager",
        description: "50% chance to win $80 back",
        cost: 30,
        effect: {
          type: "gamble",
          prizeOnWin: 80,
          winMessage: "The coin lands in your favor — you pocket $80!",
          loseMessage: "The coin turns against you. Your $30 wager disappears into the gambler's coat.",
        },
      },
      {
        id: "small_bet",
        label: "Small bet",
        description: "50% chance to win $25 back",
        cost: 10,
        effect: {
          type: "gamble",
          prizeOnWin: 25,
          winMessage: "Lucky! You win $25.",
          loseMessage: "Unlucky. The gambler pockets your $10 with a shrug.",
        },
      },
      {
        id: "pass",
        label: "Walk away",
        description: "Nothing happens",
        effect: { type: "none" },
        outcomeMessage:
          "\"Wise,\" says the gambler. \"Or cowardly. Hard to tell the difference.\"",
      },
    ],
  },

  {
    id: "amnesiac_librarian",
    title: "The Amnesiac Librarian",
    description:
      "A flustered librarian rushes past with an armful of wrongly-shelved books, muttering Dewey decimal " +
      "numbers under their breath. They freeze when they see you. " +
      "\"Oh! You look capable — would you spare a moment?\"",
    choices: [
      {
        id: "sort",
        label: "Sort the shelves",
        description: "Gain a free skip",
        effect: { type: "mulligan" },
        outcomeMessage:
          "\"Marvelous! Take this — a blank page for any question you'd rather not answer.\"",
      },
      {
        id: "trade",
        label: "Offer your expertise",
        description: "Pay $10, earn $35",
        cost: 10,
        effect: { type: "money", delta: 35 },
        outcomeMessage:
          "A fair deal. The librarian hands over a small purse with a grateful nod.",
      },
      {
        id: "ignore",
        label: "Sorry, you're on your own",
        description: "Nothing happens",
        effect: { type: "none" },
        outcomeMessage:
          "The librarian sighs and reshelves everything in the wrong place again.",
      },
    ],
  },

  {
    id: "philosophers_gambit",
    title: "The Philosopher's Gambit",
    description:
      "You step into a lecture hall thick with chalk dust. A ghost-pale professor flickers at the board, " +
      "which reads: *Adversity sharpens the mind*. Two scrolls rest on the desk. " +
      "\"Choose your terms,\" the apparition intones.",
    choices: [
      {
        id: "harder",
        label: "Accept the challenge",
        description: "Difficulty +20, earn $45",
        effect: {
          type: "multi",
          effects: [
            { type: "difficulty_delta", delta: 20 },
            { type: "money", delta: 45 },
          ],
        },
        outcomeMessage:
          "The ghost nods approvingly. \"Good. The sharpest mind welcomes friction.\"",
      },
      {
        id: "easier",
        label: "Request an easier track",
        description: "Difficulty −15, pay $20",
        cost: 20,
        effect: { type: "difficulty_delta", delta: -15 },
        outcomeMessage:
          "\"Pragmatic,\" the ghost concedes, adjusting the difficulty curve on your behalf.",
      },
      {
        id: "leave",
        label: "Exit the lecture hall",
        description: "Nothing happens",
        effect: { type: "none" },
        outcomeMessage:
          "You leave the ghost to its chalk-dusted eternity.",
      },
    ],
  },

  {
    id: "alchemists_bargain",
    title: "The Alchemist's Bargain",
    description:
      "An alcove reeking of sulfur opens to your left. A hunched figure peers up from behind bubbling flasks, " +
      "goggles glinting. \"Every transformation requires a sacrifice,\" they croak. " +
      "\"What are you willing to trade?\"",
    choices: [
      {
        id: "life_for_gold",
        label: "Trade a life for $60",
        description: "Lose 1 life, gain $60 (requires 3+ lives)",
        requireMinLives: 3,
        effect: {
          type: "multi",
          effects: [
            { type: "lives", delta: -1 },
            { type: "money", delta: 60 },
          ],
        },
        outcomeMessage:
          "The alchemist extracts something ineffable from you. A flask fills with golden light. \"Fair trade,\" they say.",
      },
      {
        id: "gold_for_life",
        label: "Trade $50 for a life",
        description: "Pay $50, gain 1 life",
        cost: 50,
        effect: { type: "lives", delta: 1 },
        outcomeMessage:
          "The alchemist unstoppers a flask. A warm glow flows through you. You feel more resilient.",
      },
      {
        id: "refuse",
        label: "Back away slowly",
        description: "Nothing happens",
        effect: { type: "none" },
        outcomeMessage:
          "\"Wise,\" the alchemist says, turning back to their work. \"Most aren't.\"",
      },
    ],
  },

  {
    id: "archivists_trial",
    title: "The Archivist's Trial",
    description:
      "A severe archivist in wire-rimmed glasses blocks your path, clipboard in hand. " +
      "\"All who pass must declare their academic discipline,\" she announces flatly. " +
      "No argument will move her. Three ancient scrolls rest in a rack beside her.",
    choices: [
      {
        id: "sciences",
        label: "Natural Sciences",
        description: "Two wrong options eliminated on your next question",
        effect: { type: "fifty_fifty" },
        outcomeMessage:
          "\"Empiricist.\" She makes a note. The scroll falls open to reveal which answers are false.",
      },
      {
        id: "arts",
        label: "History & Arts",
        description: "Absorb your next wrong answer",
        effect: { type: "shield" },
        outcomeMessage:
          "\"Humanist.\" She makes a note. History teaches us, she observes, how to survive our mistakes.",
      },
      {
        id: "mathematics",
        label: "Mathematics & Logic",
        description: "Freeze difficulty for your next 2 wrong answers",
        effect: { type: "freeze", count: 2 },
        outcomeMessage:
          "\"Logician.\" She makes a note. Logic, she remarks, resists the pressure to panic.",
      },
    ],
  },

  {
    id: "temporal_anomaly",
    title: "The Temporal Anomaly",
    description:
      "Time stutters. A pocket watch floats before you, its hands spinning in both directions at once. " +
      "Touching it feels like cheating. But then again — you're in a trivia dungeon. " +
      "The rules were already strange.",
    choices: [
      {
        id: "wind_forward",
        label: "Wind it forward",
        description: "Gain a free skip + $10",
        effect: {
          type: "multi",
          effects: [
            { type: "mulligan" },
            { type: "money", delta: 10 },
          ],
        },
        outcomeMessage:
          "Time skips ahead. Somewhere, a question evaporates before it can be asked.",
      },
      {
        id: "wind_backward",
        label: "Wind it backward",
        description: "Reset difficulty to Medium",
        effect: { type: "difficulty_set", value: 50 },
        outcomeMessage:
          "The watch ticks backward. Your recent string of hard questions unwinds slightly.",
      },
      {
        id: "leave",
        label: "Leave well enough alone",
        description: "Nothing happens",
        effect: { type: "none" },
        outcomeMessage:
          "The watch floats on, ticking both ways. Someone else's problem.",
      },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Deterministically pick an event for a given map node ID.
 *  Same nodeId always produces the same event — survives page refresh. */
export function pickEventForNode(nodeId: string): EventDef {
  let hash = 5381;
  for (let i = 0; i < nodeId.length; i++) {
    hash = ((hash << 5) + hash + nodeId.charCodeAt(i)) & 0x7fffffff;
  }
  return EVENTS[hash % EVENTS.length];
}

export function getEventById(id: string): EventDef | undefined {
  return EVENTS.find((e) => e.id === id);
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
    return effect.effects.reduce(
      (acc, e) => {
        const sub = resolveMechanical(e);
        return {
          moneyDelta:     acc.moneyDelta + sub.moneyDelta,
          livesDelta:     acc.livesDelta + sub.livesDelta,
          difficultySet:  sub.difficultySet ?? acc.difficultySet,
          difficultyDelta: acc.difficultyDelta + sub.difficultyDelta,
          shieldAdd:      acc.shieldAdd + sub.shieldAdd,
          freezeAdd:      acc.freezeAdd + sub.freezeAdd,
          mulliganAdd:    acc.mulliganAdd + sub.mulliganAdd,
          grantHint:      acc.grantHint || sub.grantHint,
          grantFiftyFifty: acc.grantFiftyFifty || sub.grantFiftyFifty,
        };
      },
      zero
    );
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
      moneyDelta:     won ? effect.prizeOnWin : 0,
      livesDelta:     0,
      difficultySet:  null,
      difficultyDelta: 0,
      shieldAdd:      0,
      freezeAdd:      0,
      mulliganAdd:    0,
      grantHint:      false,
      grantFiftyFifty: false,
      message: won ? effect.winMessage : effect.loseMessage,
    };
  }
  return { ...resolveMechanical(effect), message: fallbackMessage };
}
