import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// ── Roman-numeral helper ──────────────────────────────────────────
function toRoman(n: number): string {
  const map: [number, string][] = [
    [1000,"M"],[900,"CM"],[500,"D"],[400,"CD"],[100,"C"],[90,"XC"],
    [50,"L"],[40,"XL"],[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"],
  ];
  let result = "";
  for (const [val, sym] of map) { while (n >= val) { result += sym; n -= val; } }
  return result;
}

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  let collectionMoney = 0;
  let activeRun: { id: string; currentFloor: number; wave: number; runMoney: number; livesRemaining: number } | null = null;
  let runsPlayed = 0;
  let bestWave = 0;

  if (session?.user?.id) {
    const [user, run, stats] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { collectionMoney: true },
      }),
      prisma.run.findFirst({
        where: { userId: session.user.id, endedAt: null },
        orderBy: { startedAt: "desc" },
        select: { id: true, currentFloor: true, wave: true, runMoney: true, livesRemaining: true },
      }),
      prisma.run.aggregate({
        where: { userId: session.user.id, endedAt: { not: null } },
        _count: { id: true },
        _max:   { wave: true },
      }),
    ]);
    collectionMoney = user?.collectionMoney ?? 0;
    activeRun       = run ?? null;
    runsPlayed      = stats._count.id;
    bestWave        = stats._max.wave ?? 0;
  }

  const displayName = session?.user?.name ?? session?.user?.email ?? "Adventurer";

  // ── Cards ────────────────────────────────────────────────────────
  const cards = [
    {
      href:    "/run",
      glyph:   "⚔",
      title:   "Begin a New Run",
      tagline: "Descend into the dungeon. Answer or die.",
      accent:  "#d6a04a",
      authed:  true,
    },
    {
      href:    "/progress",
      glyph:   "✦",
      title:   "My Progress",
      tagline: "Track your floors conquered and lore mastered.",
      accent:  "#7c9bbf",
      authed:  true,
    },
    {
      href:    "/shop",
      glyph:   "❖",
      title:   "The Bazaar",
      tagline: "Spend collection money on powerful relics.",
      accent:  "#22c55e",
      authed:  true,
    },
    {
      href:    "/achievements",
      glyph:   "📜",
      title:   "The Compendium",
      tagline: "Browse your earned achievements and lore.",
      accent:  "#c084fc",
      authed:  true,
    },
  ];

  const unauthCards = [
    {
      href:    "/auth/signin",
      glyph:   "⚔",
      title:   "Sign In",
      tagline: "Return to your ongoing campaign.",
      accent:  "#d6a04a",
    },
    {
      href:    "/auth/register",
      glyph:   "✦",
      title:   "Create Account",
      tagline: "Begin your journey through the dungeon.",
      accent:  "#22c55e",
    },
    {
      href:    "/settings",
      glyph:   "⚙",
      title:   "Settings",
      tagline: "Adjust your visual preferences.",
      accent:  "#b8a882",
    },
  ];

  const shownCards = session ? cards : unauthCards;

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ fontFamily: "var(--font-body, system-ui, sans-serif)" }}
    >
      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <nav
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="Logo"
            width={28}
            height={28}
            style={{ imageRendering: "pixelated" }}
          />
          <span
            className="text-sm font-semibold tracking-widest uppercase"
            style={{ color: "var(--text-muted)", letterSpacing: "0.12em" }}
          >
            Trivia Time
          </span>
        </div>

        {session ? (
          <div className="flex items-center gap-5">
            <span
              className="flex items-center gap-1.5 text-sm"
              style={{ fontFamily: "var(--font-mono, monospace)", color: "var(--gold)" }}
            >
              <span style={{ color: "var(--text-muted)" }}>◈</span>
              {collectionMoney.toLocaleString()}
            </span>
            <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>{displayName}</span>
            <Link
              href="/api/auth/signout"
              className="text-xs transition-opacity hover:opacity-70"
              style={{ color: "var(--text-muted)" }}
            >
              Sign out
            </Link>
          </div>
        ) : (
          <Link
            href="/auth/signin"
            className="text-sm transition-opacity hover:opacity-80"
            style={{ color: "var(--gold)" }}
          >
            Sign in
          </Link>
        )}
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="flex flex-col items-center justify-center flex-1 text-center px-6 pt-14 pb-10">
        {/* Eyebrow */}
        <p
          className="text-xs tracking-[0.22em] uppercase mb-6"
          style={{ color: "var(--gold)", fontFamily: "var(--font-body, system-ui)" }}
        >
          The Compendium of Monsters &amp; Memory
        </p>

        {/* Display title */}
        <h1
          className="leading-none mb-8 select-none"
          style={{
            fontFamily: "var(--font-display, Georgia, serif)",
            fontSize: "clamp(4rem, 12vw, 7.5rem)",
            color: "var(--text-page)",
            fontWeight: 300,
          }}
        >
          Trivia <em style={{ fontStyle: "italic", color: "var(--gold)" }}>Time</em>
        </h1>

        {/* Gold divider */}
        <div className="flex items-center gap-3 mb-10" style={{ width: "min(320px, 80vw)" }}>
          <hr className="flex-1" style={{ border: "none", borderTop: "1px solid var(--gold-dim)" }} />
          <span style={{ color: "var(--gold-dim)", fontSize: "0.75rem" }}>◈</span>
          <hr className="flex-1" style={{ border: "none", borderTop: "1px solid var(--gold-dim)" }} />
        </div>

        {/* Active run banner */}
        {activeRun && (
          <div
            className="w-full max-w-xl mx-auto mb-8 rounded-xl px-5 py-4 flex items-center justify-between gap-4"
            style={{ background: "rgba(214,160,74,0.08)", border: "1px solid rgba(214,160,74,0.4)" }}
          >
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <span style={{ color: "var(--gold)", fontWeight: 600 }}>⚔ Active Run</span>
              <span style={{ color: "var(--text-muted)" }}>
                Wave {activeRun.wave} · Floor {activeRun.currentFloor}
              </span>
              <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                ${activeRun.runMoney}
              </span>
              <span style={{ color: "#f87171" }}>
                {"❤".repeat(Math.min(activeRun.livesRemaining, 6))}
              </span>
            </div>
            <Link
              href={`/run/${activeRun.id}`}
              className="shrink-0 px-4 py-1.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ background: "var(--gold)", color: "var(--ink)" }}
            >
              Continue →
            </Link>
          </div>
        )}

        {/* Nav cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl mx-auto mb-12">
          {shownCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="flex flex-col items-start gap-2 p-5 rounded-xl transition-all duration-200 text-left group"
              style={{
                background: "var(--parch-dim)",
                border: "1px solid var(--border)",
              }}
            >
              <span className="text-2xl leading-none" style={{ color: card.accent }}>
                {card.glyph}
              </span>
              <p
                className="text-sm font-semibold leading-tight"
                style={{ color: "var(--text-page)", fontFamily: "var(--font-display, serif)" }}
              >
                {card.title}
              </p>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "var(--text-muted)" }}
              >
                {card.tagline}
              </p>
            </Link>
          ))}
        </div>

        {/* Settings link */}
        {session && (
          <Link
            href="/settings"
            className="text-xs transition-opacity hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
          >
            ⚙ Settings
          </Link>
        )}
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer
        className="text-center pb-8 px-6 flex flex-col items-center gap-2"
        style={{ borderTop: "1px solid var(--border)", paddingTop: "1.5rem" }}
      >
        {session && runsPlayed > 0 && (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            <span className="font-mono-nums">{runsPlayed}</span> runs played
            {bestWave > 0 && (
              <> · best wave&nbsp;
                <span className="font-mono-nums">{toRoman(bestWave)}</span>
              </>
            )}
          </p>
        )}
        <p
          className="text-xs italic max-w-xs"
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-display, Georgia, serif)",
            opacity: 0.6,
          }}
        >
          &ldquo;Knowledge is the only weapon that grows stronger with use.&rdquo;
        </p>
      </footer>
    </main>
  );
}
