/**
 * Operation Facts4U
 * ─────────────────
 * Finds a Wikipedia citation for every question in the DB and writes
 * citation + confidence back to each row.
 *
 * Routes:
 *   MATH     → auto-verified (deterministic answers, no external citation)
 *   WIKIPEDIA → search Wikipedia, check correct answer appears in extract
 *   NEEDS_WEB_SEARCH → Wikipedia returned nothing useful; flagged for later
 *
 * Resumable: progress saved to scripts/facts4u-checkpoint.json after each batch.
 *
 * Run: npx tsx scripts/facts4u.ts
 */

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

// ── Config ────────────────────────────────────────────────────────────────────
const CHECKPOINT_PATH = path.join(process.cwd(), "scripts", "facts4u-checkpoint.json");
const BATCH_SIZE      = 10;   // questions per DB write batch
const WIKI_DELAY_MS   = 250;  // ~4 req/sec — polite to Wikipedia

// ── Category routing ─────────────────────────────────────────────────────────
const MATH_SLUGS = new Set([
  "algebra", "calculus", "trigonometry", "math-puzzles",
  "geometry", "math", "statistics",
]);

// Categories where Wikipedia coverage is thin — will try but expect lower hit rate
const LIGHT_COVERAGE_SLUGS = new Set([
  "video-games", "sports", "food",
]);

// ── Checkpoint helpers ────────────────────────────────────────────────────────
function loadCheckpoint(): Set<string> {
  try {
    const raw = fs.readFileSync(CHECKPOINT_PATH, "utf8");
    const ids: string[] = JSON.parse(raw);
    return new Set(ids);
  } catch {
    return new Set();
  }
}

function saveCheckpoint(done: Set<string>) {
  fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify([...done]), "utf8");
}

// ── Wikipedia helpers ─────────────────────────────────────────────────────────

/** Build a tightly focused Wikipedia search query from a question + correct answer */
function buildQuery(questionText: string, correctAnswer: string, categorySlug: string): string {
  // Strip question words and punctuation, keep content words
  const stopWords = new Set([
    "what","which","who","when","where","how","is","are","was","were","the","a","an",
    "of","in","on","at","to","for","with","by","from","that","this","it","its",
    "did","do","does","has","have","had","be","been","being","name","called",
    "known","type","term","first","many","much","most","about","per",
  ]);

  const questionWords = questionText
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))
    .slice(0, 4);

  return [correctAnswer, ...questionWords].join(" ").trim();
}

interface WikiResult {
  title: string;
  url:   string;
  extract: string;
}

async function fetchWikiSummary(title: string): Promise<WikiResult | null> {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "TriviaTime/1.0 (educational trivia game; contact via GitHub)" },
    });
    if (!res.ok) return null;
    const data = await res.json() as any;
    if (data.type === "disambiguation" || !data.extract) return null;
    return {
      title:   data.title,
      url:     data.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
      extract: data.extract ?? "",
    };
  } catch {
    return null;
  }
}

async function searchWikipedia(query: string): Promise<WikiResult | null> {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=3&origin=*`;
    const res = await fetch(searchUrl, {
      headers: { "User-Agent": "TriviaTime/1.0 (educational trivia game; contact via GitHub)" },
    });
    if (!res.ok) return null;
    const data = await res.json() as any;
    const results = data?.query?.search ?? [];
    if (!results.length) return null;

    // Try the top 2 results, return the first that has a useful extract
    for (const hit of results.slice(0, 2)) {
      const summary = await fetchWikiSummary(hit.title);
      if (summary?.extract) return summary;
      await sleep(100);
    }
    return null;
  } catch {
    return null;
  }
}

// ── Confidence scorer ─────────────────────────────────────────────────────────
function scoreConfidence(correctAnswer: string, questionText: string, extract: string): number {
  const ex  = extract.toLowerCase();
  const ans = correctAnswer.toLowerCase();

  // Exact answer string found in extract
  if (ex.includes(ans)) return 0.90;

  // All words of a multi-word answer appear near each other
  const ansWords = ans.split(/\s+/).filter(w => w.length > 2);
  if (ansWords.length > 1) {
    const allPresent = ansWords.every(w => ex.includes(w));
    if (allPresent) return 0.80;
    const partialMatch = ansWords.filter(w => ex.includes(w)).length / ansWords.length;
    if (partialMatch >= 0.6) return 0.60;
  }

  // Question keywords found in extract (article is topically related)
  const qWords = questionText.toLowerCase().split(/\s+/).filter(w => w.length > 4);
  const qMatch  = qWords.filter(w => ex.includes(w)).length;
  if (qWords.length > 0 && qMatch / qWords.length > 0.4) return 0.45;

  return 0.25;
}

// ── Core processor ────────────────────────────────────────────────────────────
interface QuestionRow {
  id:           string;
  text:         string;
  options:      string[];
  correctIndex: number;
  category: {
    slug: string;
    name: string;
  };
}

async function processQuestion(q: QuestionRow): Promise<{
  citation: string;
  verified: boolean;
  confidence: number;
}> {
  const categorySlug  = q.category.slug;
  const correctAnswer = q.options[q.correctIndex];

  // ── Math / logic: no external citation needed ─────────────────────────────
  if (MATH_SLUGS.has(categorySlug)) {
    return { citation: "Mathematical derivation", verified: true, confidence: 1.0 };
  }

  // ── Wikipedia route ───────────────────────────────────────────────────────
  const query  = buildQuery(q.text, correctAnswer, categorySlug);
  const result = await searchWikipedia(query);
  await sleep(WIKI_DELAY_MS);

  if (!result) {
    return { citation: "NEEDS_WEB_SEARCH", verified: false, confidence: 0.0 };
  }

  const confidence = scoreConfidence(correctAnswer, q.text, result.extract);

  return {
    citation:   result.url,
    verified:   confidence >= 0.80,
    confidence,
  };
}

// ── Progress display ──────────────────────────────────────────────────────────
function formatBar(done: number, total: number, width = 30): string {
  const filled = Math.round((done / total) * width);
  return "[" + "█".repeat(filled) + "░".repeat(width - filled) + "]";
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n══════════════════════════════════════════");
  console.log("  Operation Facts4U");
  console.log("══════════════════════════════════════════\n");

  const done      = loadCheckpoint();
  const resuming  = done.size > 0;
  if (resuming) console.log(`↩  Resuming from checkpoint — ${done.size} already processed\n`);

  // Load all questions with category slug
  const questions = await prisma.question.findMany({
    select: {
      id: true, text: true, options: true, correctIndex: true,
      category: { select: { slug: true, name: true } },
    },
  }) as unknown as QuestionRow[];

  const pending = questions.filter(q => !done.has(q.id));
  const total   = questions.length;
  console.log(`📚 ${total} questions total  |  ${pending.length} pending  |  ${done.size} already done\n`);

  // Counters
  let verified   = 0;
  let cited      = 0;
  let needsWeb   = 0;
  let mathAuto   = 0;
  let errors     = 0;

  const updates: Array<{ id: string; citation: string; verified: boolean; confidence: number }> = [];

  for (let i = 0; i < pending.length; i++) {
    const q = pending[i];

    try {
      const result = await processQuestion(q);
      updates.push({ id: q.id, ...result });

      if (result.citation === "Mathematical derivation") mathAuto++;
      else if (result.citation === "NEEDS_WEB_SEARCH")    needsWeb++;
      else                                                cited++;

      if (result.verified) verified++;
    } catch (err) {
      errors++;
      updates.push({ id: q.id, citation: "ERROR", verified: false, confidence: 0 });
    }

    // Flush batch to DB
    if (updates.length >= BATCH_SIZE || i === pending.length - 1) {
      await prisma.$transaction(
        updates.map(u =>
          prisma.question.update({
            where: { id: u.id },
            data: { citation: u.citation, verified: u.verified, confidence: u.confidence },
          })
        )
      );
      updates.forEach(u => done.add(u.id));
      saveCheckpoint(done);
      updates.length = 0;
    }

    // Progress line (overwrite)
    const processed = done.size;
    const pct       = Math.round((processed / total) * 100);
    process.stdout.write(
      `\r  ${formatBar(processed, total)} ${pct}%  ` +
      `✓${verified} cited  📐${mathAuto} math  ❓${needsWeb} needs-web  ✗${errors} errors   `
    );
  }

  console.log("\n\n══════════════════════════════════════════");
  console.log("  Facts4U Complete");
  console.log("══════════════════════════════════════════");
  console.log(`  Total processed : ${done.size}`);
  console.log(`  Auto-verified   : ${mathAuto}  (math/logic — no citation needed)`);
  console.log(`  Wikipedia cited : ${cited}`);
  console.log(`  Verified (≥0.80): ${verified}`);
  console.log(`  Needs web search: ${needsWeb}  → run again once ANTHROPIC_API_KEY is set`);
  console.log(`  Errors          : ${errors}`);
  console.log("══════════════════════════════════════════\n");

  // Summary by category for needs-web
  if (needsWeb > 0) {
    const needsWebRows = await prisma.question.findMany({
      where: { citation: "NEEDS_WEB_SEARCH" },
      select: { category: { select: { slug: true } } },
    });
    const byCat: Record<string, number> = {};
    for (const r of needsWebRows) {
      byCat[r.category.slug] = (byCat[r.category.slug] ?? 0) + 1;
    }
    console.log("  Needs-web breakdown by category:");
    Object.entries(byCat)
      .sort((a, b) => b[1] - a[1])
      .forEach(([slug, count]) => console.log(`    ${slug.padEnd(25)} ${count}`));
    console.log();
  }

  // Delete checkpoint on clean finish
  if (errors === 0) {
    fs.rmSync(CHECKPOINT_PATH, { force: true });
    console.log("  ✓ Checkpoint cleared.\n");
  }

  await prisma.$disconnect();
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

main().catch(err => {
  console.error("\nFatal error:", err);
  prisma.$disconnect();
  process.exit(1);
});
