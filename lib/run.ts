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
  PLAYER_DIFFICULTY_START,
  PLAYER_DIFFICULTY_STEP,
  PLAYER_DIFFICULTY_WINDOW,
} from "./constants";

type QuestionRow = { id: string; text: string; options: unknown };

/**
 * Pick the next question for a player based on their current difficulty.
 * Selects from a ±PLAYER_DIFFICULTY_WINDOW band around the player's level,
 * excluding questions already answered this floor.
 * Falls back to all category questions if the band is empty.
 */
async function getNextQuestion(
  categoryId: string,
  playerDifficulty: number,
  excludeIds: string[]
): Promise<QuestionRow | null> {
  const min = Math.max(DIFFICULTY_SCORE_MIN, playerDifficulty - PLAYER_DIFFICULTY_WINDOW);
  const max = Math.min(DIFFICULTY_SCORE_MAX, playerDifficulty + PLAYER_DIFFICULTY_WINDOW);

  const exclusion = excludeIds.length > 0 ? { notIn: excludeIds } : undefined;

  let candidates = await prisma.question.findMany({
    where: { categoryId, difficultyScore: { gte: min, lte: max }, id: exclusion },
    select: { id: true, text: true, options: true },
  });

  if (candidates.length === 0) {
    candidates = await prisma.question.findMany({
      where: { categoryId, id: exclusion },
      select: { id: true, text: true, options: true },
    });
  }

  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export type RunWithEncounter = {
  run: {
    id: string;
    livesRemaining: number;
    runMoney: number;
    currentFloor: number;
    score: number;
    endedAt: Date | null;
    playerDifficulty: number;
  };
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
      playerDifficulty: PLAYER_DIFFICULTY_START,
    },
  });

  const firstCategoryId = floorCategoryOrder[0];
  const category = await prisma.category.findUnique({ where: { id: firstCategoryId } });
  if (!category) return null;

  const q = await getNextQuestion(firstCategoryId, PLAYER_DIFFICULTY_START, []);
  if (!q) return null;
  const options = Array.isArray(q.options) ? (q.options as string[]) : [];

  return {
    run: {
      id: run.id,
      livesRemaining: run.livesRemaining,
      runMoney: run.runMoney,
      currentFloor: run.currentFloor,
      score: run.score,
      endedAt: run.endedAt,
      playerDifficulty: run.playerDifficulty,
    },
    floorCategory: { id: category.id, slug: category.slug, name: category.name },
    monsterTitle: getMonsterTitle(category.slug, run.id, run.currentFloor, 0),
    encounterIndex: 0,
    totalEncountersThisFloor: QUESTIONS_PER_FLOOR,
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

  const answersThisFloor = run.answers.filter((a) => a.floorIndex === run.currentFloor);
  const encounterIndex = answersThisFloor.length;
  if (encounterIndex >= QUESTIONS_PER_FLOOR) return null;

  const answeredIds = answersThisFloor.map((a) => a.questionId);
  const q = await getNextQuestion(categoryId, run.playerDifficulty, answeredIds);
  if (!q) return null;
  const options = Array.isArray(q.options) ? (q.options as string[]) : [];

  return {
    run: {
      id: run.id,
      livesRemaining: run.livesRemaining,
      runMoney: run.runMoney,
      currentFloor: run.currentFloor,
      score: run.score,
      endedAt: run.endedAt,
      playerDifficulty: run.playerDifficulty,
    },
    floorCategory: { id: category.id, slug: category.slug, name: category.name },
    monsterTitle: getMonsterTitle(category.slug, run.id, run.currentFloor, encounterIndex),
    encounterIndex,
    totalEncountersThisFloor: QUESTIONS_PER_FLOOR,
    question: { id: q.id, text: q.text, options },
    floorCategoryOrder: order,
  };
}

export async function getQuestionsForFloor(runId: string, userId: string): Promise<{ id: string; text: string; options: string[] }[] | null> {
  const run = await prisma.run.findFirst({ where: { id: runId, userId }, include: { answers: true } });
  if (!run || run.endedAt) return null;

  const order = (run.floorCategoryOrder as string[] | null) ?? [];
  const categoryId = order[run.currentFloor - 1];
  if (!categoryId) return null;

  const answeredIds = run.answers.filter((a) => a.floorIndex === run.currentFloor).map((a) => a.questionId);
  const remaining = QUESTIONS_PER_FLOOR - answeredIds.length;
  if (remaining <= 0) return [];

  const questions: { id: string; text: string; options: string[] }[] = [];
  const seen = new Set(answeredIds);
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

  // Adjust question's global difficulty score.
  const newQuestionDifficulty = correct
    ? Math.max(DIFFICULTY_SCORE_MIN, (question.difficultyScore ?? 50) - DIFFICULTY_STEP)
    : Math.min(DIFFICULTY_SCORE_MAX, (question.difficultyScore ?? 50) + DIFFICULTY_STEP);
  await prisma.question.update({
    where: { id: questionId },
    data: { difficultyScore: newQuestionDifficulty },
  });

  // Adjust player's personal difficulty.
  const newPlayerDifficulty = correct
    ? Math.max(DIFFICULTY_SCORE_MIN, run.playerDifficulty - PLAYER_DIFFICULTY_STEP)
    : Math.min(DIFFICULTY_SCORE_MAX, run.playerDifficulty + PLAYER_DIFFICULTY_STEP);

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
      playerDifficulty: newPlayerDifficulty,
    },
  });

  if (encounterIndex + 1 >= QUESTIONS_PER_FLOOR) {
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

  if (encounterIndex + 1 >= QUESTIONS_PER_FLOOR) {
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
