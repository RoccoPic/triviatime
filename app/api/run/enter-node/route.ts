import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { enterNode } from "@/lib/run";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { runId, nodeId } = body as { runId?: string; nodeId?: string };

  if (typeof runId !== "string" || typeof nodeId !== "string") {
    return NextResponse.json({ error: "runId and nodeId required" }, { status: 400 });
  }

  const result = await enterNode(runId, session.user.id, nodeId);

  if (result === "game_over") {
    return NextResponse.json({ next: "game_over" });
  }
  if (result === null) {
    return NextResponse.json({ error: "Invalid node selection" }, { status: 400 });
  }

  return NextResponse.json(result);
}
