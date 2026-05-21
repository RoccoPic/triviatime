"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type ShopState = {
  collectionMoney: number;
  upgHeadStart: boolean;
  upgExtraLife: boolean;
  upgReducedSkip: boolean;
  upgResilience: boolean;
  upgLuckyStreak: boolean;
  upgMoneyBonus: boolean;
  upgStartDiff: boolean;
  upgShield: boolean;
  upgSecondWind: boolean;
};

type UpgradeId =
  | "head_start" | "extra_life" | "reduced_skip" | "resilience"
  | "lucky_streak" | "money_bonus" | "start_difficulty" | "answer_shield" | "second_wind";

const UPGRADES: { id: UpgradeId; name: string; desc: string; price: number; field: keyof ShopState }[] = [
  { id: "head_start",       name: "Head Start",      desc: "Begin every run with $30",                                   price: 300, field: "upgHeadStart" },
  { id: "extra_life",       name: "Extra Life",       desc: "Begin every run with 4 lives instead of 3",                 price: 600, field: "upgExtraLife" },
  { id: "reduced_skip",     name: "Cheaper Skip",     desc: "Skip costs $20 instead of $28",                             price: 350, field: "upgReducedSkip" },
  { id: "resilience",       name: "Resilience",       desc: "Wrong answers only raise difficulty by 3 instead of 5",     price: 400, field: "upgResilience" },
  { id: "lucky_streak",     name: "Lucky Streak",     desc: "Earn a life after 2 correct in a row instead of 3",         price: 400, field: "upgLuckyStreak" },
  { id: "money_bonus",      name: "Money Bonus",      desc: "Each correct answer earns $20 instead of $15",              price: 250, field: "upgMoneyBonus" },
  { id: "start_difficulty", name: "Easy Start",       desc: "Runs begin at difficulty 30 (Easy) instead of 50 (Medium)", price: 300, field: "upgStartDiff" },
  { id: "answer_shield",    name: "Answer Shield",    desc: "Once per run, a wrong answer is absorbed without losing a life", price: 500, field: "upgShield" },
  { id: "second_wind",      name: "Second Wind",      desc: "Once per run, revive with 1 life when you would otherwise die", price: 700, field: "upgSecondWind" },
];

export default function ShopPage() {
  const { status } = useSession();
  const router = useRouter();
  const [shop, setShop] = useState<ShopState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/shop");
      return;
    }
    // authenticated
    setIsLoading(true);
    fetch("/api/shop")
      .then((r) => {
        if (!r.ok) throw new Error(`Server error ${r.status}`);
        return r.json();
      })
      .then((data) => { setShop(data); setIsLoading(false); })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed to load shop");
        setIsLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function purchase(upgradeId: UpgradeId) {
    if (!shop || buying) return;
    setBuying(upgradeId);
    setError(null);
    try {
      const res = await fetch("/api/shop/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upgrade: upgradeId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Purchase failed");
      } else {
        setShop(data);
      }
    } finally {
      setBuying(null);
    }
  }

  if (status === "loading" || isLoading) {
    return <main className="min-h-screen flex items-center justify-center text-zinc-400">Loading shop…</main>;
  }

  if (error && !shop) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 text-zinc-100 gap-4">
        <p className="text-red-400">{error}</p>
        <Link href="/" className="text-zinc-500 hover:underline text-sm">← Home</Link>
      </main>
    );
  }

  if (!shop) return null;

  return (
    <main className="min-h-screen p-4 md:p-8 text-zinc-100">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Shop</h1>
          <div className="text-right">
            <p className="text-amber-400 font-bold text-xl">{shop.collectionMoney}</p>
            <p className="text-zinc-500 text-xs">collection $</p>
          </div>
        </div>

        <p className="text-zinc-400 text-sm mb-6">
          Permanent upgrades that apply to every future run. Each can only be purchased once.
        </p>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <div className="flex flex-col gap-3">
          {UPGRADES.map((upg) => {
            const owned = !!shop[upg.field];
            const canAfford = shop.collectionMoney >= upg.price;
            const isbuying = buying === upg.id;
            return (
              <div
                key={upg.id}
                className={`flex items-center justify-between p-4 rounded-lg border transition ${
                  owned
                    ? "border-amber-600/40 bg-amber-900/10"
                    : "border-zinc-700 bg-zinc-900/50"
                }`}
              >
                <div className="flex-1 mr-4">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{upg.name}</p>
                    {owned && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-600/30 text-amber-400 font-medium">
                        Owned
                      </span>
                    )}
                  </div>
                  <p className="text-zinc-400 text-sm mt-0.5">{upg.desc}</p>
                </div>
                <div className="shrink-0 text-right">
                  {owned ? (
                    <p className="text-amber-400/60 text-sm font-medium">✓</p>
                  ) : (
                    <button
                      onClick={() => purchase(upg.id)}
                      disabled={!canAfford || !!buying}
                      className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      {isbuying ? "…" : `$${upg.price}`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex gap-4">
          <Link href="/" className="text-zinc-500 hover:underline text-sm">← Home</Link>
          <Link href="/progress" className="text-zinc-500 hover:underline text-sm">My progress</Link>
        </div>
      </div>
    </main>
  );
}
