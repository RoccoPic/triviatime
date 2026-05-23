import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { advanceWave } from "@/lib/run";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { runId } = body as { runId?: string };
  if (typeof runId !== "string") {
    return NextResponse.json({ error: "runId required" }, { status: 400 });
  }

  const result = await advanceWave(runId, session.user.id);
  if (!result) {
    return NextResponse.json({ error: "Run not found or already ended" }, { status: 404 });
  }
  return NextResponse.json(result);
}
