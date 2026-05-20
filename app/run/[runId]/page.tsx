"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { RunHUD } from "@/components/RunHUD";

type EncounterState = {
  run: { id: string; livesRemaining: number; runMoney: number; currentFloor: number; score: number; endedAt: string | null };
  floorCategory: { id: string; slug: string; name: string };
  monsterTitle: string;
  encounterIndex: number;
  totalEncountersThisFloor: number;
  question: { id: string; text: string; options: string[] };
};

const SKIP_COST = 28;

export default function RunEncounterPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const runId = params.runId as string;

  const [encounter, setEncounter] = useState<EncounterState | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [loading, setLoading] = useState(true);
  const [answering, setAnswering] = useState(false);
  const [lastResult, setLastResult] = useState<{ correct: boolean } | null>(null);

  const fetchEncounter = useCallback(async () => {
    if (!runId) return;
    const res = await fetch(`/api/run/${runId}`);
    const data = await res.json();
    if (data.gameOver) {
      setGameOver(true);
      setEncounter(null);
      return;
    }
    if (data.run) {
      setEncounter(data);
      setLastResult(null);
    }
    setLoading(false);
  }, [runId]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/run");
      return;
    }
    if (status === "authenticated" && runId) {
      fetchEncounter();
    }
  }, [status, runId, fetchEncounter, router]);

  async function submitAnswer(selectedIndex: number) {
    if (!encounter || answering) return;
    setAnswering(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/run/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: encounter.run.id,
          questionId: encounter.question.id,
          selectedIndex,
        }),
      });
      const result = await res.json();

      if (result.next === "game_over") {
        router.push(`/run/${runId}/game-over`);
        return;
      }

      setLastResult({ correct: result.correct });
      if (result.run) {
        setEncounter(result.run);
      } else if (result.next === "floor_complete") {
        router.push(`/run/${runId}/game-over`);
      }
    } finally {
      setAnswering(false);
    }
  }

  async function payToSkip() {
    if (!encounter || answering || encounter.run.runMoney < SKIP_COST) return;
    setAnswering(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/run/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: encounter.run.id, questionId: encounter.question.id }),
      });
      const result = await res.json();
      if (result.run) setEncounter(result.run);
      else if (result.next === "floor_complete") router.push(`/run/${runId}/game-over`);
    } finally {
      setAnswering(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-zinc-400">
        Loading run...
      </main>
    );
  }

  if (gameOver) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 text-zinc-100">
        <h1 className="text-2xl font-bold mb-4">Game Over</h1>
        <Link href={`/run/${runId}/game-over`} className="text-amber-500 hover:underline">View run summary</Link>
        <Link href="/run" className="mt-4 text-zinc-500 hover:underline">Start a new run</Link>
      </main>
    );
  }

  if (!encounter) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 text-zinc-100">
        <p className="text-zinc-400 mb-4">No encounter or run complete.</p>
        <Link href="/run" className="text-amber-500 hover:underline">Start a new run</Link>
      </main>
    );
  }

  const { run, floorCategory, monsterTitle, question, encounterIndex, totalEncountersThisFloor } = encounter;
  const canSkip = run.runMoney >= SKIP_COST;

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
        />

        <div className="rounded-xl border border-amber-600/50 bg-zinc-900/50 p-6">
          <p className="text-amber-400/90 text-sm font-medium mb-2">Trivia monster — {monsterTitle}</p>
          <h2 className="text-xl font-semibold mb-6">{question.text}</h2>

          {lastResult !== null && (
            <p className={`mb-4 font-medium ${lastResult.correct ? "text-green-400" : "text-red-400"}`}>
              {lastResult.correct ? "Correct!" : "Wrong — one life lost."}
            </p>
          )}

          <div className="flex flex-col gap-3">
            {question.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => submitAnswer(i)}
                disabled={answering}
                className="w-full text-left px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-600 hover:border-amber-500/50 hover:bg-zinc-700/80 disabled:opacity-50 transition"
              >
                {opt}
              </button>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-700 flex justify-between items-center">
            <span className="text-zinc-500 text-sm">Skip this question (no life lost)</span>
            <button
              onClick={payToSkip}
              disabled={!canSkip || answering}
              className="px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Pay ${SKIP_COST} to skip
            </button>
          </div>
        </div>

        <Link href="/" className="text-zinc-500 text-sm hover:underline">Exit to home</Link>
      </div>
    </main>
  );
}
