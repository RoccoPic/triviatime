import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Returns the most recent active (non-ended) run for the logged-in user, if one exists. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ run: null });
  }

  const run = await prisma.run.findFirst({
    where: { userId: session.user.id, endedAt: null },
    orderBy: { startedAt: "desc" },
    select: { id: true, wave: true, score: true, runMoney: true, livesRemaining: true, startedAt: true },
  });

  return NextResponse.json({ run });
}
