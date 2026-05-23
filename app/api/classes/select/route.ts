import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CLASSES } from "@/lib/class-defs";

/** Update the player's selected class. Validates that they own it. */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { classId } = body as { classId?: string };
  if (typeof classId !== "string") {
    return NextResponse.json({ error: "classId required" }, { status: 400 });
  }

  const def = CLASSES.find((c) => c.id === classId);
  if (!def) {
    return NextResponse.json({ error: "Unknown class" }, { status: 400 });
  }

  // Regular is always unlocked; others require a UserClass row
  if (def.unlockAchievementId !== null) {
    const unlocked = await prisma.userClass.findUnique({
      where: { userId_classId: { userId: session.user.id, classId } },
    });
    if (!unlocked) {
      return NextResponse.json({ error: "Class not unlocked" }, { status: 403 });
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { selectedClass: classId },
  });

  return NextResponse.json({ ok: true, selectedClass: classId });
}
