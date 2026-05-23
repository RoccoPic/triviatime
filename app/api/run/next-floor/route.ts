import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { startNextFloor } from "@/lib/run";

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

  const result = await startNextFloor(runId, session.user.id);
  if (result === null) {
    return NextResponse.json({ error: "Run not found or already ended" }, { status: 404 });
  }
  if (result === "run_complete") {
    return NextResponse.json({ next: "run_complete" });
  }
  // Wave complete
  if ("state" in result && result.state === "wave_complete") {
    return NextResponse.json({ next: "wave_complete", run: result.run });
  }
  // Map state
  if ("state" in result && result.state === "map") {
    return NextResponse.json({ next: "map", ...result });
  }
  // Legacy encounter
  return NextResponse.json({ next: "encounter", run: result });
}
