import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveEventChoice } from "@/lib/run";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { runId, eventId, choiceId } = body as {
    runId?: string;
    eventId?: string;
    choiceId?: string;
  };

  if (
    typeof runId !== "string" ||
    typeof eventId !== "string" ||
    typeof choiceId !== "string"
  ) {
    return NextResponse.json(
      { error: "runId, eventId, and choiceId are required" },
      { status: 400 }
    );
  }

  const result = await resolveEventChoice(runId, session.user.id, eventId, choiceId);

  if (result === "game_over") {
    return NextResponse.json({ next: "game_over" });
  }
  if (result === null) {
    return NextResponse.json({ error: "Invalid event or choice" }, { status: 400 });
  }
  if (result.mapState === "run_complete") {
    return NextResponse.json({ next: "run_complete", message: result.message });
  }
  return NextResponse.json({ next: "map", message: result.message, ...result.mapState });
}
