import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CLASSES } from "@/lib/class-defs";

/** Returns all class definitions annotated with unlock status, plus the user's current selection. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [unlockedRows, user] = await Promise.all([
    prisma.userClass.findMany({ where: { userId: session.user.id }, select: { classId: true, unlockedAt: true } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { selectedClass: true } }),
  ]);

  const unlockedMap = new Map(unlockedRows.map((r) => [r.classId, r.unlockedAt]));

  const classes = CLASSES.map((def) => ({
    ...def,
    unlocked: def.unlockAchievementId === null || unlockedMap.has(def.id),
    unlockedAt: unlockedMap.get(def.id) ?? null,
  }));

  return NextResponse.json({
    classes,
    selectedClass: user?.selectedClass ?? "regular",
  });
}
