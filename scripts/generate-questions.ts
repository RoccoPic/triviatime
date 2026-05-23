/**
 * Question Generator
 * ──────────────────
 * Uses Claude (Haiku) to generate new trivia questions and writes them
 * directly to the database.
 *
 * Usage:
 *   npx tsx scripts/generate-questions.ts --category astronomy --count 100
 *   npx tsx scripts/generate-questions.ts --category astronomy --count 50 --difficulty hard
 *   npx tsx scripts/generate-questions.ts --all --count 50
 *   npx tsx scripts/generate-questions.ts --all --count 50 --difficulty all
 *
 * Options:
 *   --category <slug>            Single category slug (e.g. "astronomy")
 *   --all                        Run all 43 categories
 *   --count <n>                  Questions to generate per category (default: 50)
 *   --difficulty easy|medium|hard|all   Target difficulty (default: all)
 *   --dry-run                    Print questions without saving to DB
 *
 * Requires ANTHROPIC_API_KEY in .env
 */

import Anthropic from "@anthropic-ai/sdk";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

// ── Config ────────────────────────────────────────────────────────────────────

const MODEL           = "claude-3-5-haiku-20241022";
const BATCH_SIZE      = 20;   // questions per API call
const RETRY_LIMIT     = 3;
const RETRY_DELAY_MS  = 2000;

// Difficulty bands (difficultyScore 0–100)
const DIFFICULTY_BANDS = {
  easy:   { min: 10, max: 33, label: "Easy — general knowledge, well-known facts most people would know" },
  medium: { min: 34, max: 66, label: "Medium — requires genuine interest or study in the topic" },
  hard:   { min: 67, max: 92, label: "Hard — specific details, dates, names, or expertise required" },
};

// All 43 category slugs → display names
const ALL_CATEGORIES: Record<string, string> = {
  "art":                   "Art",
  "impressionism":         "Impressionism",
  "famous-art":            "Famous Artworks",
  "photography":           "Photography",
  "graphic-design":        "Graphic Design",
  "architecture":          "Architecture",
  "art-movements":         "Art Movements",
  "cinematography":        "Cinematography",
  "science":               "General Science",
  "biology":               "Biology",
  "earth-science":         "Earth Science",
  "genetics":              "Genetics",
  "human-anatomy":         "Human Anatomy",
  "chemistry":             "Chemistry",
  "meteorology":           "Meteorology",
  "botany":                "Botany",
  "forensics":             "Forensics",
  "history":               "World History",
  "world-war-1":           "World War I",
  "world-war-2":           "World War II",
  "ancient-rome":          "Ancient Rome",
  "industrial-revolution": "The Industrial Revolution",
  "cold-war":              "The Cold War",
  "ancient-egypt":         "Ancient Egypt",
  "geography":             "Geography",
  "world-capitals":        "World Capitals",
  "national-parks":        "National Parks",
  "oceans-seas":           "Oceans & Seas",
  "islands":               "Islands of the World",
  "us-states":             "US States",
  "countries":             "Countries of the World",
  "math":                  "General Math",
  "algebra":               "Algebra",
  "geometry":              "Geometry",
  "trigonometry":          "Trigonometry",
  "calculus":              "Calculus",
  "statistics":            "Statistics",
  "math-puzzles":          "Math Puzzles",
  "sports":                "Sports",
  "technology":            "Technology",
  "video-games":           "Video Games",
  "astronomy":             "Astronomy",
  "food":                  "Food & Cuisine",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface GeneratedQuestion {
  text:            string;
  options:         string[];
  correctIndex:    number;
  difficultyScore: number;
}

// ── Arg parsing ───────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const get  = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };
  const has = (flag: string) => args.includes(flag);

  const categoryArg  = get("--category");
  const runAll       = has("--all");
  const count        = parseInt(get("--count") ?? "50", 10);
  const difficulty   = (get("--difficulty") ?? "all") as "easy" | "medium" | "hard" | "all";
  const dryRun       = has("--dry-run");

  if (!categoryArg && !runAll) {
    console.error("Usage: generate-questions.ts --category <slug> | --all  [--count n] [--difficulty easy|medium|hard|all] [--dry-run]");
    process.exit(1);
  }
  if (categoryArg && !ALL_CATEGORIES[categoryArg]) {
    console.error(`Unknown category: "${categoryArg}". Valid slugs:\n${Object.keys(ALL_CATEGORIES).join(", ")}`);
    process.exit(1);
  }

  const categories = runAll
    ? Object.entries(ALL_CATEGORIES)
    : [[categoryArg!, ALL_CATEGORIES[categoryArg!]] as [string, string]];

  return { categories, count, difficulty, dryRun };
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(
  categoryName: string,
  count: number,
  difficultyBand: typeof DIFFICULTY_BANDS[keyof typeof DIFFICULTY_BANDS],
  existingTexts: string[],
): string {
  const existingList = existingTexts.length
    ? `\nDo NOT write questions that are the same or very similar to these existing ones:\n${
        existingTexts.slice(0, 80).map((t, i) => `${i + 1}. ${t}`).join("\n")
      }\n`
    : "";

  return `You are writing trivia questions for a trivia game. Generate exactly ${count} questions for the category: "${categoryName}".

Difficulty target: ${difficultyBand.label}
Assign each question a difficultyScore between ${difficultyBand.min} and ${difficultyBand.max}.

Rules:
- Each question has exactly 4 answer options
- Exactly one option is correct
- Wrong answers must be plausible but clearly wrong
- Questions must be factually accurate and unambiguous
- End every question with a question mark
- Vary the correctIndex — spread correct answers across positions 0, 1, 2, and 3
- Do not repeat question styles (avoid starting every question with "What is...")
${existingList}
Return ONLY a valid JSON array — no markdown, no explanation, no code fences. Example format:
[
  {
    "text": "What is the chemical symbol for gold?",
    "options": ["Ag", "Fe", "Au", "Pb"],
    "correctIndex": 2,
    "difficultyScore": 28
  }
]

Generate exactly ${count} questions now.`;
}

// ── API call with retry ───────────────────────────────────────────────────────

async function callClaude(
  client: Anthropic,
  prompt: string,
): Promise<GeneratedQuestion[]> {
  for (let attempt = 1; attempt <= RETRY_LIMIT; attempt++) {
    try {
      const msg = await client.messages.create({
        model:      MODEL,
        max_tokens: 8000,
        messages:   [{ role: "user", content: prompt }],
      });

      const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";

      // Strip accidental markdown fences
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      const parsed  = JSON.parse(cleaned) as GeneratedQuestion[];

      if (!Array.isArray(parsed)) throw new Error("Response is not an array");
      return parsed;
    } catch (err) {
      if (attempt < RETRY_LIMIT) {
        process.stdout.write(` (retry ${attempt})…`);
        await sleep(RETRY_DELAY_MS * attempt);
      } else {
        throw err;
      }
    }
  }
  return [];
}

// ── Validation ────────────────────────────────────────────────────────────────

function validate(q: unknown, existingTexts: Set<string>): q is GeneratedQuestion {
  if (!q || typeof q !== "object") return false;
  const { text, options, correctIndex, difficultyScore } = q as Record<string, unknown>;

  if (typeof text            !== "string" || text.trim().length < 10)  return false;
  if (!Array.isArray(options) || options.length !== 4)                  return false;
  if (!options.every((o): o is string => typeof o === "string" && o.trim().length > 0)) return false;
  if (typeof correctIndex    !== "number" || correctIndex < 0 || correctIndex > 3) return false;
  if (typeof difficultyScore !== "number" || difficultyScore < 0 || difficultyScore > 100) return false;

  // No duplicate text (case-insensitive)
  if (existingTexts.has(text.toLowerCase().trim())) return false;

  // Options must be distinct
  const uniqueOpts = new Set(options.map((o: string) => o.toLowerCase().trim()));
  if (uniqueOpts.size !== 4) return false;

  return true;
}

// ── Core: generate for one category ──────────────────────────────────────────

async function generateForCategory(
  client: Anthropic,
  prisma: PrismaClient,
  slug: string,
  categoryName: string,
  totalCount: number,
  difficulty: "easy" | "medium" | "hard" | "all",
  dryRun: boolean,
): Promise<{ added: number; skipped: number }> {

  // Load existing question texts from DB for dedup
  const dbCategory = await prisma.category.findUnique({ where: { slug } });
  if (!dbCategory) {
    console.log(`  ⚠  Category "${slug}" not found in DB — skipping`);
    return { added: 0, skipped: 0 };
  }

  const existing = await prisma.question.findMany({
    where:  { categoryId: dbCategory.id },
    select: { text: true },
  });
  const existingTexts   = existing.map(q => q.text);
  const existingTextSet = new Set(existingTexts.map(t => t.toLowerCase().trim()));

  // Figure out bands and counts
  const bands: Array<{ band: typeof DIFFICULTY_BANDS[keyof typeof DIFFICULTY_BANDS]; count: number }> =
    difficulty === "all"
      ? [
          { band: DIFFICULTY_BANDS.easy,   count: Math.ceil(totalCount / 3) },
          { band: DIFFICULTY_BANDS.medium, count: Math.ceil(totalCount / 3) },
          { band: DIFFICULTY_BANDS.hard,   count: Math.floor(totalCount / 3) },
        ]
      : [{ band: DIFFICULTY_BANDS[difficulty], count: totalCount }];

  let totalAdded   = 0;
  let totalSkipped = 0;

  for (const { band, count } of bands) {
    let remaining = count;

    while (remaining > 0) {
      const batchCount = Math.min(BATCH_SIZE, remaining);
      process.stdout.write(`  → ${band.label.split("—")[0].trim()} ×${batchCount}…`);

      let questions: GeneratedQuestion[] = [];
      try {
        const prompt = buildPrompt(categoryName, batchCount, band, existingTexts);
        questions    = await callClaude(client, prompt);
      } catch (err) {
        console.log(` ✗ API error: ${err}`);
        break;
      }

      // Validate and deduplicate
      const valid = questions.filter(q => {
        if (!validate(q, existingTextSet)) return false;
        existingTextSet.add(q.text.toLowerCase().trim());  // prevent intra-batch dupes
        existingTexts.push(q.text);                         // keep dedup list fresh
        return true;
      });

      const skipped = questions.length - valid.length;
      totalSkipped += skipped;

      if (!dryRun && valid.length > 0) {
        await prisma.question.createMany({
          data: valid.map(q => ({
            categoryId:      dbCategory.id,
            text:            q.text.trim(),
            options:         q.options.map(o => o.trim()),
            correctIndex:    q.correctIndex,
            difficultyScore: Math.max(0, Math.min(100, q.difficultyScore)),
          })),
          skipDuplicates: true,
        });
      }

      if (dryRun && valid.length > 0) {
        valid.forEach(q => {
          console.log(`\n    Q: ${q.text}`);
          q.options.forEach((o, i) =>
            console.log(`       ${i === q.correctIndex ? "✓" : " "} ${o}`)
          );
          console.log(`       difficulty: ${q.difficultyScore}`);
        });
      }

      totalAdded += valid.length;
      remaining  -= valid.length;

      process.stdout.write(` ✓ ${valid.length} added${skipped > 0 ? `, ${skipped} skipped` : ""}\n`);
    }
  }

  return { added: totalAdded, skipped: totalSkipped };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { categories, count, difficulty, dryRun } = parseArgs();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(
      "\n✗ ANTHROPIC_API_KEY not set.\n" +
      "  Add it to your .env file:\n" +
      "  ANTHROPIC_API_KEY=sk-ant-...\n"
    );
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });
  const prisma  = new PrismaClient();

  console.log("\n══════════════════════════════════════════════════════");
  console.log("  Question Generator");
  console.log("══════════════════════════════════════════════════════");
  console.log(`  Model      : ${MODEL}`);
  console.log(`  Categories : ${categories.length}`);
  console.log(`  Count/cat  : ${count}`);
  console.log(`  Difficulty : ${difficulty}`);
  console.log(`  Dry run    : ${dryRun ? "YES — nothing will be saved" : "NO"}`);
  console.log("══════════════════════════════════════════════════════\n");

  let grandTotal   = 0;
  let grandSkipped = 0;

  for (let i = 0; i < categories.length; i++) {
    const [slug, name] = categories[i];
    console.log(`[${i + 1}/${categories.length}] ${name} (${slug})`);

    const { added, skipped } = await generateForCategory(
      client, prisma, slug, name, count, difficulty, dryRun
    );

    grandTotal   += added;
    grandSkipped += skipped;
    console.log(`  ✔ ${added} added this category\n`);
  }

  console.log("══════════════════════════════════════════════════════");
  console.log("  Done");
  console.log("══════════════════════════════════════════════════════");
  console.log(`  Questions added   : ${grandTotal}`);
  console.log(`  Duplicates skipped: ${grandSkipped}`);
  if (dryRun) console.log("  (dry-run — nothing saved to DB)");
  console.log("══════════════════════════════════════════════════════\n");

  await prisma.$disconnect();
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

main().catch(err => {
  console.error("\nFatal:", err);
  process.exit(1);
});
