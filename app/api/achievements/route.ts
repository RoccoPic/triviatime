import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserAchievements } from "@/lib/achievements";

/** Returns all achievement definitions annotated with the current user's earned status. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const achievements = await getUserAchievements(session.user.id);
  return NextResponse.json({ achievements });
}
