"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { RunHUD } from "@/components/RunHUD";
import { RunMap } from "@/components/RunMap";
import type { RunState, EventDef } from "@/lib/run";
import type { RunMapData } from "@/lib/map";

// ── Local types ───────────────────────────────────────────────────────────────

type EncounterData = {
  run: RunState;
  floorCategory: { id: string; slug: string; name: string };
  monsterTitle: string;
  encounterIndex: number;
  totalEncountersThisFloor: number;
  question: { id: string; text: string; options: string[]; eliminatedIndices?: number[] };
};

type Screen =
  | { id: "loading" }
  | { id: "map"; run: RunState; mapData: RunMapData; availableNodeIds: string[] }
  | { id: "encounter"; data: EncounterData }
  | { id: "floor_clear"; run: RunState; mapData: RunMapData; floorCategory: { name: string } }
  | { id: "free_shop"; run: RunState; mapData: RunMapData; availableNodeIds: string[] }
  | { id: "rest"; run: RunState; mapData: RunMapData; availableNodeIds: string[] }
  | { id: "event"; run: RunState; event: EventDef }
  | { id: "game_over" };

type ShopItemDef = {
  id: string;
  name: string;
  desc: string;
  price: number;
  disabled?: (run: RunState) => boolean;
};

const SHOP_ITEMS: ShopItemDef[] = [
  { id: "extra_life",        name: "Extra Life",        price: 45,  desc: "+1 life (max 6)" },
  { id: "second_chance",     name: "Second Chance",     price: 50,  desc: "Next wrong answer absorbed (stackable)" },
  { id: "fifty_fifty",       name: "50/50",             price: 20,  desc: "Eliminate 2 wrong options — next question", disabled: (r) => r.hasFiftyFifty },
  { id: "hint",              name: "Hint",              price: 15,  desc: "Eliminate 1 wrong option — next question",  disabled: (r) => r.hasHint },
  { id: "freeze_difficulty", name: "Freeze Difficulty", price: 30,  desc: "Next 3 wrong answers won't raise difficulty" },
  { id: "double_down",       name: "Double Down",       price: 10,  desc: "Next correct answer earns 2× money",        disabled: (r) => r.moneyMultiplier > 1 },
  { id: "difficulty_reset",  name: "Difficulty Reset",  price: 30,  desc: "Snap difficulty back to Medium (50)" },
  { id: "category_swap",     name: "Category Swap",     price: 35,  desc: "Reroll the next node's category" },
  { id: "mulligan",          name: "Mulligan",          price: 40,  desc: "Gain one free skip (stackable)" },
  { id: "floor_peek",        name: "Node Peek",         price: 15,  desc: "Reveal the next node's category" },
];

function difficultyInfo(d: number): { label: string; className: string } {
  if (d <= 33) return { label: "Easy",   className: "text-green-400" };
  if (d <= 66) return { label: "Medium", className: "text-yellow-400" };
  return              { label: "Hard",   className: "text-red-400" };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RunEncounterPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const runId = params.runId as string;

  const [screen, setScreen] = useState<Screen>({ id: "loading" });
  const [busy, setBusy] = useState(false);
  const [peekResult, setPeekResult] = useState<string | null>(null);
  const [shopError, setShopError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ correct: boolean; shieldAbsorbed?: boolean } | null>(null);

  // Ref that always holds the most recent mapData so we can access it in
  // submitAnswer / payToSkip even though those API calls don't return mapData.
  const mapDataRef = useRef<RunMapData | null>(null);

  // Banner shown on the map screen after returning from an event room.
  const [mapNotification, setMapNotification] = useState<string | null>(null);

  // ── Initial load ────────────────────────────────────────────────────────────
  const fetchState = useCallback(async () => {
    if (!runId) return;
    const res = await fetch(`/api/run/${runId}`);
    const data = await res.json();

    if (data.gameOver) {
      setScreen({ id: "game_over" });
      return;
    }
    if (data.state === "map") {
      mapDataRef.current = data.mapData;
      setScreen({ id: "map", run: data.run, mapData: data.mapData, availableNodeIds: data.availableNodeIds });
      return;
    }
    if (data.state === "event") {
      setScreen({ id: "event", run: data.run, event: data.event });
      return;
    }
    if (data.run && data.question) {
      setScreen({ id: "encounter", data });
    }
  }, [runId]);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/auth/signin?callbackUrl=/run"); return; }
    if (status === "authenticated" && runId) fetchState();
  }, [status, runId, fetchState, router]);

  // ── Enter a map node ────────────────────────────────────────────────────────
  async function enterNode(nodeId: string) {
    if (busy || screen.id !== "map") return;
    setBusy(true);
    setLastResult(null);
    setMapNotification(null);
    try {
      const res = await fetch("/api/run/enter-node", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId, nodeId }),
      });
      const data = await res.json();
      if (!res.ok || data.next === "game_over") { setScreen({ id: "game_over" }); return; }

      if (data.state === "encounter") {
        // mapDataRef stays as-is — it was set when we were on the map screen
        setScreen({ id: "encounter", data: data.encounter });
      } else if (data.state === "free_shop") {
        mapDataRef.current = data.mapData;
        setScreen({ id: "free_shop", run: data.run, mapData: data.mapData, availableNodeIds: data.availableNodeIds });
      } else if (data.state === "rest") {
        mapDataRef.current = data.mapData;
        setScreen({ id: "rest", run: data.run, mapData: data.mapData, availableNodeIds: data.availableNodeIds });
      } else if (data.state === "event") {
        setScreen({ id: "event", run: data.run, event: data.event });
      }
    } finally {
      setBusy(false);
    }
  }

  // ── Back to map (after battle rest-stop or leaving free shop) ───────────────
  async function goToMap() {
    if (busy) return;
    setBusy(true);
    setPeekResult(null);
    setShopError(null);
    try {
      const curRun = screen.id === "floor_clear" || screen.id === "free_shop" || screen.id === "rest"
        ? screen.run
        : null;
      if (!curRun) return;

      const res = await fetch("/api/run/next-floor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: curRun.id }),
      });
      const result = await res.json();
      if (result.next === "run_complete") { router.push(`/run/${runId}/game-over`); return; }
      if (result.next === "map") {
        mapDataRef.current = result.mapData;
        setScreen({ id: "map", run: result.run, mapData: result.mapData, availableNodeIds: result.availableNodeIds });
      }
    } finally {
      setBusy(false);
    }
  }

  // ── Resolve event room choice ────────────────────────────────────────────────
  async function resolveEvent(eventId: string, choiceId: string) {
    if (screen.id !== "event" || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/run/event-choice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId, eventId, choiceId }),
      });
      const data = await res.json();
      if (!res.ok || data.next === "game_over") { setScreen({ id: "game_over" }); return; }
      if (data.next === "run_complete") { router.push(`/run/${runId}/game-over`); return; }
      if (data.next === "map") {
        mapDataRef.current = data.mapData;
        setMapNotification(data.message ?? null);
        setScreen({ id: "map", run: data.run, mapData: data.mapData, availableNodeIds: data.availableNodeIds });
      }
    } finally {
      setBusy(false);
    }
  }

  // ── Answer ──────────────────────────────────────────────────────────────────
  async function submitAnswer(selectedIndex: number) {
    if (screen.id !== "encounter" || busy) return;
    setBusy(true);
    setLastResult(null);
    try {
      const { data } = screen;
      const res = await fetch("/api/run/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: data.run.id, questionId: data.question.id, selectedIndex }),
      });
      const result = await res.json();

      if (result.next === "game_over" || result.next === "run_complete") {
        router.push(`/run/${runId}/game-over`);
        return;
      }

      const shieldAbsorbed = !result.correct && (data.run.shieldCount ?? 0) > 0;
      setLastResult({ correct: result.correct, shieldAbsorbed });

      if (result.next === "floor_clear") {
        setScreen({
          id: "floor_clear",
          run: { ...data.run, livesRemaining: result.livesRemaining, runMoney: result.runMoney, hasFiftyFifty: false, hasHint: false },
          mapData: mapDataRef.current ?? ({} as RunMapData),
          floorCategory: data.floorCategory,
        });
        return;
      }

      if (result.run) setScreen({ id: "encounter", data: result.run });
    } finally {
      setBusy(false);
    }
  }

  // ── Skip ────────────────────────────────────────────────────────────────────
  async function payToSkip() {
    if (screen.id !== "encounter" || busy) return;
    const { data } = screen;
    const hasMulligan = data.run.freeMulligan > 0;
    if (!hasMulligan && data.run.runMoney < data.run.skipCostRun) return;
    setBusy(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/run/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: data.run.id, questionId: data.question.id }),
      });
      const result = await res.json();
      if (result.next === "run_complete") { router.push(`/run/${runId}/game-over`); return; }
      if (result.next === "floor_clear") {
        const newRun = {
          ...data.run,
          runMoney: hasMulligan ? data.run.runMoney : data.run.runMoney - data.run.skipCostRun,
          freeMulligan: hasMulligan ? data.run.freeMulligan - 1 : data.run.freeMulligan,
        };
        setScreen({ id: "floor_clear", run: newRun, mapData: mapDataRef.current ?? ({} as RunMapData), floorCategory: data.floorCategory });
        return;
      }
      if (result.run) setScreen({ id: "encounter", data: result.run });
    } finally {
      setBusy(false);
    }
  }

  // ── Buy shop item ───────────────────────────────────────────────────────────
  async function buyShopItem(itemId: string, currentRun: RunState, isFreeShop = false) {
    if (busy) return;
    setBusy(true);
    setShopError(null);
    try {
      const res = await fetch("/api/run/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: currentRun.id, item: itemId }),
      });
      const data = await res.json();
      if (!res.ok) { setShopError(data.error ?? "Purchase failed"); return; }
      if (data.nextFloorCategory) setPeekResult(data.nextFloorCategory);

      if (isFreeShop && screen.id === "free_shop") {
        setScreen({ ...screen, run: data.run });
      } else if (screen.id === "floor_clear") {
        setScreen({ ...screen, run: data.run });
      }
    } finally {
      setBusy(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (screen.id === "loading") {
    return <main className="min-h-screen flex items-center justify-center text-zinc-400">Loading run…</main>;
  }

  if (screen.id === "game_over") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 text-zinc-100">
        <h1 className="text-2xl font-bold mb-4">Game Over</h1>
        <Link href={`/run/${runId}/game-over`} className="text-amber-500 hover:underline">View run summary</Link>
        <Link href="/run" className="mt-4 text-zinc-500 hover:underline">Start a new run</Link>
      </main>
    );
  }

  // ── Map screen ──────────────────────────────────────────────────────────────
  if (screen.id === "map" || screen.id === "rest") {
    const { run, mapData, availableNodeIds } = screen;
    const isRest = screen.id === "rest";
    const diff = difficultyInfo(run.playerDifficulty);

    return (
      <main className="min-h-screen p-4 md:p-8 text-zinc-100">
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          {/* Stats bar */}
          <div className="flex items-center justify-between flex-wrap gap-3 px-1">
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-xl font-bold text-red-400">{run.livesRemaining}</p>
                <p className="text-zinc-500 text-xs">Lives</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-amber-400">${run.runMoney}</p>
                <p className="text-zinc-500 text-xs">Run $</p>
              </div>
              <div className="text-center">
                <p className={`text-xl font-bold ${diff.className}`}>{diff.label}</p>
                <p className="text-zinc-500 text-xs">Difficulty</p>
              </div>
            </div>
            <Link href="/" className="text-zinc-500 text-sm hover:underline">Exit</Link>
          </div>

          {/* Rest notification */}
          {isRest && (
            <div className="rounded-lg border border-blue-500/40 bg-blue-900/20 px-4 py-3 text-blue-300 text-sm font-medium">
              ❤ You rested and recovered 1 life.
            </div>
          )}

          {/* Event outcome notification */}
          {!isRest && mapNotification && (
            <div className="rounded-lg border border-purple-500/40 bg-purple-900/20 px-4 py-3 text-purple-300 text-sm font-medium">
              {mapNotification}
            </div>
          )}

          <div>
            <h2 className="text-lg font-semibold mb-3 text-zinc-300">
              {availableNodeIds.length === 0
                ? "Run complete — well done!"
                : "Choose your next path"}
            </h2>
            <RunMap
              mapData={mapData}
              availableNodeIds={availableNodeIds}
              onSelect={enterNode}
              selecting={busy}
            />
          </div>

          {availableNodeIds.length === 0 && (
            <button
              onClick={() => router.push(`/run/${runId}/game-over`)}
              className="px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 font-semibold transition"
            >
              View results →
            </button>
          )}
        </div>
      </main>
    );
  }

  // ── Event room ───────────────────────────────────────────────────────────────
  if (screen.id === "event") {
    const { run, event } = screen;
    return (
      <main className="min-h-screen p-4 md:p-8 text-zinc-100">
        <div className="max-w-2xl mx-auto flex flex-col gap-4">

          {/* Header card */}
          <div className="rounded-xl border border-purple-600/40 bg-zinc-900/60 p-6">
            <p className="text-purple-400 text-xs font-semibold uppercase tracking-widest mb-1">
              ? Event Room
            </p>
            <h2 className="text-2xl font-bold mb-4">{event.title}</h2>
            <p className="text-zinc-400 text-sm leading-relaxed italic">{event.description}</p>
            <div className="flex gap-8 mt-4 pt-4 border-t border-zinc-800">
              <div className="text-center">
                <p className="text-lg font-bold text-red-400">{run.livesRemaining}</p>
                <p className="text-zinc-500 text-xs">Lives</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-amber-400">${run.runMoney}</p>
                <p className="text-zinc-500 text-xs">Run $</p>
              </div>
            </div>
          </div>

          {/* Choice buttons */}
          <div className="flex flex-col gap-3">
            {event.choices.map((choice) => {
              const canAfford = (choice.cost ?? 0) === 0 || run.runMoney >= (choice.cost ?? 0);
              const hasLives  = choice.requireMinLives == null || run.livesRemaining >= choice.requireMinLives;
              const isDisabled = !canAfford || !hasLives || busy;

              return (
                <button
                  key={choice.id}
                  onClick={() => resolveEvent(event.id, choice.id)}
                  disabled={isDisabled}
                  className="text-left p-4 rounded-xl border border-zinc-700 bg-zinc-800/50 hover:border-purple-500/40 hover:bg-zinc-700/50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{choice.label}</p>
                      <p className="text-zinc-400 text-xs mt-0.5">{choice.description}</p>
                      {!canAfford && (
                        <p className="text-red-400/70 text-xs mt-1">
                          Requires ${choice.cost}
                        </p>
                      )}
                      {!hasLives && (
                        <p className="text-red-400/70 text-xs mt-1">
                          Requires {choice.requireMinLives} lives
                        </p>
                      )}
                    </div>
                    {(choice.cost ?? 0) > 0 && (
                      <span className={`shrink-0 font-bold text-sm ${canAfford ? "text-amber-400" : "text-zinc-600"}`}>
                        ${choice.cost}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {busy && (
            <p className="text-center text-zinc-500 text-sm animate-pulse">Resolving…</p>
          )}

          <Link href="/" className="text-zinc-500 text-sm hover:underline text-center">
            Exit to home
          </Link>
        </div>
      </main>
    );
  }

  // ── Free shop node ──────────────────────────────────────────────────────────
  if (screen.id === "free_shop") {
    const { run } = screen;
    return (
      <main className="min-h-screen p-4 md:p-8 text-zinc-100">
        <div className="max-w-2xl mx-auto flex flex-col gap-4">
          <div className="rounded-xl border border-green-600/40 bg-zinc-900/50 p-6 text-center">
            <p className="text-green-400 text-sm font-medium uppercase tracking-widest mb-1">✦ Shop Node</p>
            <h2 className="text-2xl font-bold mb-4">Free Shop</h2>
            <div className="flex justify-center gap-10">
              <div><p className="text-2xl font-bold text-red-400">{run.livesRemaining}</p><p className="text-zinc-500 text-sm mt-1">Lives</p></div>
              <div><p className="text-2xl font-bold text-amber-400">${run.runMoney}</p><p className="text-zinc-500 text-sm mt-1">Run $</p></div>
            </div>
          </div>

          <ShopGrid
            run={run}
            buying={busy}
            shopError={shopError}
            peekResult={peekResult}
            onBuy={(id) => buyShopItem(id, run, true)}
          />

          <button
            onClick={goToMap}
            disabled={busy}
            className="w-full px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 font-semibold text-lg disabled:opacity-50 transition"
          >
            {busy ? "Loading…" : "Continue to map →"}
          </button>
          <Link href="/" className="text-zinc-500 text-sm hover:underline text-center">Exit to home</Link>
        </div>
      </main>
    );
  }

  // ── Floor-clear rest stop (after battle/elite) ──────────────────────────────
  if (screen.id === "floor_clear") {
    const { run, floorCategory } = screen;
    const diff = difficultyInfo(run.playerDifficulty);
    return (
      <main className="min-h-screen p-4 md:p-8 text-zinc-100">
        <div className="max-w-2xl mx-auto flex flex-col gap-4">
          <div className="rounded-xl border border-amber-600/50 bg-zinc-900/50 p-6 text-center">
            <p className="text-amber-400 text-sm font-medium uppercase tracking-widest mb-1">Node cleared</p>
            <h2 className="text-3xl font-bold mb-4">{floorCategory.name}</h2>
            <div className="flex justify-center gap-10">
              <div><p className="text-2xl font-bold text-red-400">{run.livesRemaining}</p><p className="text-zinc-500 text-sm mt-1">Lives</p></div>
              <div><p className="text-2xl font-bold text-amber-400">${run.runMoney}</p><p className="text-zinc-500 text-sm mt-1">Run $</p></div>
              <div><p className={`text-2xl font-bold ${diff.className}`}>{diff.label}</p><p className="text-zinc-500 text-sm mt-1">Difficulty</p></div>
            </div>
            {lastResult && (
              <p className={`mt-3 text-sm font-medium ${lastResult.correct ? "text-green-400" : "text-red-400"}`}>
                {lastResult.correct ? "Correct!" : lastResult.shieldAbsorbed ? "Wrong — shield absorbed it." : "Wrong — one life lost."}
              </p>
            )}
          </div>

          <ShopGrid
            run={run}
            buying={busy}
            shopError={shopError}
            peekResult={peekResult}
            onBuy={(id) => buyShopItem(id, run, false)}
          />

          <button
            onClick={goToMap}
            disabled={busy}
            className="w-full px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 font-semibold text-lg disabled:opacity-50 transition"
          >
            {busy ? "Loading…" : "Back to map →"}
          </button>
          <Link href="/" className="text-zinc-500 text-sm hover:underline text-center">Exit to home</Link>
        </div>
      </main>
    );
  }

  // ── Active encounter ─────────────────────────────────────────────────────────
  const { data: enc } = screen as { id: "encounter"; data: EncounterData };
  const { run, floorCategory, monsterTitle, question, encounterIndex, totalEncountersThisFloor } = enc;
  const hasMulligan = run.freeMulligan > 0;
  const canSkip = hasMulligan || run.runMoney >= run.skipCostRun;

  return (
    <main className="min-h-screen p-4 md:p-8 text-zinc-100">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <RunHUD
          lives={run.livesRemaining}
          runMoney={run.runMoney}
          floor={run.currentFloor}
          encounterIndex={encounterIndex}
          totalEncounters={totalEncountersThisFloor}
          floorCategoryName={floorCategory.name}
          playerDifficulty={run.playerDifficulty}
          shieldCount={run.shieldCount}
          freezeCount={run.freezeCount}
          moneyMultiplier={run.moneyMultiplier}
          hasFiftyFifty={run.hasFiftyFifty}
          hasHint={run.hasHint}
          freeMulligan={run.freeMulligan}
        />

        <div className="rounded-xl border border-amber-600/50 bg-zinc-900/50 p-6">
          <p className="text-amber-400/90 text-sm font-medium mb-2">Trivia monster — {monsterTitle}</p>
          <h2 className="text-xl font-semibold mb-6">{question.text}</h2>

          {lastResult !== null && (
            <p className={`mb-4 font-medium ${lastResult.correct ? "text-green-400" : "text-red-400"}`}>
              {lastResult.correct
                ? "Correct!"
                : lastResult.shieldAbsorbed
                ? "Wrong — shield absorbed it."
                : "Wrong — one life lost."}
            </p>
          )}

          <div className="flex flex-col gap-3">
            {question.options.map((opt, i) => {
              const eliminated = question.eliminatedIndices?.includes(i) ?? false;
              return (
                <button
                  key={i}
                  onClick={() => submitAnswer(i)}
                  disabled={busy || eliminated}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition ${
                    eliminated
                      ? "bg-zinc-900/30 border-zinc-700/30 text-zinc-600 line-through cursor-not-allowed"
                      : "bg-zinc-800 border-zinc-600 hover:border-amber-500/50 hover:bg-zinc-700/80 disabled:opacity-50"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-700 flex justify-between items-center">
            <span className="text-zinc-500 text-sm">
              {hasMulligan ? `Free skip (${run.freeMulligan} left)` : "Skip (no life lost)"}
            </span>
            <button
              onClick={payToSkip}
              disabled={!canSkip || busy}
              className="px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {hasMulligan ? "Skip free" : `Pay $${run.skipCostRun} to skip`}
            </button>
          </div>
        </div>

        <Link href="/" className="text-zinc-500 text-sm hover:underline">Exit to home</Link>
      </div>
    </main>
  );
}

// ── Shop grid (shared between floor_clear and free_shop) ──────────────────────
function ShopGrid({
  run, buying, shopError, peekResult, onBuy,
}: {
  run: RunState;
  buying: boolean;
  shopError: string | null;
  peekResult: string | null;
  onBuy: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-3">Shop</h3>
      {peekResult && (
        <p className="text-amber-300 text-sm font-medium mb-3">
          Next node: <span className="font-bold">{peekResult}</span>
        </p>
      )}
      {shopError && <p className="text-red-400 text-sm mb-3">{shopError}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {SHOP_ITEMS.map((item) => {
          const isDisabled = item.disabled?.(run) ?? false;
          const canAfford = run.runMoney >= item.price;
          return (
            <button
              key={item.id}
              onClick={() => onBuy(item.id)}
              disabled={isDisabled || !canAfford || buying}
              className="text-left p-3 rounded-lg border border-zinc-700 bg-zinc-800/50 hover:border-amber-500/40 hover:bg-zinc-700/60 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">{item.desc}</p>
                </div>
                <span className="shrink-0 text-amber-400 font-bold text-sm">${item.price}</span>
              </div>
              {isDisabled && <p className="text-amber-500/60 text-xs mt-1">Active</p>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
