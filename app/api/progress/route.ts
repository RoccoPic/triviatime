import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [user, allRuns, answers, categories] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { collectionMoney: true },
    }),
    prisma.run.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        score: true,
        currentFloor: true,
        wave: true,
        won: true,
        runClass: true,
        livesRemaining: true,
        relics: true,
        runMoney: true,
        startedAt: true,
        endedAt: true,
      },
    }),
    prisma.answer.findMany({
      where: { run: { userId } },
      select: {
        runId: true,
        correct: true,
        skipped: true,
        question: { select: { categoryId: true } },
      },
    }),
    prisma.category.findMany({
      select: { id: true, slug: true, name: true },
    }),
  ]);

  // ── Per-run answer counts ─────────────────────────────────────────────────
  const answersByRun: Record<string, { correct: number; wrong: number; skipped: number }> = {};
  for (const a of answers) {
    if (!answersByRun[a.runId]) answersByRun[a.runId] = { correct: 0, wrong: 0, skipped: 0 };
    if (a.skipped)       answersByRun[a.runId].skipped++;
    else if (a.correct)  answersByRun[a.runId].correct++;
    else                 answersByRun[a.runId].wrong++;
  }

  // ── Career stats (completed runs only) ────────────────────────────────────
  const completedRuns = allRuns.filter((r) => r.endedAt !== null);
  const wonRuns       = completedRuns.filter((r) => r.won === true);

  const bestScore     = completedRuns.reduce((m, r) => Math.max(m, r.score), 0);
  const highestWave   = completedRuns.reduce((m, r) => Math.max(m, r.wave), 1);
  const bestRunMoney  = completedRuns.reduce((m, r) => Math.max(m, r.runMoney), 0);

  // Best class = class with most wins
  const winsByClass: Record<string, number> = {};
  for (const r of wonRuns) {
    winsByClass[r.runClass] = (winsByClass[r.runClass] ?? 0) + 1;
  }
  const bestClass = Object.entries(winsByClass).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // ── Category accuracy ─────────────────────────────────────────────────────
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const byCategory: Record<string, { name: string; correct: number; total: number }> = {};

  for (const a of answers) {
    const cat = catMap.get(a.question.categoryId);
    if (!cat) continue;
    if (!byCategory[cat.slug]) byCategory[cat.slug] = { name: cat.name, correct: 0, total: 0 };
    byCategory[cat.slug].total += 1;
    if (a.correct) byCategory[cat.slug].correct += 1;
  }

  // ── Runs for display (most recent 30, enriched) ───────────────────────────
  const runsForDisplay = allRuns.slice(0, 30).map((r) => ({
    id:          r.id,
    score:       r.score,
    floor:       r.currentFloor,
    wave:        r.wave,
    won:         r.won,
    runClass:    r.runClass,
    livesRemaining: r.livesRemaining,
    relics:      (r.relics as string[]) ?? [],
    runMoney:    r.runMoney,
    startedAt:   r.startedAt,
    endedAt:     r.endedAt,
    correct:     answersByRun[r.id]?.correct  ?? 0,
    wrong:       answersByRun[r.id]?.wrong    ?? 0,
    skipped:     answersByRun[r.id]?.skipped  ?? 0,
  }));

  return NextResponse.json({
    collectionMoney: user?.collectionMoney ?? 0,
    career: {
      totalRuns:    completedRuns.length,
      wins:         wonRuns.length,
      winRate:      completedRuns.length > 0
                      ? Math.round((wonRuns.length / completedRuns.length) * 100)
                      : 0,
      bestScore,
      highestWave,
      bestRunMoney,
      bestClass,
    },
    byCategory,
    runs: runsForDisplay,
  });
}
