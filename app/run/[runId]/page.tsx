"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { RunHUD } from "@/components/RunHUD";
import { RunMap, TOKEN_MOVE_MS } from "@/components/RunMap";
import type { RunState, EventDef, RelicDef } from "@/lib/run";
import type { RunMapData } from "@/lib/map";
import { getAchievementById } from "@/lib/achievement-defs";
import { getShowCorrectExplanation } from "@/lib/explanation-settings";

// ── Local types ───────────────────────────────────────────────────────────────

type EncounterData = {
  run: RunState;
  floorCategory: { id: string; slug: string; name: string };
  monsterTitle: string;
  encounterIndex: number;
  totalEncountersThisFloor: number;
  question: { id: string; text: string; options: string[]; eliminatedIndices?: number[] };
  boss?: { name: string; title: string; dialogue: string; icon: string };
};

type Screen =
  | { id: "loading" }
  | { id: "map"; run: RunState; mapData: RunMapData; availableNodeIds: string[] }
  | { id: "encounter"; data: EncounterData }
  | { id: "floor_clear"; run: RunState; mapData: RunMapData; floorCategory: { name: string } }
  | { id: "relic_pick"; run: RunState; choices: RelicDef[]; mapData: RunMapData; floorCategory: { name: string } }
  | { id: "free_shop"; run: RunState; mapData: RunMapData; availableNodeIds: string[] }
  | { id: "rest"; run: RunState; mapData: RunMapData; availableNodeIds: string[] }
  | { id: "event"; run: RunState; event: EventDef }
  | { id: "wave_complete"; run: RunState }
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

function difficultyInfo(d: number): { label: string; color: string } {
  if (d <= 33) return { label: "Easy",   color: "#4ade80" };
  if (d <= 66) return { label: "Medium", color: "#fbbf24" };
  return              { label: "Hard",   color: "#f87171" };
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
  // Boss intro: dismissed per encounter (reset when screen changes away from encounter)
  const [bossIntroAcked, setBossIntroAcked] = useState(false);
  // Answer result — shown after submitting, cleared on transition to next screen
  const [answerResult, setAnswerResult] = useState<{
    selectedIndex: number;
    correctIndex: number;
    explanation: string | null;
    correct: boolean;
    shieldAbsorbed: boolean;
  } | null>(null);
  // Stores the pending screen transition while the wrong-answer feedback is showing
  const pendingTransitionRef = useRef<(() => void) | null>(null);
  // Auto-advance timer for correct-answer explanation (can be cancelled by "Next →" click)
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Whether to show explanations on correct answers (read from localStorage on mount)
  const [showCorrectExpl, setShowCorrectExpl] = useState(false);
  // Synchronous guard for buyShopItem — useRef so it's set instantly (before React re-renders)
  // preventing double-click races that slip past the `busy` state check.
  const shopBusyRef = useRef(false);
  // Achievement toasts — each auto-dismissed after 4 s
  const [achToasts, setAchToasts] = useState<{ key: number; icon: string; name: string }[]>([]);
  const achKeyRef = useRef(0);

  // Ref that always holds the most recent mapData so we can access it in
  // submitAnswer / payToSkip even though those API calls don't return mapData.
  const mapDataRef = useRef<RunMapData | null>(null);

  // Banner shown on the map screen after returning from an event room.
  const [mapNotification, setMapNotification] = useState<string | null>(null);

  // Node the player just clicked — drives the dragon token animation before screen change.
  const [enteringNodeId, setEnteringNodeId] = useState<string | null>(null);

  // ── Achievement toasts ──────────────────────────────────────────────────────
  function showAchievements(ids: string[] | undefined) {
    if (!ids || ids.length === 0) return;
    ids.forEach((id) => {
      const def = getAchievementById(id);
      if (!def) return;
      const key = ++achKeyRef.current;
      setAchToasts((prev) => [...prev, { key, icon: def.icon, name: def.name }]);
      setTimeout(() => setAchToasts((prev) => prev.filter((t) => t.key !== key)), 4000);
    });
  }

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
    if (data.state === "floor_clear") {
      mapDataRef.current = data.mapData;
      setScreen({ id: "floor_clear", run: data.run, mapData: data.mapData, floorCategory: data.floorCategory });
      return;
    }
    if (data.state === "relic_pick") {
      mapDataRef.current = data.mapData;
      setScreen({ id: "relic_pick", run: data.run, choices: data.choices, mapData: data.mapData, floorCategory: data.floorCategory });
      return;
    }
    if (data.state === "wave_complete") {
      setScreen({ id: "wave_complete", run: data.run });
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

  // Read localStorage settings once on mount
  useEffect(() => {
    setShowCorrectExpl(getShowCorrectExplanation());
  }, []);

  // Reset boss intro and clear any dangling timers when leaving the encounter screen
  useEffect(() => {
    if (screen.id !== "encounter") {
      setBossIntroAcked(false);
      if (autoAdvanceTimerRef.current !== null) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
    }
  }, [screen.id]);

  // ── Enter a map node ────────────────────────────────────────────────────────
  async function enterNode(nodeId: string) {
    if (busy || (screen.id !== "map" && screen.id !== "rest")) return;
    setBusy(true);
    setAnswerResult(null);
    pendingTransitionRef.current = null;
    setMapNotification(null);

    // Start the dragon token gliding to the selected node immediately.
    setEnteringNodeId(nodeId);

    try {
      // Fire the API call and the animation delay in parallel.
      // The screen only transitions once BOTH are done, so the player
      // always sees the token reach the node before the view changes.
      const [res] = await Promise.all([
        fetch("/api/run/enter-node", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ runId, nodeId }),
        }),
        new Promise<void>((r) => setTimeout(r, TOKEN_MOVE_MS)),
      ]);

      const data = await res.json();
      if (!res.ok || data.next === "game_over") { setScreen({ id: "game_over" }); return; }

      if (data.state === "encounter") {
        setScreen({ id: "encounter", data: data.encounter });
      } else if (data.state === "free_shop") {
        mapDataRef.current = data.mapData;
        setScreen({ id: "free_shop", run: data.run, mapData: data.mapData, availableNodeIds: data.availableNodeIds });
      } else if (data.state === "rest") {
        mapDataRef.current = data.mapData;
        setScreen({ id: "rest", run: data.run, mapData: data.mapData, availableNodeIds: data.availableNodeIds });
      } else if (data.state === "event") {
        setScreen({ id: "event", run: data.run, event: data.event });
      } else if (data.state === "wave_complete") {
        setScreen({ id: "wave_complete", run: data.run });
      }
    } finally {
      setEnteringNodeId(null);
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
      if (result.next === "wave_complete") {
        setScreen({ id: "wave_complete", run: result.run });
        return;
      }
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
      if (data.next === "wave_complete") {
        setScreen({ id: "wave_complete", run: data.run });
        return;
      }
      if (data.next === "map") {
        mapDataRef.current = data.mapData;
        setMapNotification(data.message ?? null);
        setScreen({ id: "map", run: data.run, mapData: data.mapData, availableNodeIds: data.availableNodeIds });
      }
    } finally {
      setBusy(false);
    }
  }

  // ── Wave complete — Progress or Cash Out ────────────────────────────────────
  async function advanceWaveAction() {
    if (screen.id !== "wave_complete" || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/run/advance-wave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      });
      const data = await res.json();
      if (!res.ok) return;
      showAchievements(data.newAchievements);
      mapDataRef.current = data.mapData;
      setScreen({ id: "map", run: data.run, mapData: data.mapData, availableNodeIds: data.availableNodeIds });
    } finally {
      setBusy(false);
    }
  }

  async function cashOutAction() {
    if (screen.id !== "wave_complete" || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/run/cash-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      });
      if (!res.ok) return;
      const cashData = await res.json();
      showAchievements(cashData.newAchievements);
      router.push(`/run/${runId}/game-over`);
    } finally {
      setBusy(false);
    }
  }

  // ── Relic pick ──────────────────────────────────────────────────────────────
  async function pickRelicAction(relicId: string) {
    if (screen.id !== "relic_pick" || busy) return;
    const { mapData, floorCategory } = screen;
    setBusy(true);
    try {
      const res = await fetch("/api/run/pick-relic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId, relicId }),
      });
      const data = await res.json();
      if (!res.ok) return;
      showAchievements(data.newAchievements);
      const updatedRun = data.run ?? screen.run;
      setScreen({ id: "floor_clear", run: updatedRun, mapData, floorCategory });
    } finally {
      setBusy(false);
    }
  }

  function skipRelicPick() {
    if (screen.id !== "relic_pick") return;
    const { run, mapData, floorCategory } = screen;
    setScreen({ id: "floor_clear", run, mapData, floorCategory });
  }

  // ── Answer ──────────────────────────────────────────────────────────────────
  async function submitAnswer(selectedIndex: number) {
    if (screen.id !== "encounter" || busy || answerResult !== null) return;
    setBusy(true);
    const { data } = screen;

    let result: any;
    try {
      const res = await fetch("/api/run/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: data.run.id, questionId: data.question.id, selectedIndex }),
      });
      result = await res.json();
    } catch {
      setBusy(false);
      return;
    }

    showAchievements(result.newAchievements);
    const shieldAbsorbed = !result.correct && (data.run.shieldCount ?? 0) > 0;

    setAnswerResult({
      selectedIndex,
      correctIndex: result.correctIndex ?? selectedIndex,
      explanation: result.explanation ?? null,
      correct: result.correct,
      shieldAbsorbed,
    });

    // Build the deferred screen-transition callback
    const doTransition = () => {
      setAnswerResult(null);
      pendingTransitionRef.current = null;

      if (result.next === "game_over" || result.next === "run_complete") {
        router.push(`/run/${runId}/game-over`);
        return; // navigating away — leave busy=true
      }

      if (result.next === "floor_clear") {
        const updatedRun = {
          ...data.run,
          livesRemaining: result.livesRemaining,
          runMoney: result.runMoney,
          hasFiftyFifty: false,
          hasHint: false,
        };
        const mapData = mapDataRef.current ?? ({} as RunMapData);
        if (result.relicChoices?.length) {
          setScreen({ id: "relic_pick", run: updatedRun, choices: result.relicChoices, mapData, floorCategory: data.floorCategory });
        } else {
          setScreen({ id: "floor_clear", run: updatedRun, mapData, floorCategory: data.floorCategory });
        }
        setBusy(false);
        return;
      }

      if (result.run) setScreen({ id: "encounter", data: result.run });
      setBusy(false);
    };

    if (result.next === "game_over" || result.next === "run_complete") {
      // Navigate away quickly — no need to linger
      setTimeout(doTransition, 1200);
    } else if (result.correct) {
      const hasExplanation = showCorrectExpl && !!result.explanation;
      if (hasExplanation) {
        // Show green explanation panel; player can click "Next →" or wait for auto-advance
        pendingTransitionRef.current = doTransition;
        autoAdvanceTimerRef.current = setTimeout(() => {
          pendingTransitionRef.current = null;
          autoAdvanceTimerRef.current = null;
          doTransition();
        }, 4000);
      } else {
        // Brief green flash, then auto-advance
        setTimeout(doTransition, 1200);
      }
    } else {
      // Wrong answer — release busy so "Got it" button is clickable
      setBusy(false);
      pendingTransitionRef.current = doTransition;
    }
  }

  // Called when the player clicks "Next →" on a correct-answer explanation panel
  function continueAfterCorrect() {
    const fn = pendingTransitionRef.current;
    if (!fn || busy) return;
    if (autoAdvanceTimerRef.current !== null) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    pendingTransitionRef.current = null;
    setBusy(true);
    fn();
  }

  // Called when the player clicks "Got it →" after a wrong-answer explanation
  function continueAfterWrong() {
    const fn = pendingTransitionRef.current;
    if (!fn || busy) return;
    setBusy(true);
    fn();
  }

  // ── Skip ────────────────────────────────────────────────────────────────────
  async function payToSkip() {
    if (screen.id !== "encounter" || busy) return;
    const { data } = screen;
    const hasMulligan = data.run.freeMulligan > 0;
    if (!hasMulligan && data.run.runMoney < data.run.skipCostRun) return;
    setBusy(true);
    setAnswerResult(null);
    pendingTransitionRef.current = null;
    try {
      const res = await fetch("/api/run/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: data.run.id, questionId: data.question.id }),
      });
      const result = await res.json();
      if (result.next === "run_complete") { showAchievements(result.newAchievements); router.push(`/run/${runId}/game-over`); return; }
      if (result.next === "floor_clear") {
        const newRun = {
          ...data.run,
          runMoney: hasMulligan ? data.run.runMoney : data.run.runMoney - data.run.skipCostRun,
          freeMulligan: hasMulligan ? data.run.freeMulligan - 1 : data.run.freeMulligan,
        };
        const mapData = mapDataRef.current ?? ({} as RunMapData);
        if (result.relicChoices?.length) {
          setScreen({ id: "relic_pick", run: newRun, choices: result.relicChoices, mapData, floorCategory: data.floorCategory });
        } else {
          setScreen({ id: "floor_clear", run: newRun, mapData, floorCategory: data.floorCategory });
        }
        return;
      }
      if (result.run) setScreen({ id: "encounter", data: result.run });
    } finally {
      setBusy(false);
    }
  }

  // ── Buy shop item ───────────────────────────────────────────────────────────
  async function buyShopItem(itemId: string, currentRun: RunState, isFreeShop = false) {
    // Use a ref-based guard so double-clicks are blocked synchronously,
    // before React has a chance to commit the `busy` state update.
    if (shopBusyRef.current) return;
    shopBusyRef.current = true;
    setBusy(true);
    setShopError(null);
    try {
      const res = await fetch("/api/run/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: currentRun.id, item: itemId }),
      });

      // Guard against empty / non-JSON responses (e.g. server crash returning 500 with no body)
      let data: any;
      try {
        data = await res.json();
      } catch {
        setShopError("Server error — please try again");
        return;
      }

      if (!res.ok) { setShopError(data.error ?? "Purchase failed"); return; }
      if (data.nextFloorCategory) setPeekResult(data.nextFloorCategory);

      if (isFreeShop && screen.id === "free_shop") {
        setScreen({ ...screen, run: data.run });
      } else if (screen.id === "floor_clear") {
        setScreen({ ...screen, run: data.run });
      }
    } finally {
      shopBusyRef.current = false;
      setBusy(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  /** Achievement toasts overlay — rendered on top of every screen */
  const AchievementToasts = achToasts.length > 0 ? (
    <div className="fixed bottom-6 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {achToasts.map((t) => (
        <div
          key={t.key}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-xl text-sm font-medium animate-fade-in-up"
          style={{
            background: "rgba(26,13,18,0.97)",
            border: "1px solid rgba(214,160,74,0.45)",
            color: "var(--text-page)",
            fontFamily: "var(--font-body, system-ui)",
          }}
        >
          <span className="text-xl leading-none">{t.icon}</span>
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-widest leading-none mb-0.5"
              style={{ color: "#d6a04a" }}
            >
              Achievement unlocked
            </p>
            <p style={{ color: "var(--text-page)" }}>{t.name}</p>
          </div>
        </div>
      ))}
    </div>
  ) : null;

  if (screen.id === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ fontFamily: "var(--font-body, system-ui)" }}>
        <p className="text-sm animate-pulse" style={{ color: "var(--text-muted)" }}>Loading run…</p>
      </main>
    );
  }

  if (screen.id === "game_over") {
    return (
      <>
        {AchievementToasts}
        <main
          className="min-h-screen flex flex-col items-center justify-center p-8 gap-4"
          style={{ fontFamily: "var(--font-body, system-ui)" }}
        >
          <p className="text-4xl">☠</p>
          <h1
            className="text-3xl"
            style={{ fontFamily: "var(--font-display, Georgia, serif)", color: "var(--text-page)", fontWeight: 400 }}
          >
            Game Over
          </h1>
          <Link
            href={`/run/${runId}/game-over`}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ background: "#d6a04a", color: "#1a0d12" }}
          >
            View run summary →
          </Link>
          <Link
            href="/run"
            className="text-sm transition-opacity hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
          >
            Start a new run
          </Link>
        </main>
      </>
    );
  }

  // ── Map screen ──────────────────────────────────────────────────────────────
  if (screen.id === "map" || screen.id === "rest") {
    const { run, mapData, availableNodeIds } = screen;
    const isRest = screen.id === "rest";

    const heartsDisplay = Array.from({ length: Math.min(run.livesRemaining, 8) }, () => "❤").join("");

    return (
      <main className="min-h-screen p-4 md:p-8" style={{ fontFamily: "var(--font-body, system-ui)" }}>
        {AchievementToasts}
        <div className="max-w-3xl mx-auto flex flex-col gap-5">

          {/* Top bar: stats + exit */}
          <div
            className="flex items-center justify-between flex-wrap gap-3 px-4 py-3 rounded-xl"
            style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(214,160,74,0.18)" }}
          >
            <div className="flex items-center gap-5 flex-wrap text-sm">
              <span style={{ color: "#f87171", fontFamily: "var(--font-mono, monospace)" }}>{heartsDisplay}</span>
              <span style={{ color: "#d6a04a", fontFamily: "var(--font-mono, monospace)" }}>${run.runMoney}</span>
              {run.wave > 1 && (
                <span style={{ color: "#93c5fd" }}>
                  Wave&nbsp;<strong>{run.wave}</strong>
                </span>
              )}
            </div>
            <Link
              href="/"
              className="text-xs transition-opacity hover:opacity-70"
              style={{ color: "var(--text-muted)" }}
            >
              ← Exit
            </Link>
          </div>

          {/* Notifications */}
          {isRest && (
            <div
              className="rounded-xl px-4 py-3 text-sm font-medium"
              style={{ background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.3)", color: "#93c5fd" }}
            >
              ♥ You rested at the Hearth and recovered 1 life.
            </div>
          )}
          {!isRest && mapNotification && (
            <div
              className="rounded-xl px-4 py-3 text-sm font-medium"
              style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.3)", color: "#c4b5fd" }}
            >
              {mapNotification}
            </div>
          )}

          {/* Map heading */}
          <div>
            <h2
              className="text-xl mb-4"
              style={{
                fontFamily: "var(--font-display, Georgia, serif)",
                color: availableNodeIds.length === 0 ? "#d6a04a" : "var(--text-page)",
                fontWeight: 400,
              }}
            >
              {availableNodeIds.length === 0
                ? "✦ Run complete — well done!"
                : "Choose your next path"}
            </h2>
            <RunMap
              mapData={mapData}
              availableNodeIds={availableNodeIds}
              onSelect={enterNode}
              selecting={busy}
              enteringNodeId={enteringNodeId ?? undefined}
            />
          </div>

          {availableNodeIds.length === 0 && (
            <button
              onClick={() => router.push(`/run/${runId}/game-over`)}
              className="px-6 py-3 rounded-xl font-semibold transition-opacity hover:opacity-80"
              style={{ background: "#d6a04a", color: "#1a0d12" }}
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
      <main className="min-h-screen p-4 md:p-8" style={{ fontFamily: "var(--font-body, system-ui)" }}>
        <div className="max-w-2xl mx-auto flex flex-col gap-4">

          {/* Header card */}
          <div
            className="rounded-xl p-6"
            style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.25)" }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: "#a78bfa" }}
            >
              ? Omen — Event Room
            </p>
            <h2
              className="text-2xl mb-3"
              style={{ fontFamily: "var(--font-display, Georgia, serif)", color: "var(--text-page)", fontWeight: 400 }}
            >
              {event.title}
            </h2>
            <p
              className="text-sm leading-relaxed italic mb-4"
              style={{ color: "var(--text-muted)", fontFamily: "var(--font-display, serif)" }}
            >
              {event.description}
            </p>
            <div
              className="flex gap-8 pt-4"
              style={{ borderTop: "1px solid rgba(214,160,74,0.15)" }}
            >
              <div>
                <p className="text-lg font-semibold" style={{ color: "#f87171", fontFamily: "var(--font-mono, monospace)" }}>
                  {"❤".repeat(Math.min(run.livesRemaining, 6))}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Lives</p>
              </div>
              <div>
                <p className="text-lg font-semibold" style={{ color: "#d6a04a", fontFamily: "var(--font-mono, monospace)" }}>
                  ${run.runMoney}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Run $</p>
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
                  className="text-left p-4 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: "rgba(255,255,255,0.035)",
                    border: "1px solid rgba(167,139,250,0.2)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color: "var(--text-page)" }}>{choice.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{choice.description}</p>
                      {!canAfford && (
                        <p className="text-xs mt-1" style={{ color: "#f87171" }}>
                          Requires ${choice.cost}
                        </p>
                      )}
                      {!hasLives && (
                        <p className="text-xs mt-1" style={{ color: "#f87171" }}>
                          Requires {choice.requireMinLives} lives
                        </p>
                      )}
                    </div>
                    {(choice.cost ?? 0) > 0 && (
                      <span
                        className="shrink-0 font-bold text-sm"
                        style={{ color: canAfford ? "#d6a04a" : "#4b3a2a", fontFamily: "var(--font-mono, monospace)" }}
                      >
                        ${choice.cost}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {busy && (
            <p className="text-center text-sm animate-pulse" style={{ color: "var(--text-muted)" }}>Resolving…</p>
          )}

          <Link href="/" className="text-sm text-center transition-opacity hover:opacity-70" style={{ color: "var(--text-muted)" }}>
            ← Exit to home
          </Link>
        </div>
      </main>
    );
  }

  // ── Free shop node ──────────────────────────────────────────────────────────
  if (screen.id === "free_shop") {
    const { run } = screen;
    return (
      <main className="min-h-screen p-4 md:p-8" style={{ fontFamily: "var(--font-body, system-ui)" }}>
        <div className="max-w-2xl mx-auto flex flex-col gap-4">
          <div
            className="rounded-xl p-6 text-center"
            style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.25)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#4ade80" }}>
              ❖ Bazaar Node
            </p>
            <h2
              className="text-3xl mb-4"
              style={{ fontFamily: "var(--font-display, Georgia, serif)", color: "var(--text-page)", fontWeight: 400 }}
            >
              The Bazaar
            </h2>
            <div className="flex justify-center gap-10">
              <div>
                <p className="text-xl font-semibold" style={{ color: "#f87171", fontFamily: "var(--font-mono, monospace)" }}>
                  {"❤".repeat(Math.min(run.livesRemaining, 6))}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Lives</p>
              </div>
              <div>
                <p className="text-xl font-semibold" style={{ color: "#d6a04a", fontFamily: "var(--font-mono, monospace)" }}>
                  ${run.runMoney}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Run $</p>
              </div>
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
            className="w-full px-6 py-3 rounded-xl font-semibold text-base disabled:opacity-50 transition-opacity hover:opacity-80"
            style={{ background: "#d6a04a", color: "#1a0d12" }}
          >
            {busy ? "Loading…" : "Continue to map →"}
          </button>
          <Link href="/" className="text-sm text-center transition-opacity hover:opacity-70" style={{ color: "var(--text-muted)" }}>
            ← Exit to home
          </Link>
        </div>
      </main>
    );
  }

  // ── Floor-clear rest stop (after battle/elite) ──────────────────────────────
  if (screen.id === "floor_clear") {
    const { run, floorCategory } = screen;
    const diff = difficultyInfo(run.playerDifficulty);
    return (
      <main className="min-h-screen p-4 md:p-8" style={{ fontFamily: "var(--font-body, system-ui)" }}>
        {AchievementToasts}
        <div className="max-w-2xl mx-auto flex flex-col gap-4">
          <div
            className="rounded-xl p-6 text-center"
            style={{ background: "rgba(214,160,74,0.06)", border: "1px solid rgba(214,160,74,0.35)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#d6a04a" }}>
              Node cleared
            </p>
            <h2
              className="text-3xl mb-4"
              style={{ fontFamily: "var(--font-display, Georgia, serif)", color: "var(--text-page)", fontWeight: 400 }}
            >
              {floorCategory.name}
            </h2>
            <div className="flex justify-center gap-10">
              <div>
                <p className="text-xl font-semibold" style={{ color: "#f87171", fontFamily: "var(--font-mono, monospace)" }}>
                  {"❤".repeat(Math.min(run.livesRemaining, 6))}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Lives</p>
              </div>
              <div>
                <p className="text-xl font-semibold" style={{ color: "#d6a04a", fontFamily: "var(--font-mono, monospace)" }}>
                  ${run.runMoney}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Run $</p>
              </div>
              <div>
                <p className="text-xl font-semibold" style={{ color: diff.color }}>{diff.label}</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Difficulty</p>
              </div>
            </div>
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
            className="w-full px-6 py-3 rounded-xl font-semibold text-base disabled:opacity-50 transition-opacity hover:opacity-80"
            style={{ background: "#d6a04a", color: "#1a0d12" }}
          >
            {busy ? "Loading…" : "Back to map →"}
          </button>
          <Link href="/" className="text-sm text-center transition-opacity hover:opacity-70" style={{ color: "var(--text-muted)" }}>
            ← Exit to home
          </Link>
        </div>
      </main>
    );
  }

  // ── Relic pick ───────────────────────────────────────────────────────────────
  if (screen.id === "relic_pick") {
    const { run, choices } = screen;
    return (
      <main className="min-h-screen p-4 md:p-8 flex items-center justify-center" style={{ fontFamily: "var(--font-body, system-ui)" }}>
        {AchievementToasts}
        <div className="max-w-xl w-full mx-auto flex flex-col gap-6">
          {/* Header */}
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#d6a04a" }}>
              Node Cleared
            </p>
            <h2
              className="text-3xl mb-1"
              style={{ fontFamily: "var(--font-display, Georgia, serif)", color: "var(--text-page)", fontWeight: 400 }}
            >
              Choose a Relic
            </h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Pick one to carry through the rest of your run
            </p>
          </div>

          {/* Relic cards */}
          <div className="flex flex-col gap-3">
            {choices.map((relic) => (
              <button
                key={relic.id}
                onClick={() => pickRelicAction(relic.id)}
                disabled={busy}
                className="text-left p-5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(214,160,74,0.22)" }}
              >
                <div className="flex items-start gap-4">
                  <span className="text-4xl leading-none shrink-0">{relic.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base mb-1" style={{ color: "var(--text-page)" }}>
                      {relic.name}
                    </p>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>{relic.description}</p>
                    <p
                      className="text-xs mt-1 italic"
                      style={{ color: "var(--text-muted)", opacity: 0.6, fontFamily: "var(--font-display, serif)" }}
                    >
                      {relic.detail}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Stats + skip */}
          <div className="flex items-center justify-between px-1">
            <div className="flex gap-5 text-sm">
              <span style={{ color: "#f87171", fontFamily: "var(--font-mono, monospace)" }}>
                {"❤".repeat(Math.min(run.livesRemaining, 6))}
              </span>
              <span style={{ color: "#d6a04a", fontFamily: "var(--font-mono, monospace)" }}>
                ${run.runMoney}
              </span>
            </div>
            <button
              onClick={skipRelicPick}
              disabled={busy}
              className="text-sm transition-opacity hover:opacity-70 disabled:opacity-40"
              style={{ color: "var(--text-muted)" }}
            >
              Skip →
            </button>
          </div>

          {busy && (
            <p className="text-center text-sm animate-pulse" style={{ color: "var(--text-muted)" }}>
              Claiming relic…
            </p>
          )}
        </div>
      </main>
    );
  }

  // ── Wave complete ─────────────────────────────────────────────────────────────
  if (screen.id === "wave_complete") {
    const { run } = screen;
    return (
      <main className="min-h-screen p-4 md:p-8 flex items-center justify-center" style={{ fontFamily: "var(--font-body, system-ui)" }}>
        {AchievementToasts}
        <div className="max-w-md w-full mx-auto flex flex-col gap-6">
          {/* Trophy card */}
          <div
            className="rounded-xl p-8 text-center"
            style={{ background: "rgba(214,160,74,0.06)", border: "1px solid rgba(214,160,74,0.4)" }}
          >
            <div className="text-5xl mb-4">🏆</div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#d6a04a" }}>
              Wave {run.wave} Complete!
            </p>
            <h2
              className="text-3xl mb-2"
              style={{ fontFamily: "var(--font-display, Georgia, serif)", color: "var(--text-page)", fontWeight: 400 }}
            >
              Map Cleared
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>What will you do?</p>
            <div className="flex justify-center gap-10">
              <div>
                <p className="text-xl font-semibold" style={{ color: "#f87171", fontFamily: "var(--font-mono, monospace)" }}>
                  {"❤".repeat(Math.min(run.livesRemaining, 6))}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Lives</p>
              </div>
              <div>
                <p className="text-xl font-semibold" style={{ color: "#d6a04a", fontFamily: "var(--font-mono, monospace)" }}>
                  ${run.runMoney}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Run $</p>
              </div>
              <div>
                <p className="text-xl font-semibold" style={{ color: "#93c5fd", fontFamily: "var(--font-mono, monospace)" }}>
                  {run.score}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Score</p>
              </div>
            </div>
          </div>

          {/* Choice buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={advanceWaveAction}
              disabled={busy}
              className="w-full px-6 py-4 rounded-xl font-bold text-base disabled:opacity-50 transition-opacity hover:opacity-80"
              style={{ background: "#d6a04a", color: "#1a0d12" }}
            >
              {busy ? "Loading…" : `⚔ Progress to Wave ${run.wave + 1}`}
            </button>
            <p className="text-center text-xs -mt-1" style={{ color: "var(--text-muted)" }}>
              Bigger map · harder questions · more questions per battle
            </p>

            <button
              onClick={cashOutAction}
              disabled={busy}
              className="w-full px-6 py-4 rounded-xl font-bold text-base disabled:opacity-50 transition-all mt-1"
              style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80" }}
            >
              {busy ? "Loading…" : `✦ Cash Out — keep $${run.runMoney}`}
            </button>
            <p className="text-center text-xs -mt-1" style={{ color: "var(--text-muted)" }}>
              Convert all ${run.runMoney} to collection money · end the run
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ── Active encounter ─────────────────────────────────────────────────────────
  const { data: enc } = screen as { id: "encounter"; data: EncounterData };
  const { run, floorCategory, monsterTitle, question, encounterIndex, totalEncountersThisFloor } = enc;
  const hasMulligan = run.freeMulligan > 0;
  const canSkip = hasMulligan || run.runMoney >= run.skipCostRun;

  // ── Boss intro ──────────────────────────────────────────────────────────────
  if (enc.boss && encounterIndex === 0 && !bossIntroAcked) {
    const boss = enc.boss;
    return (
      <main
        className="min-h-screen p-4 md:p-8 flex items-center justify-center"
        style={{ fontFamily: "var(--font-body, system-ui)" }}
      >
        <div className="max-w-lg w-full mx-auto flex flex-col gap-6">
          <div
            className="rounded-xl p-8 text-center"
            style={{ background: "rgba(154,28,43,0.08)", border: "1px solid rgba(154,28,43,0.4)" }}
          >
            <div className="text-6xl mb-4">{boss.icon}</div>
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: "#f87171" }}
            >
              ☠ Boss Encounter · {floorCategory.name}
            </p>
            <h2
              className="text-3xl mb-1"
              style={{ fontFamily: "var(--font-display, Georgia, serif)", color: "var(--text-page)", fontWeight: 400 }}
            >
              {boss.name}
            </h2>
            <p
              className="text-sm mb-6 italic"
              style={{ color: "var(--text-muted)", fontFamily: "var(--font-display, serif)" }}
            >
              {boss.title}
            </p>
            <blockquote
              className="pl-4 text-sm leading-relaxed italic text-left mb-6"
              style={{
                borderLeft: "2px solid rgba(154,28,43,0.5)",
                color: "var(--text-page)",
                fontFamily: "var(--font-display, Georgia, serif)",
              }}
            >
              &ldquo;{boss.dialogue}&rdquo;
            </blockquote>
            <div
              className="flex justify-center gap-10 mb-6 pt-4"
              style={{ borderTop: "1px solid rgba(214,160,74,0.15)" }}
            >
              <div>
                <p className="text-xl font-semibold" style={{ color: "#f87171", fontFamily: "var(--font-mono, monospace)" }}>
                  {"❤".repeat(Math.min(run.livesRemaining, 6))}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Lives</p>
              </div>
              <div>
                <p className="text-xl font-semibold" style={{ color: "#d6a04a", fontFamily: "var(--font-mono, monospace)" }}>
                  ${run.runMoney}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Run $</p>
              </div>
              <div>
                <p className="text-xl font-semibold" style={{ color: "var(--text-page)", fontFamily: "var(--font-mono, monospace)" }}>
                  {totalEncountersThisFloor}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Questions</p>
              </div>
            </div>
            <button
              onClick={() => setBossIntroAcked(true)}
              className="w-full px-6 py-4 rounded-xl font-bold text-base transition-opacity hover:opacity-80"
              style={{ background: "#9a1c2b", color: "#ecdab4" }}
            >
              ⚔ Begin Battle
            </button>
          </div>
          <Link
            href="/"
            className="text-sm text-center transition-opacity hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
          >
            ← Exit to home
          </Link>
        </div>
      </main>
    );
  }

  // ── Answer letter labels A/B/C/D ─────────────────────────────────────────────
  const OPTION_LABELS = ["A", "B", "C", "D"];

  return (
    <main className="min-h-screen p-4 md:p-6 flex flex-col gap-4" style={{ fontFamily: "var(--font-body, system-ui)" }}>
      {AchievementToasts}

      {/* HUD bar */}
      <div className="max-w-5xl w-full mx-auto">
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
          relics={run.relics}
          comboCount={run.comboCount}
        />
      </div>

      {/* Main encounter body: question card + monster panel */}
      <div className="max-w-5xl w-full mx-auto flex flex-col md:flex-row gap-4 flex-1">

        {/* ── Left: question card ─────────────────────────────────────── */}
        <div
          className="flex-1 flex flex-col rounded-xl p-6"
          style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(214,160,74,0.22)" }}
        >
          {/* Category label */}
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "#d6a04a" }}
          >
            {floorCategory.name}
          </p>

          {/* Question text */}
          <h2
            className="text-xl leading-snug mb-6 flex-1"
            style={{
              fontFamily: "var(--font-display, Georgia, serif)",
              color: "var(--text-page)",
              fontWeight: 400,
            }}
          >
            {question.text}
          </h2>

          {/* Answer options with gilt letter badges */}
          <div className="flex flex-col gap-2.5">
            {question.options.map((opt, i) => {
              const eliminated       = question.eliminatedIndices?.includes(i) ?? false;
              const isCorrectOption  = answerResult !== null && i === answerResult.correctIndex;
              const isWrongSelection = answerResult !== null && !answerResult.correct && i === answerResult.selectedIndex;

              // Background / border / text color based on state
              let bgColor      = "rgba(255,255,255,0.04)";
              let borderColor  = "rgba(214,160,74,0.2)";
              let textColor    = "var(--text-page)";
              let badgeBg      = "rgba(214,160,74,0.15)";
              let badgeColor   = "#d6a04a";
              let lineThrough  = false;

              if (eliminated) {
                bgColor = "rgba(0,0,0,0.2)";
                borderColor = "rgba(255,255,255,0.06)";
                textColor = "rgba(184,168,130,0.3)";
                badgeBg = "rgba(255,255,255,0.04)";
                badgeColor = "rgba(184,168,130,0.3)";
                lineThrough = true;
              } else if (isCorrectOption) {
                bgColor = "rgba(74,222,128,0.1)";
                borderColor = "rgba(74,222,128,0.5)";
                textColor = "#bbf7d0";
                badgeBg = "rgba(74,222,128,0.2)";
                badgeColor = "#4ade80";
              } else if (isWrongSelection) {
                bgColor = "rgba(248,113,113,0.1)";
                borderColor = "rgba(248,113,113,0.5)";
                textColor = "#fecaca";
                badgeBg = "rgba(248,113,113,0.2)";
                badgeColor = "#f87171";
              }

              return (
                <button
                  key={i}
                  onClick={() => submitAnswer(i)}
                  disabled={busy || eliminated || answerResult !== null}
                  className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg transition-all disabled:cursor-not-allowed"
                  style={{
                    background: bgColor,
                    border: `1px solid ${borderColor}`,
                    textDecoration: lineThrough ? "line-through" : undefined,
                  }}
                >
                  {/* Gilt letter badge */}
                  <span
                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: badgeBg,
                      border: `1px solid ${badgeColor}40`,
                      color: badgeColor,
                      fontFamily: "var(--font-mono, monospace)",
                    }}
                  >
                    {OPTION_LABELS[i]}
                  </span>
                  <span className="text-sm leading-snug" style={{ color: textColor }}>
                    {opt}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Answer feedback */}
          {answerResult !== null && (
            <div className="mt-4">
              {answerResult.correct ? (
                showCorrectExpl && answerResult.explanation ? (
                  <div
                    className="rounded-lg p-4 flex flex-col gap-3"
                    style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.3)" }}
                  >
                    <p className="text-sm font-semibold" style={{ color: "#4ade80" }}>✓ Correct!</p>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                      💡 {answerResult.explanation}
                    </p>
                    <button
                      onClick={continueAfterCorrect}
                      disabled={busy}
                      className="self-end px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-opacity hover:opacity-80"
                      style={{ background: "rgba(255,255,255,0.08)", color: "var(--text-page)" }}
                    >
                      Next →
                    </button>
                  </div>
                ) : (
                  <p className="text-sm font-semibold animate-pulse" style={{ color: "#4ade80" }}>
                    ✓ Correct! Loading next question…
                  </p>
                )
              ) : (
                <div
                  className="rounded-lg p-4 flex flex-col gap-3"
                  style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)" }}
                >
                  <p className="text-sm font-semibold" style={{ color: "#f87171" }}>
                    {answerResult.shieldAbsorbed
                      ? "✗ Wrong — 🛡 shield absorbed the hit."
                      : "✗ Wrong — one life lost."}
                  </p>
                  {answerResult.explanation ? (
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                      💡 {answerResult.explanation}
                    </p>
                  ) : (
                    <p
                      className="text-sm italic"
                      style={{ color: "var(--text-muted)", opacity: 0.5, fontFamily: "var(--font-display, serif)" }}
                    >
                      No explanation available.
                    </p>
                  )}
                  <button
                    onClick={continueAfterWrong}
                    disabled={busy}
                    className="self-end px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-opacity hover:opacity-80"
                    style={{ background: "rgba(255,255,255,0.08)", color: "var(--text-page)" }}
                  >
                    Got it →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Skip footer */}
          {answerResult === null && (
            <div
              className="mt-4 pt-3 flex justify-between items-center"
              style={{ borderTop: "1px solid rgba(214,160,74,0.12)" }}
            >
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {hasMulligan ? `Free skip · ${run.freeMulligan} remaining` : `Skip · costs $${run.skipCostRun}`}
              </span>
              <button
                onClick={payToSkip}
                disabled={!canSkip || busy}
                className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-opacity hover:opacity-80"
                style={{ background: "rgba(255,255,255,0.07)", color: "var(--text-muted)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                {hasMulligan ? "Skip free" : `Pay $${run.skipCostRun}`}
              </button>
            </div>
          )}
        </div>

        {/* ── Right: monster panel ────────────────────────────────────── */}
        <div
          className="md:w-64 flex flex-col rounded-xl p-5 gap-4"
          style={{ background: "rgba(26,13,18,0.6)", border: "1px solid rgba(154,28,43,0.3)" }}
        >
          {/* Monster art placeholder */}
          <div
            className="w-full aspect-square rounded-lg flex items-center justify-center"
            style={{ background: "rgba(154,28,43,0.08)", border: "1px solid rgba(154,28,43,0.2)" }}
          >
            <Image
              src="/logo.png"
              alt="Monster"
              width={80}
              height={80}
              style={{ imageRendering: "pixelated", opacity: 0.7 }}
            />
          </div>

          {/* Monster title + flavor */}
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-1"
              style={{ color: "#f87171", opacity: 0.7 }}
            >
              {enc.boss ? "☠ Boss" : "✠ Monster"}
            </p>
            <p
              className="text-base font-semibold leading-snug"
              style={{ fontFamily: "var(--font-display, Georgia, serif)", color: "var(--text-page)" }}
            >
              {monsterTitle}
            </p>
          </div>

          {/* Divider */}
          <hr style={{ border: "none", borderTop: "1px solid rgba(214,160,74,0.15)" }} />

          {/* Reward callout */}
          <div className="flex flex-col gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
            <div className="flex justify-between">
              <span>Correct</span>
              <span style={{ color: "#d6a04a", fontFamily: "var(--font-mono, monospace)" }}>
                +${run.moneyPerCorrectRun ?? 15}
                {run.moneyMultiplier > 1 && <span style={{ color: "#fbbf24" }}> ×2</span>}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Wrong</span>
              <span style={{ color: "#f87171" }}>1 life</span>
            </div>
            {(run.shieldCount ?? 0) > 0 && (
              <div className="flex justify-between">
                <span style={{ color: "#60a5fa" }}>🛡 Shield</span>
                <span style={{ color: "#60a5fa" }}>active</span>
              </div>
            )}
          </div>

          {/* Exit link */}
          <div className="mt-auto pt-2" style={{ borderTop: "1px solid rgba(214,160,74,0.08)" }}>
            <Link
              href="/"
              className="text-xs transition-opacity hover:opacity-70 block text-center"
              style={{ color: "var(--text-muted)" }}
            >
              ← Exit
            </Link>
          </div>
        </div>
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
    <div
      className="rounded-xl p-4"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(214,160,74,0.18)" }}
    >
      <h3
        className="text-xs font-semibold uppercase tracking-widest mb-3"
        style={{ color: "#d6a04a" }}
      >
        ❖ Wares
      </h3>

      {peekResult && (
        <p className="text-sm font-medium mb-3" style={{ color: "#d6a04a" }}>
          Next node: <span className="font-bold">{peekResult}</span>
        </p>
      )}
      {shopError && (
        <p className="text-sm mb-3" style={{ color: "#f87171" }}>{shopError}</p>
      )}
      {(run.relics.includes("bargain-hunter") || run.runClass === "merchant") && (
        <p className="text-xs font-medium mb-3" style={{ color: "#4ade80" }}>💰 20% discount active</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {SHOP_ITEMS.map((item) => {
          const isDisabled = item.disabled?.(run) ?? false;
          const hasDiscount = run.relics.includes("bargain-hunter") || run.runClass === "merchant";
          const effectivePrice = hasDiscount ? Math.floor(item.price * 0.8) : item.price;
          const canAfford = run.runMoney >= effectivePrice;

          return (
            <button
              key={item.id}
              onClick={() => onBuy(item.id)}
              disabled={isDisabled || !canAfford || buying}
              className="text-left p-3 rounded-lg transition-all disabled:opacity-35 disabled:cursor-not-allowed"
              style={{
                background: "rgba(255,255,255,0.035)",
                border: "1px solid rgba(214,160,74,0.15)",
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm" style={{ color: "var(--text-page)" }}>{item.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{item.desc}</p>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className="font-bold text-sm"
                    style={{ color: "#d6a04a", fontFamily: "var(--font-mono, monospace)" }}
                  >
                    ${effectivePrice}
                  </span>
                  {hasDiscount && (
                    <span
                      className="block text-[10px] line-through"
                      style={{ color: "var(--text-muted)", opacity: 0.5 }}
                    >
                      ${item.price}
                    </span>
                  )}
                </div>
              </div>
              {isDisabled && (
                <p className="text-xs mt-1" style={{ color: "#d6a04a", opacity: 0.5 }}>Active</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
