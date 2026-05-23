import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRunEncounter } from "@/lib/run";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { runId } = await params;
  const data = await getRunEncounter(runId, session.user.id);

  if (data === "game_over") {
    const [run, answers] = await Promise.all([
      prisma.run.findFirst({
        where: { id: runId, userId: session.user.id },
        select: {
          score: true,
          currentFloor: true,
          runMoney: true,
          wave: true,
          won: true,
          runClass: true,
          livesRemaining: true,
          lowestLives: true,
          relics: true,
          startedAt: true,
          endedAt: true,
        },
      }),
      prisma.answer.findMany({
        where: { runId },
        select: { correct: true, skipped: true },
      }),
    ]);

    const correct  = answers.filter((a) => a.correct && !a.skipped).length;
    const wrong    = answers.filter((a) => !a.correct && !a.skipped).length;
    const skipped  = answers.filter((a) => a.skipped).length;

    return NextResponse.json({
      gameOver: true,
      run: run
        ? { ...run, relics: (run.relics as string[]) ?? [], correct, wrong, skipped }
        : undefined,
    });
  }
  if (!data) {
    return NextResponse.json({ error: "Run or encounter not found" }, { status: 404 });
  }

  // Map, event, or encounter — all serialise cleanly as JSON
  return NextResponse.json(data);
}
