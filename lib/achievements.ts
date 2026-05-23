// ─── Achievement engine (server-only — imports DB) ───────────────────────────

import { prisma } from "@/lib/db";
import { ACHIEVEMENTS } from "@/lib/achievement-defs";

export type { AchievementDef, AchievementTier } from "@/lib/achievement-defs";
export { ACHIEVEMENTS, getAchievementById } from "@/lib/achievement-defs";

type AchievementContext =
  | {
      event: "answer";
      score: number;
      comboCount: number;
      runMoney: number;
      livesRemaining: number;
    }
  | {
      event: "run_end";
      score: number;
      livesRemaining: number;
      lowestLives: number;
      won: boolean;
      wrongAnswers: number;
      skippedAnswers: number;
    }
  | { event: "wave_advance"; wave: number }
  | { event: "relic_pick"; relicsCount: number };

/**
 * Check which achievements apply and grant any the user hasn't yet earned.
 * Fully idempotent — safe to call multiple times with the same context.
 * Returns the IDs of newly granted achievements.
 */
export async function checkAndGrantAchievements(
  userId: string,
  ctx: AchievementContext
): Promise<string[]> {
  // Load already-earned IDs for a fast O(1) lookup
  const earned = await prisma.userAchievement.findMany({
    where: { userId },
    select: { achievementId: true },
  });
  const earnedSet = new Set(earned.map((e) => e.achievementId));

  const toGrant: string[] = [];

  function maybe(id: string, condition: boolean) {
    if (condition && !earnedSet.has(id)) toGrant.push(id);
  }

  switch (ctx.event) {
    case "answer": {
      const { score, comboCount, runMoney, livesRemaining: _ } = ctx;
      maybe("score-10",    score >= 10);
      maybe("score-25",    score >= 25);
      maybe("score-50",    score >= 50);
      maybe("hot-streak",  comboCount >= 5);
      maybe("unstoppable", comboCount >= 10);
      maybe("loaded",      runMoney >= 200);
      break;
    }

    case "run_end": {
      const { score, livesRemaining, lowestLives, won, wrongAnswers, skippedAnswers } = ctx;
      maybe("first-run",     true);
      maybe("first-win",     won);
      maybe("survivor",      won && livesRemaining === 1);
      maybe("comeback-kid",  won && lowestLives <= 1 && livesRemaining > 1);
      maybe("perfectionist", won && wrongAnswers === 0 && score > 0);
      maybe("skip-never",    won && skippedAnswers === 0);
      // Score milestones may not have fired mid-run if the run ended on the last answer
      maybe("score-10",      score >= 10);
      maybe("score-25",      score >= 25);
      maybe("score-50",      score >= 50);
      break;
    }

    case "wave_advance": {
      const { wave } = ctx;
      maybe("wave-2", wave >= 2);
      maybe("wave-3", wave >= 3);
      break;
    }

    case "relic_pick": {
      const { relicsCount } = ctx;
      maybe("relic-hunter",  relicsCount >= 3);
      maybe("relic-hoarder", relicsCount >= 5);
      break;
    }
  }

  if (toGrant.length === 0) return [];

  // Batch upsert — skipDuplicates makes it idempotent
  await prisma.userAchievement.createMany({
    data: toGrant.map((achievementId) => ({ userId, achievementId })),
    skipDuplicates: true,
  });

  return toGrant;
}

/** Fetch all achievements for a user, annotated with earned status. */
export async function getUserAchievements(userId: string) {
  const earned = await prisma.userAchievement.findMany({
    where: { userId },
    orderBy: { earnedAt: "asc" },
  });
  const earnedMap = new Map(earned.map((e) => [e.achievementId, e.earnedAt]));

  return ACHIEVEMENTS.map((def) => ({
    ...def,
    earned: earnedMap.has(def.id),
    earnedAt: earnedMap.get(def.id) ?? null,
  }));
}
