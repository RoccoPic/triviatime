"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getClassById } from "@/lib/class-defs";
import { getRelicById } from "@/lib/relics";

type RunSummary = {
  score: number;
  currentFloor: number;
  runMoney: number;
  wave: number;
  won: boolean | null;
  runClass: string;
  livesRemaining: number;
  lowestLives: number;
  relics: string[];
  startedAt: string;
  endedAt: string | null;
  correct: number;
  wrong: number;
  skipped: number;
};

function duration(start: string, end: string | null): string {
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
  const mins  = Math.floor(ms / 60_000);
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `${hours}h ${mins % 60}m`;
  if (mins  >= 1) return `${mins}m`;
  return "< 1m";
}

export default function GameOverPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const runId = params.runId as string;
  const [run, setRun] = useState<RunSummary | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/auth/signin"); return; }
    if (runId && status === "authenticated") {
      fetch(`/api/run/${runId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.run) setRun(d.run);
        })
        .catch(() => {});
    }
  }, [runId, status, router]);

  const cls      = run ? getClassById(run.runClass) : null;
  const won      = run?.won === true;
  const lost     = run?.won === false;
  const accuracy = run && (run.correct + run.wrong) > 0
    ? Math.round((run.correct / (run.correct + run.wrong)) * 100)
    : null;
  const collectionEarned = run ? Math.floor(run.runMoney * 0.5) : 0;

  return (
    <main className="min-h-screen p-4 md:p-8 flex items-start justify-center pt-12">
      <div className="max-w-lg w-full flex flex-col gap-5">

        {/* ── Outcome header ──────────────────────────────────────────── */}
        <div className={`rounded-2xl border p-6 text-center ${
          won  ? "border-green-500/50  bg-green-950/30"
               : lost ? "border-red-500/40 bg-red-950/20"
               : "border-zinc-700/50 bg-zinc-900/40"
        }`}>
          <div className="text-5xl mb-3">
            {won ? "🏆" : lost ? "💀" : "🎮"}
          </div>
          <h1 className={`text-3xl font-bold mb-1 ${
            won ? "text-green-300" : lost ? "text-red-300" : "text-zinc-100"
          }`}>
            {won ? "Victory!" : lost ? "Defeated" : "Run Ended"}
          </h1>
          {run && (
            <p className="text-zinc-400 text-sm">
              {cls?.icon} {cls?.name ?? run.runClass}
              {run.wave > 1 && ` · Wave ${run.wave}`}
              {" · "}
              {duration(run.startedAt, run.endedAt)}
            </p>
          )}
        </div>

        {/* ── Stats grid ──────────────────────────────────────────────── */}
        {run && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/50 p-4 text-center">
                <p className="text-2xl font-bold text-amber-400">{run.score}</p>
                <p className="text-zinc-400 text-xs uppercase tracking-wide mt-1">Score</p>
              </div>
              <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/50 p-4 text-center">
                <p className="text-2xl font-bold text-zinc-100">{run.currentFloor}</p>
                <p className="text-zinc-400 text-xs uppercase tracking-wide mt-1">Floors</p>
              </div>
              <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/50 p-4 text-center">
                <p className="text-2xl font-bold text-red-400">{run.livesRemaining}</p>
                <p className="text-zinc-400 text-xs uppercase tracking-wide mt-1">Lives left</p>
              </div>
            </div>

            {/* Answer stats */}
            <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/50 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
                Answers
              </h3>
              <div className="flex items-center justify-around">
                <div className="text-center">
                  <p className="text-xl font-bold text-green-400">{run.correct}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">Correct</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-red-400">{run.wrong}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">Wrong</p>
                </div>
                {run.skipped > 0 && (
                  <div className="text-center">
                    <p className="text-xl font-bold text-zinc-400">{run.skipped}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">Skipped</p>
                  </div>
                )}
                {accuracy !== null && (
                  <div className="text-center">
                    <p className={`text-xl font-bold ${
                      accuracy >= 80 ? "text-emerald-400" :
                      accuracy >= 60 ? "text-yellow-400" : "text-red-400"
                    }`}>{accuracy}%</p>
                    <p className="text-zinc-500 text-xs mt-0.5">Accuracy</p>
                  </div>
                )}
              </div>
            </div>

            {/* Collection money */}
            {collectionEarned > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-900/10 p-4 flex items-center justify-between">
                <div>
                  <p className="text-zinc-200 text-sm font-medium">Collection earned</p>
                  <p className="text-zinc-400 text-xs mt-0.5">50% of your run money (${run.runMoney})</p>
                </div>
                <p className="text-amber-400 text-2xl font-bold">+${collectionEarned}</p>
              </div>
            )}

            {/* Relics */}
            {run.relics.length > 0 && (
              <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/50 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
                  Relics collected ({run.relics.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {run.relics.map((rid) => {
                    const r = getRelicById(rid);
                    return r ? (
                      <div key={rid} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800/70 border border-zinc-700/50">
                        <span className="text-lg leading-none">{r.icon}</span>
                        <span className="text-zinc-300 text-xs font-medium">{r.name}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Actions ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2 pt-1">
          <Link
            href="/run"
            className="w-full text-center px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold text-white transition"
          >
            Play again →
          </Link>
          <div className="flex gap-2">
            <Link
              href="/progress"
              className="flex-1 text-center px-4 py-2.5 rounded-xl border border-zinc-600 hover:border-zinc-500 text-sm font-medium transition"
            >
              My progress
            </Link>
            <Link
              href="/achievements"
              className="flex-1 text-center px-4 py-2.5 rounded-xl border border-zinc-600 hover:border-zinc-500 text-sm font-medium transition"
            >
              Achievements
            </Link>
          </div>
          <Link href="/" className="text-center text-sm hover:underline mt-1" style={{ color: "var(--text-muted)" }}>
            Home
          </Link>
        </div>

      </div>
    </main>
  );
}
