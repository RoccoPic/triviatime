import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { startRun } from "@/lib/run";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let enabledSlugs: string[] | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    if (Array.isArray(body.enabledSlugs)) {
      enabledSlugs = body.enabledSlugs.filter((s: unknown): s is string => typeof s === "string");
    }
  } catch {
    // no body or invalid JSON: use all categories
  }

  const data = await startRun(session.user.id, enabledSlugs);
  if (!data) {
    return NextResponse.json({ error: "No questions available" }, { status: 400 });
  }

  return NextResponse.json(data);
}
