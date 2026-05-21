import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  CSHOP_HEAD_START, CSHOP_EXTRA_LIFE, CSHOP_REDUCED_SKIP,
  CSHOP_RESILIENCE, CSHOP_LUCKY_STREAK, CSHOP_MONEY_BONUS,
  CSHOP_START_DIFFICULTY, CSHOP_ANSWER_SHIELD, CSHOP_SECOND_WIND,
} from "@/lib/constants";

type Upgrade =
  | "head_start" | "extra_life" | "reduced_skip" | "resilience"
  | "lucky_streak" | "money_bonus" | "start_difficulty" | "answer_shield" | "second_wind";

const UPGRADE_PRICES: Record<Upgrade, number> = {
  head_start:       CSHOP_HEAD_START,
  extra_life:       CSHOP_EXTRA_LIFE,
  reduced_skip:     CSHOP_REDUCED_SKIP,
  resilience:       CSHOP_RESILIENCE,
  lucky_streak:     CSHOP_LUCKY_STREAK,
  money_bonus:      CSHOP_MONEY_BONUS,
  start_difficulty: CSHOP_START_DIFFICULTY,
  answer_shield:    CSHOP_ANSWER_SHIELD,
  second_wind:      CSHOP_SECOND_WIND,
};

const UPGRADE_FIELD: Record<Upgrade, string> = {
  head_start:       "upgHeadStart",
  extra_life:       "upgExtraLife",
  reduced_skip:     "upgReducedSkip",
  resilience:       "upgResilience",
  lucky_streak:     "upgLuckyStreak",
  money_bonus:      "upgMoneyBonus",
  start_difficulty: "upgStartDiff",
  answer_shield:    "upgShield",
  second_wind:      "upgSecondWind",
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { upgrade } = body as { upgrade?: string };
  if (!upgrade || !(upgrade in UPGRADE_PRICES)) {
    return NextResponse.json({ error: "Invalid upgrade" }, { status: 400 });
  }

  const upg = upgrade as Upgrade;
  const price = UPGRADE_PRICES[upg];
  const field = UPGRADE_FIELD[upg];

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      collectionMoney: true,
      upgHeadStart: true, upgExtraLife: true, upgReducedSkip: true,
      upgResilience: true, upgLuckyStreak: true, upgMoneyBonus: true,
      upgStartDiff: true, upgShield: true, upgSecondWind: true,
    },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user[field as keyof typeof user]) return NextResponse.json({ error: "Already purchased" }, { status: 400 });
  if (user.collectionMoney < price) return NextResponse.json({ error: "Not enough collection money" }, { status: 400 });

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      collectionMoney: { decrement: price },
      [field]: true,
    },
    select: {
      collectionMoney: true,
      upgHeadStart: true, upgExtraLife: true, upgReducedSkip: true,
      upgResilience: true, upgLuckyStreak: true, upgMoneyBonus: true,
      upgStartDiff: true, upgShield: true, upgSecondWind: true,
    },
  });

  return NextResponse.json(updated);
}
