import { prisma } from "@/lib/db";
import { getMonsterTitle } from "@/lib/monsterList";
import {
  generateMap, getAvailableNodeIds, getNodeById, isMapComplete, nodeToFloorNumber,
  type RunMapData, type MapNode,
} from "@/lib/map";
import {
  pickEventForNode, getEventById, getChoiceById, resolveEffect,
  type EventDef,
} from "@/lib/events";
import { getBossForCategory } from "@/lib/bosses";
import { pickRandomRelics, pickRelicsDeterministic, getRelicById, type RelicDef } from "@/lib/relics";
import { checkAndGrantAchievements } from "@/lib/achievements";
import { getClassById } from "@/lib/class-defs";
import {
  LIVES_START,
  RUN_MONEY_START,
  MONEY_PER_CORRECT,
  SKIP_COST,
  QUESTIONS_PER_FLOOR,
  BOSS_EXTRA_QUESTIONS,
  questionsPerFloor,
  waveStartDifficulty,
  STREAK_FOR_LIFE,
  DIFFICULTY_SCORE_MIN,
  DIFFICULTY_SCORE_MAX,
  DIFFICULTY_STEP,
  PLAYER_DIFFICULTY_START,
  PLAYER_DIFFICULTY_STEP,
  PLAYER_DIFFICULTY_WINDOW,
  SHOP_EXTRA_LIFE,
  SHOP_SECOND_CHANCE,
  SHOP_FIFTY_FIFTY,
  SHOP_HINT,
  SHOP_FREEZE_DIFFICULTY,
  SHOP_DOUBLE_DOWN,
  SHOP_DIFFICULTY_RESET,
  SHOP_CATEGORY_SWAP,
  SHOP_CATEGORY_LOCK,
  SHOP_MULLIGAN,
  SHOP_FLOOR_PEEK,
} from "./constants";

// ─── Helpers ────────────────────────────────────────────────────────────────

function seededRandom(seed: number) {
  return function () {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}

/** Deterministically pick wrong indices to eliminate for 50/50 or Hint. */
function computeEliminatedIndices(
  correctIndex: number,
  optionCount: number,
  count: number,
  seed: number
): number[] {
  const wrong = Array.from({ length: optionCount }, (_, i) => i).filter((i) => i !== correctIndex);
  const rng = seededRandom(Math.abs(seed));
  for (let i = wrong.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [wrong[i], wrong[j]] = [wrong[j], wrong[i]];
  }
  return wrong.slice(0, Math.min(count, wrong.length));
}

// ─── Types ──────────────────────────────────────────────────────────────────

type QuestionRow = { id: string; text: string; options: unknown; correctIndex: number };

export type WaveCompleteState = {
  state: "wave_complete";
  run: RunState;
};

export type RunFloorClearState = {
  state: "floor_clear";
  run: RunState;
  mapData: RunMapData;
  floorCategory: { name: string };
};

export type RunRelicPickState = {
  state: "relic_pick";
  run: RunState;
  choices: RelicDef[];
  mapData: RunMapData;
  floorCategory: { name: string };
};

export type RunState = {
  id: string;
  livesRemaining: number;
  runMoney: number;
  currentFloor: number;
  score: number;
  wave: number;
  endedAt: Date | null;
  playerDifficulty: number;
  skipCostRun: number;
  moneyPerCorrectRun: number;
  streakForLifeRun: number;
  diffStepRun: number;
  shieldCount: number;
  freezeCount: number;
  moneyMultiplier: number;
  hasFiftyFifty: boolean;
  hasHint: boolean;
  freeMulligan: number;
  secondWindAvailable: boolean;
  floorCategoryOrder: string[];
  relics: string[];
  comboCount: number;
  runClass: string;
};

export type RunWithEncounter = {
  run: RunState;
  floorCategory: { id: string; slug: string; name: string };
  monsterTitle: string;
  encounterIndex: number;
  totalEncountersThisFloor: number;
  question: { id: string; text: string; options: string[]; eliminatedIndices?: number[] };
  floorCategoryOrder: string[];
  /** Present on the first question of a boss node — triggers the intro card in the UI. */
  boss?: { name: string; title: string; dialogue: string; icon: string };
};

export type { RunMapData, MapNode, EventDef, RelicDef };

export type RunMapState = {
  state: "map";
  run: RunState;
  mapData: RunMapData;
  availableNodeIds: string[];
};

export type RunEventState = {
  state: "event";
  run: RunState;
  mapData: RunMapData;
  event: EventDef;
};

export type EnterNodeResult =
  | { state: "encounter"; encounter: RunWithEncounter }
  | { state: "free_shop"; run: RunState; mapData: RunMapData; availableNodeIds: string[] }
  | { state: "rest"; run: RunState; mapData: RunMapData; availableNodeIds: string[] }
  | RunEventState
  | WaveCompleteState;

export type ShopItem =
  | "extra_life"
  | "second_chance"
  | "fifty_fifty"
  | "hint"
  | "freeze_difficulty"
  | "double_down"
  | "difficulty_reset"
  | "category_swap"
  | "category_lock"
  | "mulligan"
  | "floor_peek";

const SHOP_PRICES: Record<ShopItem, number> = {
  extra_life:        SHOP_EXTRA_LIFE,
  second_chance:     SHOP_SECOND_CHANCE,
  fifty_fifty:       SHOP_FIFTY_FIFTY,
  hint:              SHOP_HINT,
  freeze_difficulty: SHOP_FREEZE_DIFFICULTY,
  double_down:       SHOP_DOUBLE_DOWN,
  difficulty_reset:  SHOP_DIFFICULTY_RESET,
  category_swap:     SHOP_CATEGORY_SWAP,
  category_lock:     SHOP_CATEGORY_LOCK,
  mulligan:          SHOP_MULLIGAN,
  floor_peek:        SHOP_FLOOR_PEEK,
};

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Encode the floor number and wave into a single integer for Answer.floorIndex.
 * Wave 1 → same values as before (1–99) so existing data stays valid.
 * Wave 2 → 101–199, Wave 3 → 201–299, etc.
 * This prevents wave-2 answers from matching wave-1 floor filter queries.
 */
function waveFloorIndex(col1Floor: number, wave: number): number {
  return (wave - 1) * 100 + col1Floor;
}

function toRunState(run: any): RunState {
  return {
    id: run.id,
    livesRemaining: run.livesRemaining,
    runMoney: run.runMoney,
    currentFloor: run.currentFloor,
    score: run.score,
    wave: run.wave ?? 1,
    endedAt: run.endedAt,
    playerDifficulty: run.playerDifficulty,
    skipCostRun: run.skipCostRun ?? SKIP_COST,
    moneyPerCorrectRun: run.moneyPerCorrectRun ?? MONEY_PER_CORRECT,
    streakForLifeRun: run.streakForLifeRun ?? STREAK_FOR_LIFE,
    diffStepRun: run.diffStepRun ?? PLAYER_DIFFICULTY_STEP,
    shieldCount: run.shieldCount ?? 0,
    freezeCount: run.freezeCount ?? 0,
    moneyMultiplier: run.moneyMultiplier ?? 1.0,
    hasFiftyFifty: run.hasFiftyFifty ?? false,
    hasHint: run.hasHint ?? false,
    freeMulligan: run.freeMulligan ?? 0,
    secondWindAvailable: run.secondWindAvailable ?? false,
    floorCategoryOrder: (run.floorCategoryOrder as string[]) ?? [],
    relics: (run.relics as string[]) ?? [],
    comboCount: run.comboCount ?? 0,
    runClass: run.runClass ?? "regular",
  };
}

/** Money multiplier from current combo streak. */
function comboMultiplier(combo: number): number {
  if (combo >= 4) return 2.0;
  if (combo >= 2) return 1.5;
  return 1.0;
}

/** Returns question IDs answered in the last `numRuns` completed runs for a user.
 *  Used as a soft-exclude list to reduce cross-run repetition. */
async function getRecentlySeenQuestionIds(userId: string, numRuns = 3): Promise<string[]> {
  const recentRuns = await prisma.run.findMany({
    where: { userId, endedAt: { not: null } },
    orderBy: { endedAt: "desc" },
    take: numRuns,
    select: { id: true },
  });
  if (recentRuns.length === 0) return [];
  const runIds = recentRuns.map((r) => r.id);
  const answers = await prisma.answer.findMany({
    where: { runId: { in: runIds } },
    select: { questionId: true },
    distinct: ["questionId"],
  });
  return answers.map((a) => a.questionId);
}

/** Pick the next question for a battle/elite node.
 *
 *  hardExcludeIds  — questions already seen THIS run (never repeat).
 *  softExcludeIds  — questions seen in recent past runs (avoid if possible).
 *
 *  Cascade:
 *    1. Right difficulty  + avoid hard & soft  (ideal)
 *    2. Any  difficulty   + avoid hard & soft
 *    3. Right difficulty  + avoid hard only     (soft-excluded allowed if pool is thin)
 *    4. Any  difficulty   + avoid hard only     (last resort)
 */
async function getNextQuestion(
  categoryId: string,
  playerDifficulty: number,
  hardExcludeIds: string[],
  softExcludeIds: string[] = [],
): Promise<QuestionRow | null> {
  const min = Math.max(DIFFICULTY_SCORE_MIN, playerDifficulty - PLAYER_DIFFICULTY_WINDOW);
  const max = Math.min(DIFFICULTY_SCORE_MAX, playerDifficulty + PLAYER_DIFFICULTY_WINDOW);

  const excl = (ids: string[]) => (ids.length > 0 ? { notIn: ids } : undefined);
  const allExclude = Array.from(new Set([...hardExcludeIds, ...softExcludeIds]));

  const sel = { id: true, text: true, options: true, correctIndex: true } as const;

  // 1. Ideal: right difficulty + respect both excludes
  let candidates = await prisma.question.findMany({
    where: { categoryId, difficultyScore: { gte: min, lte: max }, id: excl(allExclude) },
    select: sel,
  });

  // 2. Any difficulty + respect both excludes
  if (candidates.length === 0 && allExclude.length > 0) {
    candidates = await prisma.question.findMany({
      where: { categoryId, id: excl(allExclude) },
      select: sel,
    });
  }

  // 3. Right difficulty + hard exclude only (soft-excluded questions now OK)
  if (candidates.length === 0 && softExcludeIds.length > 0) {
    candidates = await prisma.question.findMany({
      where: { categoryId, difficultyScore: { gte: min, lte: max }, id: excl(hardExcludeIds) },
      select: sel,
    });
  }

  // 4. Any difficulty + hard exclude only
  if (candidates.length === 0) {
    candidates = await prisma.question.findMany({
      where: { categoryId, id: excl(hardExcludeIds) },
      select: sel,
    });
  }

  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// ─── Relic / boss helpers ────────────────────────────────────────────────────

function hasRelic(run: any, relicId: string): boolean {
  return ((run.relics as string[]) ?? []).includes(relicId);
}

/** Number of questions for a given node type + wave. Boss nodes get extra. */
function nodeQuestionsPerFloor(nodeType: string | undefined, wave: number): number {
  if (nodeType === "boss") {
    return Math.min(questionsPerFloor(wave) + BOSS_EXTRA_QUESTIONS, 8);
  }
  return questionsPerFloor(wave);
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function startRun(userId: string, enabledSlugs?: string[] | null): Promise<RunMapState | null> {
  const [user, allCategories] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.category.findMany({ select: { id: true, slug: true, name: true }, orderBy: { slug: "asc" } }),
  ]);

  const toUse =
    enabledSlugs != null && enabledSlugs.length > 0
      ? allCategories.filter((c) => enabledSlugs.includes(c.slug))
      : allCategories;
  const pool = toUse.length > 0 ? toUse : allCategories;

  const mapData = generateMap(pool);

  // ── Class bonuses ──────────────────────────────────────────────────────────
  const runClass = user?.selectedClass ?? "regular";

  // Lives: base + upgrade + class bonus
  let livesStart = LIVES_START + (user?.upgExtraLife ? 1 : 0);
  if (runClass === "warrior")   livesStart += 1;
  if (runClass === "berserker") livesStart += 2;

  // Start money (take the highest of upgrade vs. class bonus)
  let startMoney = RUN_MONEY_START;
  if (user?.upgHeadStart) startMoney = Math.max(startMoney, 30);
  if (runClass === "merchant")  startMoney = Math.max(startMoney, 40);

  // Starting difficulty (take the lowest — easier is better for the player)
  let startDiff = PLAYER_DIFFICULTY_START;
  if (user?.upgStartDiff)      startDiff = Math.min(startDiff, 30);
  if (runClass === "scholar")  startDiff = Math.min(startDiff, 35);
  if (runClass === "mystic")   startDiff = Math.min(startDiff, 25);

  // Skip cost (take the lowest)
  let skipCost = SKIP_COST;
  if (user?.upgReducedSkip)  skipCost = Math.min(skipCost, 20);
  if (runClass === "rogue")  skipCost = Math.min(skipCost, 12);

  // Money per correct (take the highest)
  let moneyPC = MONEY_PER_CORRECT;
  if (user?.upgMoneyBonus)    moneyPC = Math.max(moneyPC, 20);
  if (runClass === "scholar") moneyPC = Math.max(moneyPC, 20);

  // Streak for life (take the lowest — smaller streak threshold is better)
  let streakFL = STREAK_FOR_LIFE;
  if (user?.upgLuckyStreak)  streakFL = Math.min(streakFL, 2);
  if (runClass === "mystic") streakFL = Math.min(streakFL, 2);

  const run = await prisma.run.create({
    data: {
      userId,
      runClass,
      livesRemaining: livesStart,
      lowestLives: livesStart,
      runMoney: startMoney,
      currentFloor: 1,
      mapData: mapData as object,
      currentNodeId: null,
      playerDifficulty: startDiff,
      skipCostRun: skipCost,
      moneyPerCorrectRun: moneyPC,
      streakForLifeRun: streakFL,
      diffStepRun: user?.upgResilience ? 3 : PLAYER_DIFFICULTY_STEP,
      shieldCount: user?.upgShield ? 1 : 0,
      secondWindAvailable: user?.upgSecondWind ?? false,
      // Rogue: start with 2 free skips
      freeMulligan: runClass === "rogue" ? 2 : 0,
      // Mystic: start with 50/50 active
      hasFiftyFifty: runClass === "mystic",
      // Berserker: all money doubled via multiplier; wrong answers cost 2 lives
      moneyMultiplier: runClass === "berserker" ? 2.0 : 1.0,
      livesPerWrongAnswer: runClass === "berserker" ? 2 : 1,
    },
  });

  const available = getAvailableNodeIds(mapData);
  return { state: "map", run: toRunState(run), mapData, availableNodeIds: available };
}

export async function getRunEncounter(
  runId: string,
  userId: string
): Promise<RunWithEncounter | RunMapState | RunEventState | RunFloorClearState | RunRelicPickState | WaveCompleteState | "game_over" | null> {
  const run = await prisma.run.findFirst({ where: { id: runId, userId }, include: { answers: true } });
  if (!run || run.endedAt) return "game_over";

  // ── Map-based run ──────────────────────────────────────────────────────────
  if (run.mapData) {
    const mapData = run.mapData as unknown as RunMapData;

    // No active node → player is on the map screen
    if (!run.currentNodeId) {
      const available = getAvailableNodeIds(mapData);
      return { state: "map", run: toRunState(run), mapData, availableNodeIds: available };
    }

    const node = getNodeById(mapData, run.currentNodeId);
    if (!node) return null;

    // Event node: player is mid-event (e.g. page refresh) — re-surface the same event.
    if (node.type === "event") {
      const event = pickEventForNode(node.id, node.themeSlug);
      return { state: "event", run: toRunState(run), mapData, event };
    }

    if (!node.categoryId) return null;

    const floorNum  = nodeToFloorNumber(node);
    const floorIdx  = waveFloorIndex(floorNum, run.wave ?? 1);
    const answersThisFloor = run.answers.filter((a) => a.floorIndex === floorIdx);
    const encounterIndex = answersThisFloor.length;
    const qpf = nodeQuestionsPerFloor(node.type, run.wave ?? 1);

    const category = await prisma.category.findUnique({ where: { id: node.categoryId } });
    if (!category) return null;

    // Node is fully answered but player hasn't returned to map yet (e.g. closed tab mid-shop).
    // Restore them to the correct interstitial screen.
    if (encounterIndex >= qpf) {
      const floorCategory = { name: category.name };
      // Relic offer pending — deterministic choices so refreshing can't reroll options.
      if (run.pendingRelicNodeId) {
        const owned  = (run.relics as string[]) ?? [];
        const seed   = hashString(runId + run.pendingRelicNodeId);
        const choices = pickRelicsDeterministic(3, owned, seed);
        return { state: "relic_pick", run: toRunState(run), choices, mapData, floorCategory };
      }
      return { state: "floor_clear", run: toRunState(run), mapData, floorCategory };
    }

    // Hard exclude: every question seen in this run (prevents any in-run repeat).
    // Soft exclude: questions from recent past runs (reduces cross-run repetition).
    const hardExcludeIds = run.answers.map((a) => a.questionId);
    const softExcludeIds = await getRecentlySeenQuestionIds(run.userId, 3);
    const q = await getNextQuestion(node.categoryId, run.playerDifficulty, hardExcludeIds, softExcludeIds);
    if (!q) return null;

    const options = Array.isArray(q.options) ? (q.options as string[]) : [];
    let eliminatedIndices: number[] | undefined;
    if (run.hasFiftyFifty || run.hasHint) {
      const count = run.hasFiftyFifty ? 2 : 1;
      eliminatedIndices = computeEliminatedIndices(q.correctIndex, options.length, count, hashString(q.id + runId));
    }

    // Attach boss definition on the first question of a boss node (triggers intro card in UI).
    const boss =
      node.type === "boss" && encounterIndex === 0
        ? (() => { const b = getBossForCategory(category.slug); return { name: b.name, title: b.title, dialogue: b.dialogue, icon: b.icon }; })()
        : undefined;

    return {
      run: toRunState(run),
      floorCategory: { id: category.id, slug: category.slug, name: category.name },
      monsterTitle: getMonsterTitle(category.slug, run.id, floorNum, encounterIndex),
      encounterIndex,
      totalEncountersThisFloor: qpf,
      question: { id: q.id, text: q.text, options, eliminatedIndices },
      floorCategoryOrder: [],
      boss,
    };
  }

  // ── Legacy linear run (no map) ─────────────────────────────────────────────
  const order = (run.floorCategoryOrder as string[] | null) ?? [];
  const categoryId = order[run.currentFloor - 1];
  if (!categoryId) return null;

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) return null;

  const answersThisFloor = run.answers.filter((a) => a.floorIndex === run.currentFloor);
  const encounterIndex = answersThisFloor.length;
  if (encounterIndex >= QUESTIONS_PER_FLOOR) return null;

  const hardExcludeIds = run.answers.map((a) => a.questionId);
  const softExcludeIds = await getRecentlySeenQuestionIds(run.userId, 3);
  const q = await getNextQuestion(categoryId, run.playerDifficulty, hardExcludeIds, softExcludeIds);
  if (!q) return null;

  const options = Array.isArray(q.options) ? (q.options as string[]) : [];
  let eliminatedIndices: number[] | undefined;
  if (run.hasFiftyFifty || run.hasHint) {
    const count = run.hasFiftyFifty ? 2 : 1;
    eliminatedIndices = computeEliminatedIndices(q.correctIndex, options.length, count, hashString(q.id + runId));
  }

  return {
    run: toRunState(run),
    floorCategory: { id: category.id, slug: category.slug, name: category.name },
    monsterTitle: getMonsterTitle(category.slug, run.id, run.currentFloor, encounterIndex),
    encounterIndex,
    totalEncountersThisFloor: QUESTIONS_PER_FLOOR,
    question: { id: q.id, text: q.text, options, eliminatedIndices },
    floorCategoryOrder: order,
  };
}

export async function getQuestionsForFloor(runId: string, userId: string): Promise<{ id: string; text: string; options: string[] }[] | null> {
  const run = await prisma.run.findFirst({ where: { id: runId, userId }, include: { answers: true } });
  if (!run || run.endedAt) return null;

  const order = (run.floorCategoryOrder as string[] | null) ?? [];
  const categoryId = order[run.currentFloor - 1];
  if (!categoryId) return null;

  const floorAnsweredIds = run.answers.filter((a) => a.floorIndex === run.currentFloor).map((a) => a.questionId);
  const remaining = QUESTIONS_PER_FLOOR - floorAnsweredIds.length;
  if (remaining <= 0) return [];

  const questions: { id: string; text: string; options: string[] }[] = [];
  // Hard-exclude all questions seen anywhere in this run to avoid repeats.
  const seen = new Set(run.answers.map((a) => a.questionId));
  for (let i = 0; i < remaining; i++) {
    const q = await getNextQuestion(categoryId, run.playerDifficulty, Array.from(seen));
    if (!q) break;
    seen.add(q.id);
    questions.push({ id: q.id, text: q.text, options: Array.isArray(q.options) ? (q.options as string[]) : [] });
  }
  return questions;
}

export async function getCurrentEncounterIndex(runId: string, userId: string): Promise<{ floor: number; encounterIndex: number } | null> {
  const run = await prisma.run.findFirst({ where: { id: runId, userId }, include: { answers: true } });
  if (!run || run.endedAt) return null;
  const answersThisFloor = run.answers.filter((a) => a.floorIndex === run.currentFloor);
  return { floor: run.currentFloor, encounterIndex: answersThisFloor.length };
}

export async function recordAnswer(
  runId: string,
  userId: string,
  questionId: string,
  selectedIndex: number
): Promise<{ correct: boolean; livesRemaining: number; runMoney: number; next: "encounter" | "floor_clear" | "run_complete" | "game_over"; run?: RunWithEncounter; relicChoices?: RelicDef[]; newAchievements?: string[]; correctIndex?: number; explanation?: string | null }> {
  const run = await prisma.run.findFirst({ where: { id: runId, userId }, include: { answers: true } });
  if (!run || run.endedAt) return { correct: false, livesRemaining: 0, runMoney: 0, next: "game_over" };

  // Determine the active category and floor number (map-based vs legacy)
  const mapData = run.mapData ? (run.mapData as unknown as RunMapData) : null;
  const activeNode: MapNode | null = mapData && run.currentNodeId
    ? (getNodeById(mapData, run.currentNodeId) ?? null)
    : null;
  const activeCategoryId = activeNode?.categoryId ?? (run.floorCategoryOrder as string[])[run.currentFloor - 1];
  const activeFloor = activeNode ? nodeToFloorNumber(activeNode) : run.currentFloor;
  const activeFloorIdx  = waveFloorIndex(activeFloor, run.wave ?? 1);

  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question || question.categoryId !== activeCategoryId) {
    return { correct: false, livesRemaining: run.livesRemaining, runMoney: run.runMoney, next: "encounter" };
  }

  const correct = question.correctIndex === selectedIndex;
  // Included in every response so the UI can reveal the correct answer and show an explanation.
  // Filter out placeholder strings left by the question-generation pipeline.
  const PLACEHOLDER_CITATIONS = new Set(["NEEDS_WEB_SEARCH", "Mathematical derivation"]);
  const rawCitation = question.citation;
  const explanation =
    rawCitation && !PLACEHOLDER_CITATIONS.has(rawCitation) ? rawCitation : null;
  const answerInfo = { correctIndex: question.correctIndex, explanation };

  const answersThisFloor = run.answers.filter((a) => a.floorIndex === activeFloorIdx);
  const encounterIndex = answersThisFloor.length;

  let livesRemaining = run.livesRemaining;
  let runMoney = run.runMoney;
  let playerDifficulty = run.playerDifficulty;
  let shieldCount = run.shieldCount ?? 0;
  let freezeCount = run.freezeCount ?? 0;
  const moneyMultiplier = run.moneyMultiplier ?? 1.0;
  let secondWindAvailable = run.secondWindAvailable ?? false;
  const streakThreshold = hasRelic(run, "vampires-fang") ? 2 : (run.streakForLifeRun ?? STREAK_FOR_LIFE);
  const diffStep = run.diffStepRun ?? PLAYER_DIFFICULTY_STEP;
  const moneyPerCorrect = run.moneyPerCorrectRun ?? MONEY_PER_CORRECT;
  const maxLives = hasRelic(run, "relentless-spirit") || hasRelic(run, "cats-paw") ? 8 : 6; // cats-paw grant tracked separately
  // Berserker class: wrong answers cost 2 lives; shield still fully absorbs one hit
  const livesPerWrong = run.livesPerWrongAnswer ?? 1;

  // Combo: increment on correct, reset on wrong
  const newComboCount = correct ? (run.comboCount ?? 0) + 1 : 0;

  if (correct) {
    let earned = Math.round(moneyPerCorrect * moneyMultiplier);
    // Relic: Double-Edged Sword — 2× all money
    if (hasRelic(run, "double-edged-sword")) earned *= 2;
    // Relic: Golden Fleece — 2× money on boss floors
    if (hasRelic(run, "golden-fleece") && activeNode?.type === "boss") earned *= 2;
    // Relic: Lucky Coin — 25% chance to double
    if (hasRelic(run, "lucky-coin") && Math.random() < 0.25) earned *= 2;
    // Relic: Scholar's Tome — +$8 flat
    if (hasRelic(run, "scholars-tome")) earned += 8;
    // Combo multiplier — applied last, stacks on top of all other bonuses
    const cMult = comboMultiplier(newComboCount);
    if (cMult > 1) earned = Math.floor(earned * cMult);
    runMoney += earned;

    const recentAnswers = run.answers.slice(-(streakThreshold - 1));
    const onStreak = recentAnswers.length >= streakThreshold - 1 && recentAnswers.every((a) => a.correct && !a.skipped);
    if (onStreak) livesRemaining = Math.min(livesRemaining + 1, maxLives);
    playerDifficulty = Math.max(DIFFICULTY_SCORE_MIN, playerDifficulty - PLAYER_DIFFICULTY_STEP);
  } else {
    if (shieldCount > 0) {
      shieldCount -= 1; // shield absorbs all damage regardless of livesPerWrong
    } else {
      livesRemaining -= livesPerWrong;
    }
    // Relic: Adrenaline Rush — wrong answers don't raise difficulty
    if (!hasRelic(run, "adrenaline-rush")) {
      if (freezeCount > 0) {
        freezeCount -= 1;
      } else {
        playerDifficulty = Math.min(DIFFICULTY_SCORE_MAX, playerDifficulty + diffStep);
      }
    } else if (freezeCount > 0) {
      freezeCount -= 1; // still consume freeze charges
    }
    // Relic: Philosopher's Stone — earn $7 even on wrong answers
    if (hasRelic(run, "philosophers-stone")) runMoney += 7;
    // Relic: Double-Edged Sword — wrong answers cost $10
    if (hasRelic(run, "double-edged-sword")) runMoney = Math.max(0, runMoney - 10);
  }

  // Relic: Hardened Mind — difficulty cap at 70
  if (hasRelic(run, "hardened-mind")) playerDifficulty = Math.min(playerDifficulty, 70);

  // Track the lowest lives reached this run (used by survivor / comeback-kid achievements)
  const newLowestLives = Math.min(livesRemaining, run.lowestLives ?? run.livesRemaining);

  await prisma.answer.create({
    data: { runId, questionId, correct, skipped: false, floorIndex: activeFloorIdx, encounterIndex },
  });

  // Adjust question's global difficulty score.
  const newQuestionDifficulty = correct
    ? Math.max(DIFFICULTY_SCORE_MIN, (question.difficultyScore ?? 50) - DIFFICULTY_STEP)
    : Math.min(DIFFICULTY_SCORE_MAX, (question.difficultyScore ?? 50) + DIFFICULTY_STEP);
  await prisma.question.update({ where: { id: questionId }, data: { difficultyScore: newQuestionDifficulty } });

  // Second Wind / Cat's Paw: revive before checking game_over.
  if (livesRemaining <= 0 && secondWindAvailable) {
    livesRemaining = 1;
    secondWindAvailable = false;
  }

  if (livesRemaining <= 0) {
    await endRun(runId, userId);
    const gameOverAchs = await checkAndGrantAchievements(run.userId, {
      event: "run_end",
      score: run.score + (correct ? 1 : 0),
      livesRemaining: 0,
      lowestLives: Math.min(0, newLowestLives),
      won: false,
      wrongAnswers: [...run.answers, { correct, skipped: false }].filter((a) => !a.correct && !a.skipped).length,
      skippedAnswers: run.answers.filter((a) => a.skipped).length,
    });
    return { correct, livesRemaining: 0, runMoney, next: "game_over", newAchievements: gameOverAchs, ...answerInfo };
  }

  // Determine if this is the last question of the node (for floor_clear routing + relic offers)
  const qpf = nodeQuestionsPerFloor(activeNode?.type, run.wave ?? 1);
  const isFloorClear = encounterIndex + 1 >= qpf;
  const isRelicNode = activeNode?.type === "boss" || activeNode?.type === "elite";
  const shouldOfferRelic = isFloorClear && isRelicNode;

  await prisma.run.update({
    where: { id: runId },
    data: {
      livesRemaining,
      runMoney,
      score: run.score + (correct ? 1 : 0),
      playerDifficulty,
      shieldCount,
      freezeCount,
      moneyMultiplier: correct && moneyMultiplier > 1 ? 1.0 : moneyMultiplier,
      hasFiftyFifty: false,
      hasHint: false,
      secondWindAvailable,
      comboCount: newComboCount,
      lowestLives: newLowestLives,
      ...(shouldOfferRelic ? { pendingRelicNodeId: run.currentNodeId } : {}),
    },
  });

  // ── Achievement checks ──────────────────────────────────────────────────────
  const newScore = run.score + (correct ? 1 : 0);
  const answerAchs = await checkAndGrantAchievements(run.userId, {
    event: "answer",
    score: newScore,
    comboCount: newComboCount,
    runMoney,
    livesRemaining,
  });

  if (isFloorClear) {
    if (mapData) {
      const relicChoices = shouldOfferRelic
        ? pickRandomRelics(3, (run.relics as string[]) ?? [])
        : undefined;
      return { correct, livesRemaining, runMoney, next: "floor_clear", relicChoices, newAchievements: answerAchs, ...answerInfo };
    }
    // Legacy linear
    const order = (run.floorCategoryOrder as string[]) ?? [];
    if (run.currentFloor >= order.length) {
      await completeRun(runId, userId);
      const allAnswers = [...run.answers, { correct, skipped: false }];
      const endAchs = await checkAndGrantAchievements(run.userId, {
        event: "run_end",
        score: newScore,
        livesRemaining,
        lowestLives: newLowestLives,
        won: true,
        wrongAnswers: allAnswers.filter((a) => !a.correct && !a.skipped).length,
        skippedAnswers: allAnswers.filter((a) => a.skipped).length,
      });
      return { correct, livesRemaining, runMoney, next: "run_complete", newAchievements: [...answerAchs, ...endAchs], ...answerInfo };
    }
    return { correct, livesRemaining, runMoney, next: "floor_clear", newAchievements: answerAchs, ...answerInfo };
  }

  const nextEncounter = await getRunEncounter(runId, userId);
  return {
    correct,
    livesRemaining,
    runMoney,
    next: "encounter",
    run: nextEncounter && nextEncounter !== "game_over" && "question" in nextEncounter ? nextEncounter : undefined,
    newAchievements: answerAchs,
    ...answerInfo,
  };
}

export async function recordSkip(
  runId: string,
  userId: string,
  questionId: string
): Promise<{ ok: boolean; next: "encounter" | "floor_clear" | "run_complete" | "game_over"; run?: RunWithEncounter; relicChoices?: RelicDef[]; newAchievements?: string[] }> {
  const run = await prisma.run.findFirst({ where: { id: runId, userId }, include: { answers: true } });
  if (!run || run.endedAt) return { ok: false, next: "game_over" };

  const hasMulligan = (run.freeMulligan ?? 0) > 0;
  const skipCost = run.skipCostRun ?? SKIP_COST;
  if (!hasMulligan && run.runMoney < skipCost) return { ok: false, next: "encounter" };

  const skipMapData = run.mapData ? (run.mapData as unknown as RunMapData) : null;
  const skipNode: MapNode | null = skipMapData && run.currentNodeId
    ? (getNodeById(skipMapData, run.currentNodeId) ?? null)
    : null;
  const skipCategoryId = skipNode?.categoryId ?? (run.floorCategoryOrder as string[])[run.currentFloor - 1];
  const skipFloor    = skipNode ? nodeToFloorNumber(skipNode) : run.currentFloor;
  const skipFloorIdx = waveFloorIndex(skipFloor, run.wave ?? 1);

  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question || question.categoryId !== skipCategoryId) return { ok: false, next: "encounter" };

  const answersThisFloor = run.answers.filter((a) => a.floorIndex === skipFloorIdx);
  const encounterIndex = answersThisFloor.length;

  await prisma.answer.create({
    data: { runId, questionId, correct: false, skipped: true, floorIndex: skipFloorIdx, encounterIndex },
  });

  const qpf = nodeQuestionsPerFloor(skipNode?.type, run.wave ?? 1);
  const isFloorClear = encounterIndex + 1 >= qpf;
  const isRelicNode = skipNode?.type === "boss" || skipNode?.type === "elite";
  const shouldOfferRelic = isFloorClear && isRelicNode;

  await prisma.run.update({
    where: { id: runId },
    data: {
      runMoney: hasMulligan ? run.runMoney : run.runMoney - skipCost,
      freeMulligan: hasMulligan ? (run.freeMulligan ?? 0) - 1 : (run.freeMulligan ?? 0),
      hasFiftyFifty: false,
      hasHint: false,
      // Rogue class: skipping doesn't break the combo streak
      comboCount: run.runClass === "rogue" ? (run.comboCount ?? 0) : 0,
      ...(shouldOfferRelic ? { pendingRelicNodeId: run.currentNodeId } : {}),
    },
  });

  if (isFloorClear) {
    if (skipMapData) {
      const relicChoices = shouldOfferRelic
        ? pickRandomRelics(3, (run.relics as string[]) ?? [])
        : undefined;
      return { ok: true, next: "floor_clear", relicChoices };
    }
    const catOrder = (run.floorCategoryOrder as string[]) ?? [];
    if (run.currentFloor >= catOrder.length) {
      await completeRun(runId, userId);
      // Legacy run complete via skip — check run_end achievements
      const endAchs = await checkAndGrantAchievements(run.userId, {
        event: "run_end",
        score: run.score,
        livesRemaining: run.livesRemaining,
        lowestLives: run.lowestLives ?? run.livesRemaining,
        won: true,
        wrongAnswers: [...run.answers, { correct: false, skipped: true }].filter((a) => !a.correct && !a.skipped).length,
        skippedAnswers: run.answers.filter((a) => a.skipped).length + 1,
      });
      return { ok: true, next: "run_complete", newAchievements: endAchs };
    }
    return { ok: true, next: "floor_clear" };
  }

  const nextEncounter = await getRunEncounter(runId, userId);
  return {
    ok: true,
    next: "encounter",
    run: nextEncounter && nextEncounter !== "game_over" && "question" in nextEncounter ? nextEncounter : undefined,
  };
}

export async function purchaseShopItem(
  runId: string,
  userId: string,
  item: ShopItem
): Promise<{ ok: boolean; error?: string; run?: RunState; nextFloorCategory?: string }> {
  const run = await prisma.run.findFirst({ where: { id: runId, userId } });
  if (!run || run.endedAt) return { ok: false, error: "Run not found" };

  const baseCost = SHOP_PRICES[item];
  // Relic: Bargain Hunter — shop items 20% cheaper
  // Class: Merchant — also gets 20% off (same discount, doesn't stack doubly)
  const hasDiscount = hasRelic(run, "bargain-hunter") || run.runClass === "merchant";
  const cost = hasDiscount ? Math.floor(baseCost * 0.8) : baseCost;
  if (run.runMoney < cost) return { ok: false, error: "Not enough run money" };

  if (item === "fifty_fifty" && run.hasFiftyFifty) return { ok: false, error: "Already active" };
  if (item === "hint" && run.hasHint) return { ok: false, error: "Already active" };
  if (item === "double_down" && (run.moneyMultiplier ?? 1) > 1) return { ok: false, error: "Already active" };

  const order = [...((run.floorCategoryOrder as string[] | null) ?? [])];
  const nextFloorIdx = run.currentFloor; // 1-indexed floor means this is the 0-indexed next position

  const updateData: {
    runMoney: number;
    livesRemaining?: number;
    playerDifficulty?: number;
    shieldCount?: number;
    freezeCount?: number;
    moneyMultiplier?: number;
    hasFiftyFifty?: boolean;
    hasHint?: boolean;
    freeMulligan?: number;
    floorCategoryOrder?: string[];
  } = { runMoney: run.runMoney - cost };

  let nextFloorCategory: string | undefined;

  switch (item) {
    case "extra_life":
      updateData.livesRemaining = Math.min(run.livesRemaining + 1, 6);
      break;
    case "second_chance":
      updateData.shieldCount = (run.shieldCount ?? 0) + 1;
      break;
    case "fifty_fifty":
      updateData.hasFiftyFifty = true;
      break;
    case "hint":
      updateData.hasHint = true;
      break;
    case "freeze_difficulty":
      updateData.freezeCount = (run.freezeCount ?? 0) + 3;
      break;
    case "double_down":
      updateData.moneyMultiplier = 2.0;
      break;
    case "difficulty_reset":
      updateData.playerDifficulty = PLAYER_DIFFICULTY_START;
      break;
    case "category_swap": {
      if (nextFloorIdx < order.length) {
        const allCats = await prisma.category.findMany({ select: { id: true } });
        const currentId = order[nextFloorIdx];
        const candidates = allCats.map((c) => c.id).filter((id) => id !== currentId);
        if (candidates.length > 0) {
          order[nextFloorIdx] = candidates[Math.floor(Math.random() * candidates.length)];
          updateData.floorCategoryOrder = order;
        }
      }
      break;
    }
    case "category_lock": {
      if (nextFloorIdx > 0 && nextFloorIdx < order.length) {
        order[nextFloorIdx] = order[nextFloorIdx - 1];
        updateData.floorCategoryOrder = order;
      }
      break;
    }
    case "mulligan":
      updateData.freeMulligan = (run.freeMulligan ?? 0) + 1;
      break;
    case "floor_peek": {
      if (nextFloorIdx < order.length) {
        const cat = await prisma.category.findUnique({ where: { id: order[nextFloorIdx] } });
        nextFloorCategory = cat?.name;
      }
      break;
    }
  }

  const updated = await prisma.run.update({ where: { id: runId }, data: updateData });
  return { ok: true, run: toRunState(updated), nextFloorCategory };
}

/** Enter a map node. Sets currentNodeId and returns appropriate state. */
export async function enterNode(
  runId: string,
  userId: string,
  nodeId: string
): Promise<EnterNodeResult | "game_over" | null> {
  const run = await prisma.run.findFirst({ where: { id: runId, userId }, include: { answers: true } });
  if (!run || run.endedAt) return "game_over";
  if (!run.mapData) return null;

  const mapData = run.mapData as unknown as RunMapData;
  const available = getAvailableNodeIds(mapData);
  if (!available.includes(nodeId)) return null;

  const node = getNodeById(mapData, nodeId);
  if (!node) return null;

  const floorNum = nodeToFloorNumber(node);

  // Rest node: instantly complete — no questions, just +1 life
  if (node.type === "rest") {
    const newLives = Math.min(run.livesRemaining + 1, 6);
    const newMapData: RunMapData = {
      ...mapData,
      completedNodeIds: [...mapData.completedNodeIds, nodeId],
    };
    const updated = await prisma.run.update({
      where: { id: runId },
      data: {
        livesRemaining: newLives,
        currentFloor: floorNum,
        mapData: newMapData as object,
        currentNodeId: null,
      },
    });
    if (isMapComplete(newMapData)) {
      return { state: "wave_complete", run: toRunState(updated) };
    }
    const newAvailable = getAvailableNodeIds(newMapData);
    return { state: "rest", run: toRunState(updated), mapData: newMapData, availableNodeIds: newAvailable };
  }

  // Shop node: set as active node, return free_shop state
  if (node.type === "shop") {
    const updated = await prisma.run.update({
      where: { id: runId },
      data: { currentNodeId: nodeId, currentFloor: floorNum },
    });
    return {
      state: "free_shop",
      run: toRunState(updated),
      mapData,
      availableNodeIds: available,
    };
  }

  // Event node: set as active node, pick themed event, return event state
  if (node.type === "event") {
    const updated = await prisma.run.update({
      where: { id: runId },
      data: { currentNodeId: nodeId, currentFloor: floorNum },
    });
    const event = pickEventForNode(nodeId, node.themeSlug);
    return { state: "event", run: toRunState(updated), mapData, event };
  }

  // Battle / elite / boss: set as active node, return first encounter.
  // Relic: Iron Shield — automatically grant +1 shield on entry.
  // Class: Warrior — also grants +1 shield on every battle entry.
  const runRelics = (run.relics as string[]) ?? [];
  const shieldOnEntry = runRelics.includes("iron-shield") || run.runClass === "warrior";
  await prisma.run.update({
    where: { id: runId },
    data: {
      currentNodeId: nodeId,
      currentFloor: floorNum,
      pendingRelicNodeId: null,
      ...(shieldOnEntry ? { shieldCount: { increment: 1 } } : {}),
    },
  });

  const encounter = await getRunEncounter(runId, userId);
  if (!encounter || encounter === "game_over" || !("question" in encounter)) return null;
  return { state: "encounter", encounter };
}

/** Complete the current node (after battle rest-stop or leaving a free shop).
 *  Clears currentNodeId and returns map state, or wave_complete if the whole map is done. */
export async function completeCurrentNode(
  runId: string,
  userId: string
): Promise<RunMapState | WaveCompleteState | null> {
  const run = await prisma.run.findFirst({ where: { id: runId, userId } });
  if (!run || run.endedAt) return null;
  if (!run.mapData || !run.currentNodeId) return null;

  const mapData = run.mapData as unknown as RunMapData;
  const nodeId = run.currentNodeId;

  const newMapData: RunMapData = {
    ...mapData,
    completedNodeIds: [...mapData.completedNodeIds, nodeId],
  };

  const updated = await prisma.run.update({
    where: { id: runId },
    data: { mapData: newMapData as object, currentNodeId: null },
  });

  if (isMapComplete(newMapData)) {
    return { state: "wave_complete", run: toRunState(updated) };
  }

  const available = getAvailableNodeIds(newMapData);
  return { state: "map", run: toRunState(updated), mapData: newMapData, availableNodeIds: available };
}

/** Legacy: advance to the next floor linearly (kept for old runs without mapData). */
export async function startNextFloor(runId: string, userId: string): Promise<RunWithEncounter | RunMapState | WaveCompleteState | "run_complete" | null> {
  const run = await prisma.run.findFirst({ where: { id: runId, userId } });
  if (!run || run.endedAt) return null;

  // Map-based run: delegate to completeCurrentNode
  if (run.mapData) {
    return completeCurrentNode(runId, userId);
  }

  // Legacy linear
  const order = (run.floorCategoryOrder as string[]) ?? [];
  const nextFloor = run.currentFloor + 1;
  if (nextFloor > order.length) {
    await completeRun(runId, userId);
    return "run_complete";
  }

  await prisma.run.update({ where: { id: runId }, data: { currentFloor: nextFloor } });
  const enc = await getRunEncounter(runId, userId);
  if (!enc || enc === "game_over" || !("question" in enc)) return null;
  return enc;
}

/** Resolve a player's choice in an event room. */
export async function resolveEventChoice(
  runId: string,
  userId: string,
  eventId: string,
  choiceId: string
): Promise<{ message: string; mapState: RunMapState | WaveCompleteState } | "game_over" | null> {
  const run = await prisma.run.findFirst({ where: { id: runId, userId } });
  if (!run || run.endedAt) return "game_over";
  if (!run.mapData || !run.currentNodeId) return null;

  const mapData = run.mapData as unknown as RunMapData;
  const node = getNodeById(mapData, run.currentNodeId);
  if (!node || node.type !== "event") return null;

  // Validate that the submitted eventId matches the node's actual event (anti-cheat)
  const expectedEvent = pickEventForNode(node.id, node.themeSlug);
  if (expectedEvent.id !== eventId) return null;

  const event = getEventById(eventId);
  if (!event) return null;

  const choice = getChoiceById(event, choiceId);
  if (!choice) return null;

  // Validate requirements
  const cost = choice.cost ?? 0;
  if (run.runMoney < cost) return null;
  if (choice.requireMinLives !== undefined && run.livesRemaining < choice.requireMinLives) return null;

  // Resolve the effect
  const fallback = choice.outcomeMessage ?? "You continue on your way.";
  const outcome = resolveEffect(choice.effect, fallback);

  // Compute new stats
  const newMoney = Math.max(0, run.runMoney - cost + outcome.moneyDelta);
  const newLives = Math.min(6, Math.max(0, run.livesRemaining + outcome.livesDelta));

  if (newLives <= 0) {
    await endRun(runId, userId);
    return "game_over";
  }

  const newDifficulty =
    outcome.difficultySet !== null
      ? outcome.difficultySet
      : Math.min(100, Math.max(1, run.playerDifficulty + outcome.difficultyDelta));

  // Mark node complete
  const newMapData: RunMapData = {
    ...mapData,
    completedNodeIds: [...mapData.completedNodeIds, run.currentNodeId],
  };

  if (isMapComplete(newMapData)) {
    // Persist stat changes and mark node complete — wave_complete instead of ending the run
    const updated = await prisma.run.update({
      where: { id: runId },
      data: {
        runMoney: newMoney,
        livesRemaining: newLives,
        playerDifficulty: newDifficulty,
        shieldCount:      (run.shieldCount ?? 0) + outcome.shieldAdd,
        freezeCount:      (run.freezeCount ?? 0) + outcome.freezeAdd,
        freeMulligan:     (run.freeMulligan ?? 0) + outcome.mulliganAdd,
        hasFiftyFifty:    run.hasFiftyFifty || outcome.grantFiftyFifty,
        hasHint:          run.hasHint || outcome.grantHint,
        mapData:          newMapData as object,
        currentNodeId:    null,
      },
    });
    return { message: outcome.message, mapState: { state: "wave_complete", run: toRunState(updated) } };
  }

  const updated = await prisma.run.update({
    where: { id: runId },
    data: {
      runMoney: newMoney,
      livesRemaining: newLives,
      playerDifficulty: newDifficulty,
      shieldCount:      (run.shieldCount ?? 0) + outcome.shieldAdd,
      freezeCount:      (run.freezeCount ?? 0) + outcome.freezeAdd,
      freeMulligan:     (run.freeMulligan ?? 0) + outcome.mulliganAdd,
      hasFiftyFifty:    run.hasFiftyFifty || outcome.grantFiftyFifty,
      hasHint:          run.hasHint || outcome.grantHint,
      mapData:          newMapData as object,
      currentNodeId:    null,
    },
  });

  const available = getAvailableNodeIds(newMapData);
  return {
    message: outcome.message,
    mapState: { state: "map", run: toRunState(updated), mapData: newMapData, availableNodeIds: available },
  };
}

export async function completeRun(runId: string, userId: string): Promise<void> {
  const run = await prisma.run.findFirst({ where: { id: runId, userId } });
  if (!run || run.endedAt) return;

  const { COLLECTION_CONVERSION_RATE } = await import("./constants");
  const toAdd = Math.floor(run.runMoney * COLLECTION_CONVERSION_RATE);

  await prisma.run.update({ where: { id: runId }, data: { endedAt: new Date(), won: true } });
  if (toAdd > 0) {
    await prisma.user.update({ where: { id: userId }, data: { collectionMoney: { increment: toAdd } } });
  }
}

export async function endRun(runId: string, userId: string): Promise<void> {
  const run = await prisma.run.findFirst({ where: { id: runId, userId } });
  if (!run || run.endedAt) return;

  const { COLLECTION_CONVERSION_RATE } = await import("./constants");
  const toAdd = Math.floor(run.runMoney * COLLECTION_CONVERSION_RATE);

  await prisma.run.update({ where: { id: runId }, data: { endedAt: new Date(), livesRemaining: 0 } });
  if (toAdd > 0) {
    await prisma.user.update({ where: { id: userId }, data: { collectionMoney: { increment: toAdd } } });
  }
}

/** Advance to the next wave: bigger map, harder starting difficulty, keep all run stats. */
export async function advanceWave(runId: string, userId: string): Promise<(RunMapState & { newAchievements: string[] }) | null> {
  const run = await prisma.run.findFirst({ where: { id: runId, userId } });
  if (!run || run.endedAt) return null;

  const allCategories = await prisma.category.findMany({
    select: { id: true, slug: true, name: true },
    orderBy: { slug: "asc" },
  });
  const newWave = (run.wave ?? 1) + 1;
  const mapData = generateMap(allCategories, newWave);

  // Relic: Relentless Spirit — gain +1 life on wave progression
  const bonusLife = ((run.relics as string[]) ?? []).includes("relentless-spirit") ? 1 : 0;

  const updated = await prisma.run.update({
    where: { id: runId },
    data: {
      wave: newWave,
      mapData: mapData as object,
      currentNodeId: null,
      playerDifficulty: waveStartDifficulty(newWave),
      currentFloor: 1,
      pendingRelicNodeId: null,
      ...(bonusLife > 0 ? { livesRemaining: Math.min(run.livesRemaining + bonusLife, 8) } : {}),
    },
  });

  const available = getAvailableNodeIds(mapData);
  const waveAchs = await checkAndGrantAchievements(run.userId, { event: "wave_advance", wave: newWave });
  return { state: "map", run: toRunState(updated), mapData, availableNodeIds: available, newAchievements: waveAchs };
}

/** Claim a relic from the pending offer after clearing a boss or elite node. */
export async function pickRelic(
  runId: string,
  userId: string,
  relicId: string,
): Promise<{ ok: boolean; error?: string; run?: RunState; newAchievements?: string[] }> {
  const run = await prisma.run.findFirst({ where: { id: runId, userId } });
  if (!run || run.endedAt) return { ok: false, error: "Run not found" };

  // Validate: must have a pending relic offer for the current node
  if (!run.pendingRelicNodeId) return { ok: false, error: "No relic offer pending" };

  // Validate: relicId is a real relic
  const relic = getRelicById(relicId);
  if (!relic) return { ok: false, error: "Unknown relic" };

  // Validate: player doesn't already own it
  const owned = (run.relics as string[]) ?? [];
  if (owned.includes(relicId)) return { ok: false, error: "Already owned" };

  const newRelics = [...owned, relicId];

  // Special: Cat's Paw grants the Second Wind effect
  const grantSecondWind = relicId === "cats-paw" && !run.secondWindAvailable;

  const updated = await prisma.run.update({
    where: { id: runId },
    data: {
      relics: newRelics,
      pendingRelicNodeId: null,
      ...(grantSecondWind ? { secondWindAvailable: true } : {}),
    },
  });

  const relicAchs = await checkAndGrantAchievements(run.userId, {
    event: "relic_pick",
    relicsCount: newRelics.length,
  });
  return { ok: true, run: toRunState(updated), newAchievements: relicAchs };
}

/** Cash out at end of wave: award 100% of run money to collection, end the run. */
export async function cashOut(runId: string, userId: string): Promise<{ ok: boolean; collectionMoneyEarned: number; newAchievements: string[] }> {
  const run = await prisma.run.findFirst({ where: { id: runId, userId }, include: { answers: true } });
  if (!run || run.endedAt) return { ok: false, collectionMoneyEarned: 0, newAchievements: [] };

  const toAdd = run.runMoney; // 100% conversion — the reward for completing a wave
  await prisma.run.update({ where: { id: runId }, data: { endedAt: new Date(), won: true } });
  if (toAdd > 0) {
    await prisma.user.update({ where: { id: userId }, data: { collectionMoney: { increment: toAdd } } });
  }

  const wrongAnswers  = run.answers.filter((a) => !a.correct && !a.skipped).length;
  const skippedAnswers = run.answers.filter((a) => a.skipped).length;
  const newAchievements = await checkAndGrantAchievements(run.userId, {
    event: "run_end",
    score: run.score,
    livesRemaining: run.livesRemaining,
    lowestLives: run.lowestLives ?? run.livesRemaining,
    won: true,
    wrongAnswers,
    skippedAnswers,
  });

  return { ok: true, collectionMoneyEarned: toAdd, newAchievements };
}
