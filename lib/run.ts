import { prisma } from "@/lib/db";
import { getMonsterTitle } from "@/lib/monsterList";
import {
  LIVES_START,
  RUN_MONEY_START,
  QUESTIONS_PER_FLOOR,
  MONEY_PER_CORRECT,
  STREAK_FOR_LIFE,
  DIFFICULTY_SCORE_MIN,
  DIFFICULTY_SCORE_MAX,
  DIFFICULTY_STEP,
  DIFFICULTY_TIER_EASY_MAX,
  DIFFICULTY_TIER_MEDIUM_MIN,
  DIFFICULTY_TIER_MEDIUM_MAX,
  DIFFICULTY_TIER_HARD_MIN,
} from "./constants";

/** Deterministic seeded RNG so the same run+floor always gets the same question order. */
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

/** Shuffle array in place with a seeded RNG (Fisher–Yates). */
function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
  const rng = seededRandom(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

type QuestionRow = { id: string; text: string; options: unknown };

/** Difficulty tier for a floor: floor 1 = easy, 2 = medium, 3+ = hard. */
function getDifficultyRangeForFloor(floorIndex: number): { min: number; max: number } {
  if (floorIndex <= 1) {
    return { min: DIFFICULTY_SCORE_MIN, max: DIFFICULTY_TIER_EASY_MAX };
  }
  if (floorIndex === 2) {
    return { min: DIFFICULTY_TIER_MEDIUM_MIN, max: DIFFICULTY_TIER_MEDIUM_MAX };
  }
  return { min: DIFFICULTY_TIER_HARD_MIN, max: DIFFICULTY_SCORE_MAX };
}

/** Fetch questions for a floor in a deterministic random order (same runId + floorIndex = same order). Uses difficulty tiering: early floors get easier questions, later floors get harder. */
async function getQuestionsForFloorInOrder(
  categoryId: string,
  runId: string,
  floorIndex: number
): Promise<QuestionRow[]> {
  const { min, max } = getDifficultyRangeForFloor(floorIndex);
  let all = await prisma.question.findMany({
    where: { categoryId, difficultyScore: { gte: min, lte: max } },
    select: { id: true, text: true, options: true },
  });
  if (all.length < QUESTIONS_PER_FLOOR) {
    all = await prisma.question.findMany({
      where: { categoryId },
      select: { id: true, text: true, options: true },
    });
  }
  const seed = hashString(runId) + floorIndex * 31;
  const shuffled = shuffleWithSeed([...all], seed);
  return shuffled.slice(0, QUESTIONS_PER_FLOOR);
}

export type RunWithEncounter = {
  run: { id: string; livesRemaining: number; runMoney: number; currentFloor: number; score: number; endedAt: Date | null };
  floorCategory: { id: string; slug: string; name: string };
  monsterTitle: string;
  encounterIndex: number;
  totalEncountersThisFloor: number;
  question: { id: string; text: string; options: string[] };
  floorCategoryOrder: string[];
};

export async function startRun(userId: string, enabledSlugs?: string[] | null): Promise<RunWithEncounter | null> {
  const categories = await prisma.category.findMany({ select: { id: true, slug: true }, orderBy: { slug: "asc" } });
  const toUse =
    enabledSlugs != null && enabledSlugs.length > 0
      ? categories.filter((c) => enabledSlugs.includes(c.slug))
      : categories;
  const pool = toUse.length > 0 ? toUse : categories;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const floorCategoryOrder = shuffled.map((c) => c.id);

  const run = await prisma.run.create({
    data: {
      userId,
      livesRemaining: LIVES_START,
      runMoney: RUN_MONEY_START,
      currentFloor: 1,
      floorCategoryOrder,
    },
  });

  const firstCategoryId = floorCategoryOrder[0];
  const category = await prisma.category.findUnique({ where: { id: firstCategoryId } });
  if (!category) return null;

  const questions = await getQuestionsForFloorInOrder(firstCategoryId, run.id, 1);
  const totalEncountersThisFloor = questions.length;
  if (totalEncountersThisFloor === 0) return null;

  const q = questions[0];
  const options = Array.isArray(q.options) ? (q.options as string[]) : [];

  return {
    run: {
      id: run.id,
      livesRemaining: run.livesRemaining,
      runMoney: run.runMoney,
      currentFloor: run.currentFloor,
      score: run.score,
      endedAt: run.endedAt,
    },
    floorCategory: { id: category.id, slug: category.slug, name: category.name },
    monsterTitle: getMonsterTitle(category.slug, run.id, run.currentFloor, 0),
    encounterIndex: 0,
    totalEncountersThisFloor,
    question: { id: q.id, text: q.text, options },
    floorCategoryOrder,
  };
}

export async function getRunEncounter(runId: string, userId: string): Promise<RunWithEncounter | "game_over" | null> {
  const run = await prisma.run.findFirst({ where: { id: runId, userId }, include: { answers: true } });
  if (!run || run.endedAt) return "game_over";

  const order = (run.floorCategoryOrder as string[] | null) ?? [];
  const categoryId = order[run.currentFloor - 1];
  if (!categoryId) return null;

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) return null;

  const questions = await getQuestionsForFloorInOrder(categoryId, runId, run.currentFloor);
  const answersThisFloor = run.answers.filter((a) => a.floorIndex === run.currentFloor);
  const encounterIndex = answersThisFloor.length;
  const totalEncountersThisFloor = questions.length;
  if (encounterIndex >= totalEncountersThisFloor) {
    return null;
  }
  const q = questions[encounterIndex];
  const options = Array.isArray(q.options) ? (q.options as string[]) : [];

  return {
    run: {
      id: run.id,
      livesRemaining: run.livesRemaining,
      runMoney: run.runMoney,
      currentFloor: run.currentFloor,
      score: run.score,
      endedAt: run.endedAt,
    },
    floorCategory: { id: category.id, slug: category.slug, name: category.name },
    monsterTitle: getMonsterTitle(category.slug, run.id, run.currentFloor, encounterIndex),
    encounterIndex,
    totalEncountersThisFloor,
    question: { id: q.id, text: q.text, options },
    floorCategoryOrder: order,
  };
}

export async function getQuestionsForFloor(runId: string, userId: string): Promise<{ id: string; text: string; options: string[] }[] | null> {
  const run = await prisma.run.findFirst({ where: { id: runId, userId } });
  if (!run || run.endedAt) return null;

  const order = (run.floorCategoryOrder as string[] | null) ?? [];
  const categoryId = order[run.currentFloor - 1];
  if (!categoryId) return null;

  const questions = await getQuestionsForFloorInOrder(categoryId, runId, run.currentFloor);
  return questions.map((q) => ({
    id: q.id,
    text: q.text,
    options: Array.isArray(q.options) ? (q.options as string[]) : [],
  }));
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
): Promise<{ correct: boolean; livesRemaining: number; runMoney: number; next: "encounter" | "floor_complete" | "game_over"; run?: RunWithEncounter }> {
  const run = await prisma.run.findFirst({ where: { id: runId, userId }, include: { answers: true } });
  if (!run || run.endedAt) {
    return { correct: false, livesRemaining: 0, runMoney: 0, next: "game_over" };
  }

  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question || question.categoryId !== (run.floorCategoryOrder as string[])[run.currentFloor - 1]) {
    return { correct: false, livesRemaining: run.livesRemaining, runMoney: run.runMoney, next: "encounter" };
  }

  const correct = question.correctIndex === selectedIndex;
  const answersThisFloor = run.answers.filter((a) => a.floorIndex === run.currentFloor);
  const encounterIndex = answersThisFloor.length;

  let livesRemaining = run.livesRemaining;
  let runMoney = run.runMoney;
  if (correct) {
    runMoney += MONEY_PER_CORRECT;
    const lastThree = run.answers.slice(-(STREAK_FOR_LIFE - 1)).every((a) => a.correct && !a.skipped);
    if (lastThree && run.answers.length >= STREAK_FOR_LIFE - 1) {
      livesRemaining = Math.min(livesRemaining + 1, 6);
    }
  } else {
    livesRemaining -= 1;
  }

  await prisma.answer.create({
    data: { runId, questionId, correct, skipped: false, floorIndex: run.currentFloor, encounterIndex },
  });

  const newScore = correct
    ? Math.max(DIFFICULTY_SCORE_MIN, (question.difficultyScore ?? 50) - DIFFICULTY_STEP)
    : Math.min(DIFFICULTY_SCORE_MAX, (question.difficultyScore ?? 50) + DIFFICULTY_STEP);
  await prisma.question.update({
    where: { id: questionId },
    data: { difficultyScore: newScore },
  });

  if (livesRemaining <= 0) {
    await endRun(runId, userId);
    return { correct, livesRemaining: 0, runMoney, next: "game_over" };
  }

  await prisma.run.update({
    where: { id: runId },
    data: {
      livesRemaining,
      runMoney,
      score: run.score + (correct ? 1 : 0),
    },
  });

  const questionsThisFloor = await getQuestionsForFloorInOrder(
    (run.floorCategoryOrder as string[])[run.currentFloor - 1],
    runId,
    run.currentFloor
  );

  if (encounterIndex + 1 >= questionsThisFloor.length) {
    const nextRun = await advanceToNextFloor(runId, userId);
    return {
      correct,
      livesRemaining,
      runMoney,
      next: nextRun ? "encounter" : "floor_complete",
      run: nextRun ?? undefined,
    };
  }

  const nextEncounter = await getRunEncounter(runId, userId);
  return {
    correct,
    livesRemaining,
    runMoney,
    next: "encounter",
    run: nextEncounter && nextEncounter !== "game_over" ? nextEncounter : undefined,
  };
}

export async function recordSkip(runId: string, userId: string, questionId: string): Promise<{ ok: boolean; next: "encounter" | "floor_complete" | "game_over"; run?: RunWithEncounter }> {
  const run = await prisma.run.findFirst({ where: { id: runId, userId }, include: { answers: true } });
  if (!run || run.endedAt) return { ok: false, next: "game_over" };

  const { SKIP_COST } = await import("./constants");
  if (run.runMoney < SKIP_COST) return { ok: false, next: "encounter" };

  const order = (run.floorCategoryOrder as string[])[run.currentFloor - 1];
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question || question.categoryId !== order) return { ok: false, next: "encounter" };

  const answersThisFloor = run.answers.filter((a) => a.floorIndex === run.currentFloor);
  const encounterIndex = answersThisFloor.length;

  await prisma.answer.create({
    data: { runId, questionId, correct: false, skipped: true, floorIndex: run.currentFloor, encounterIndex },
  });

  await prisma.run.update({
    where: { id: runId },
    data: { runMoney: run.runMoney - SKIP_COST },
  });

  const questionsThisFloor = await getQuestionsForFloorInOrder(order, runId, run.currentFloor);

  if (encounterIndex + 1 >= questionsThisFloor.length) {
    const nextRun = await advanceToNextFloor(runId, userId);
    return { ok: true, next: nextRun ? "encounter" : "floor_complete", run: nextRun ?? undefined };
  }

  const nextEncounter = await getRunEncounter(runId, userId);
  return {
    ok: true,
    next: "encounter",
    run: nextEncounter && nextEncounter !== "game_over" ? nextEncounter : undefined,
  };
}

export async function completeRun(runId: string, userId: string): Promise<void> {
  const run = await prisma.run.findFirst({ where: { id: runId, userId } });
  if (!run || run.endedAt) return;

  const { COLLECTION_CONVERSION_RATE } = await import("./constants");
  const toAdd = Math.floor(run.runMoney * COLLECTION_CONVERSION_RATE);

  await prisma.run.update({
    where: { id: runId },
    data: { endedAt: new Date(), won: true },
  });
  if (toAdd > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { collectionMoney: { increment: toAdd } },
    });
  }
}

async function advanceToNextFloor(runId: string, userId: string): Promise<RunWithEncounter | null> {
  const run = await prisma.run.findFirst({ where: { id: runId, userId } });
  if (!run || run.endedAt) return null;

  const order = (run.floorCategoryOrder as string[]) ?? [];
  const nextFloor = run.currentFloor + 1;
  if (nextFloor > order.length) {
    await completeRun(runId, userId);
    return null;
  }

  await prisma.run.update({
    where: { id: runId },
    data: { currentFloor: nextFloor },
  });

  return getRunEncounter(runId, userId).then((r) => (r === "game_over" ? null : r));
}

export async function endRun(runId: string, userId: string): Promise<void> {
  const run = await prisma.run.findFirst({ where: { id: runId, userId } });
  if (!run || run.endedAt) return;

  const { COLLECTION_CONVERSION_RATE } = await import("./constants");
  const toAdd = Math.floor(run.runMoney * COLLECTION_CONVERSION_RATE);

  await prisma.run.update({
    where: { id: runId },
    data: { endedAt: new Date(), livesRemaining: 0 },
  });
  if (toAdd > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { collectionMoney: { increment: toAdd } },
    });
  }
}
