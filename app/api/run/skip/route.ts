import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { recordSkip } from "@/lib/run";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { runId, questionId } = body as { runId?: string; questionId?: string };
  if (typeof runId !== "string" || typeof questionId !== "string") {
    return NextResponse.json({ error: "runId and questionId required" }, { status: 400 });
  }

  const result = await recordSkip(runId, session.user.id, questionId);
  if (!result.ok) {
    return NextResponse.json({ error: "Cannot skip (not enough run money or invalid state)" }, { status: 400 });
  }
  return NextResponse.json(result);
}
