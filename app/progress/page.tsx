"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getClassById } from "@/lib/class-defs";
import { getRelicById } from "@/lib/relics";

// ── Types ─────────────────────────────────────────────────────────────────────

type CareerStats = {
  totalRuns: number;
  wins: number;
  winRate: number;
  bestScore: number;
  highestWave: number;
  bestRunMoney: number;
  bestClass: string | null;
};

type RunRecord = {
  id: string;
  score: number;
  floor: number;
  wave: number;
  won: boolean | null;
  runClass: string;
  livesRemaining: number;
  relics: string[];
  runMoney: number;
  startedAt: string;
  endedAt: string | null;
  correct: number;
  wrong: number;
  skipped: number;
};

type CategoryStat = { name: string; correct: number; total: number };

type Progress = {
  collectionMoney: number;
  career: CareerStats;
  byCategory: Record<string, CategoryStat>;
  runs: RunRecord[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)   return "just now";
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 7)   return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function accuracyColor(pct: number): string {
  if (pct >= 90) return "bg-emerald-500";
  if (pct >= 75) return "bg-green-500";
  if (pct >= 50) return "bg-yellow-500";
  return "bg-red-500";
}

function accuracyTextColor(pct: number): string {
  if (pct >= 90) return "text-emerald-400";
  if (pct >= 75) return "text-green-400";
  if (pct >= 50) return "text-yellow-400";
  return "text-red-400";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="flex-1 min-w-0 rounded-xl border border-zinc-700/60 bg-zinc-900/60 px-4 py-3 text-center">
      <p className={`text-2xl font-bold leading-none mb-1 ${accent ?? "text-zinc-100"}`}>
        {value}
      </p>
      <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide leading-none">{label}</p>
      {sub && <p className="text-zinc-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function RunRow({ run }: { run: RunRecord }) {
  const cls = getClassById(run.runClass);
  const isActive = run.endedAt === null;

  const borderColor = isActive
    ? "border-blue-500/40"
    : run.won === true
    ? "border-green-500/40"
    : run.won === false
    ? "border-red-500/40"
    : "border-zinc-700/50";

  const wonBadge = isActive ? (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-900/60 text-blue-300">
      Active
    </span>
  ) : run.won === true ? (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-900/60 text-green-300">
      Win
    </span>
  ) : run.won === false ? (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-900/60 text-red-300">
      Loss
    </span>
  ) : null;

  return (
    <div className={`rounded-xl border bg-zinc-900/40 px-4 py-3 ${borderColor}`}>
      <div className="flex items-start gap-3 flex-wrap">
        {/* Class */}
        <div className="flex items-center gap-1.5 min-w-[80px]">
          <span className="text-xl leading-none">{cls?.icon ?? "🧑"}</span>
          <span className="text-zinc-300 text-xs font-medium">{cls?.name ?? run.runClass}</span>
        </div>

        {/* Win/loss badge */}
        <div className="flex items-center">{wonBadge}</div>

        {/* Score + Wave */}
        <div className="flex items-center gap-3 ml-auto sm:ml-0">
          <div className="text-center">
            <p className="text-lg font-bold text-zinc-100 leading-none">{run.score}</p>
            <p className="text-zinc-500 text-[10px] uppercase tracking-wide">Score</p>
          </div>
          {run.wave > 1 && (
            <div className="text-center">
              <p className="text-lg font-bold text-blue-400 leading-none">{run.wave}</p>
              <p className="text-zinc-500 text-[10px] uppercase tracking-wide">Wave</p>
            </div>
          )}
        </div>

        {/* Answer counts */}
        <div className="flex items-center gap-3 text-sm">
          <span className="text-green-400 font-semibold">✓ {run.correct}</span>
          <span className="text-red-400 font-semibold">✗ {run.wrong}</span>
          {run.skipped > 0 && (
            <span className="text-zinc-400 font-medium">↷ {run.skipped}</span>
          )}
        </div>

        {/* Date */}
        <div className="ml-auto text-right flex flex-col gap-0.5">
          <p className="text-zinc-400 text-xs">{relativeDate(run.startedAt)}</p>
          {run.runMoney > 0 && (
            <p className="text-amber-400/80 text-xs">${run.runMoney}</p>
          )}
        </div>
      </div>

      {/* Relics row */}
      {run.relics.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-zinc-800/60">
          {run.relics.map((rid) => {
            const r = getRelicById(rid);
            return r ? (
              <span
                key={rid}
                title={r.name}
                className="text-base leading-none px-1 py-0.5 rounded bg-zinc-800/70"
              >
                {r.icon}
              </span>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

function CategoryBar({ slug, stat }: { slug: string; stat: CategoryStat }) {
  const pct = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
  const barWidth = `${pct}%`;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-zinc-200 text-sm font-medium">{stat.name}</span>
        <div className="flex items-center gap-3">
          <span className="text-zinc-500 text-xs">{stat.correct} / {stat.total}</span>
          <span className={`font-bold text-sm w-10 text-right ${accuracyTextColor(pct)}`}>{pct}%</span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${accuracyColor(pct)}`}
          style={{ width: barWidth }}
        />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProgressPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [tab, setTab] = useState<"runs" | "categories">("runs");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/progress");
      return;
    }
    if (status === "authenticated") {
      fetch("/api/progress")
        .then((r) => r.json())
        .then(setProgress)
        .catch(() => setProgress(null));
    }
  }, [status, router]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-400 animate-pulse">Loading…</p>
      </main>
    );
  }

  const career     = progress?.career;
  const runs       = progress?.runs ?? [];
  const categories = Object.entries(progress?.byCategory ?? {}).sort(
    ([, a], [, b]) => b.total - a.total
  );

  const bestClassDef = career?.bestClass ? getClassById(career.bestClass) : null;

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-zinc-100">My Progress</h1>
            <p className="text-zinc-400 text-sm mt-1">
              {career?.totalRuns
                ? `${career.totalRuns} run${career.totalRuns !== 1 ? "s" : ""} played`
                : "No runs yet — get out there!"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-4 py-2 rounded-xl border border-amber-500/30 bg-amber-900/20 text-amber-300 font-bold text-sm">
              💰 ${progress?.collectionMoney ?? 0}
            </div>
            <Link
              href="/run"
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 font-semibold text-sm text-white transition"
            >
              New run →
            </Link>
          </div>
        </div>

        {/* ── Career Stats ──────────────────────────────────────────────── */}
        {career && career.totalRuns > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
              Career
            </h2>
            <div className="flex gap-2 flex-wrap">
              <StatCard
                label="Runs"
                value={career.totalRuns}
              />
              <StatCard
                label="Wins"
                value={career.wins}
                accent="text-green-400"
              />
              <StatCard
                label="Win Rate"
                value={`${career.winRate}%`}
                accent={
                  career.winRate >= 60
                    ? "text-green-400"
                    : career.winRate >= 40
                    ? "text-yellow-400"
                    : "text-red-400"
                }
              />
              <StatCard
                label="Best Score"
                value={career.bestScore}
                accent="text-amber-400"
              />
              {career.highestWave > 1 && (
                <StatCard
                  label="Best Wave"
                  value={career.highestWave}
                  accent="text-blue-400"
                />
              )}
              {career.bestRunMoney > 0 && (
                <StatCard
                  label="Most $"
                  value={`$${career.bestRunMoney}`}
                  accent="text-amber-300"
                  sub="in a single run"
                />
              )}
              {bestClassDef && (
                <StatCard
                  label="Best Class"
                  value={`${bestClassDef.icon} ${bestClassDef.name}`}
                  sub="most wins"
                />
              )}
            </div>
          </section>
        )}

        {/* ── Tabs ──────────────────────────────────────────────────────── */}
        <section>
          <div className="flex gap-1 mb-5 border-b border-zinc-800 pb-0">
            {(["runs", "categories"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium transition rounded-t-lg -mb-px border-b-2 ${
                  tab === t
                    ? "border-amber-500 text-amber-400 bg-amber-900/10"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {t === "runs" ? `Run History (${runs.length})` : `Category Stats (${categories.length})`}
              </button>
            ))}
          </div>

          {/* ── Run History tab ──────────────────────────────────────── */}
          {tab === "runs" && (
            <div className="flex flex-col gap-2">
              {runs.length === 0 ? (
                <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/40 p-8 text-center">
                  <p className="text-zinc-500 text-sm">No runs yet. Start one!</p>
                </div>
              ) : (
                runs.map((r) => <RunRow key={r.id} run={r} />)
              )}
            </div>
          )}

          {/* ── Category Stats tab ───────────────────────────────────── */}
          {tab === "categories" && (
            <div className="flex flex-col gap-5">
              {categories.length === 0 ? (
                <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/40 p-8 text-center">
                  <p className="text-zinc-500 text-sm">No answers yet — play a run to see category stats.</p>
                </div>
              ) : (
                <>
                  {/* Legend */}
                  <div className="flex flex-wrap gap-4 text-xs text-zinc-400">
                    <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-500 mr-1.5" />90%+ Mastered</span>
                    <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-500 mr-1.5" />75% Strong</span>
                    <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-yellow-500 mr-1.5" />50% OK</span>
                    <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-500 mr-1.5" />&lt;50% Needs work</span>
                  </div>

                  <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/40 p-5 flex flex-col gap-5">
                    {categories.map(([slug, stat]) => (
                      <CategoryBar key={slug} slug={slug} stat={stat} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </section>

        {/* ── Footer nav ────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-4 text-sm pt-2 border-t border-zinc-800">
          <Link href="/achievements" className="hover:underline text-zinc-300">Achievements</Link>
          <Link href="/shop" className="hover:underline text-zinc-300">Shop</Link>
          <Link href="/settings" className="hover:underline text-zinc-300">Settings</Link>
          <Link href="/" className="hover:underline" style={{ color: "var(--text-muted)" }}>Home</Link>
        </div>

      </div>
    </main>
  );
}
