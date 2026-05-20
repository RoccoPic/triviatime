import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { recordAnswer } from "@/lib/run";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { runId, questionId, selectedIndex } = body as { runId?: string; questionId?: string; selectedIndex?: number };
  if (typeof runId !== "string" || typeof questionId !== "string" || typeof selectedIndex !== "number") {
    return NextResponse.json({ error: "runId, questionId, selectedIndex required" }, { status: 400 });
  }

  const result = await recordAnswer(runId, session.user.id, questionId, selectedIndex);
  return NextResponse.json(result);
}
