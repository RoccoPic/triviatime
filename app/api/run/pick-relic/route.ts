import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pickRelic } from "@/lib/run";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { runId, relicId } = body as { runId?: string; relicId?: string };

  if (typeof runId !== "string" || typeof relicId !== "string") {
    return NextResponse.json({ error: "runId and relicId required" }, { status: 400 });
  }

  const result = await pickRelic(runId, session.user.id, relicId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
