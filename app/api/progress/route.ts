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

  const [user, runs, answersWithCategories] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { collectionMoney: true },
    }),
    prisma.run.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 20,
      select: { id: true, score: true, currentFloor: true, startedAt: true, endedAt: true },
    }),
    prisma.answer.findMany({
      where: { run: { userId } },
      select: { correct: true, skipped: true, questionId: true, question: { select: { categoryId: true } } },
    }),
  ]);

  const categoryIds = Array.from(new Set(answersWithCategories.map((a) => a.question.categoryId)));
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, slug: true, name: true },
  });
  const byCategory: Record<string, { correct: number; total: number }> = {};
  for (const c of categories) {
    byCategory[c.slug] = { correct: 0, total: 0 };
  }
  for (const a of answersWithCategories) {
    const cat = categories.find((c) => c.id === a.question.categoryId);
    if (cat) {
      byCategory[cat.slug].total += 1;
      if (a.correct) byCategory[cat.slug].correct += 1;
    }
  }

  return NextResponse.json({
    collectionMoney: user?.collectionMoney ?? 0,
    byCategory,
    runs: runs.map((r) => ({
      id: r.id,
      score: r.score,
      floor: r.currentFloor,
      startedAt: r.startedAt,
      endedAt: r.endedAt,
    })),
  });
}
