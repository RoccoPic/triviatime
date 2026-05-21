import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { purchaseShopItem, ShopItem } from "@/lib/run";

const VALID_ITEMS = new Set<ShopItem>([
  "extra_life", "second_chance", "fifty_fifty", "hint",
  "freeze_difficulty", "double_down", "difficulty_reset",
  "category_swap", "category_lock", "mulligan", "floor_peek",
]);

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { runId, item } = body as { runId?: string; item?: string };
  if (typeof runId !== "string" || !VALID_ITEMS.has(item as ShopItem)) {
    return NextResponse.json({ error: "runId and valid item required" }, { status: 400 });
  }

  const result = await purchaseShopItem(runId, session.user.id, item as ShopItem);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
