const fs = require("fs");
const path = require("path");

const seedPath = path.join(__dirname, "..", "prisma", "seed.ts");
const seedContent = fs.readFileSync(seedPath, "utf8");

const match = seedContent.match(/const QUESTIONS[\s\S]*?=\s*\[([\s\S]*?)\]\s*;\s*async function main/);
if (!match) {
  console.error("Could not find QUESTIONS array in seed.ts");
  process.exit(1);
}

const questionsStr = match[1];
const byCategory = {};
let current = "";
let depth = 0;
let inString = false;
let quote = null;
let i = 0;

while (i < questionsStr.length) {
  const c = questionsStr[i];
  if (!inString) {
    if ((c === '"' || c === "'") && questionsStr[i - 1] !== "\\") {
      inString = true;
      quote = c;
    } else if (c === "{") {
      depth++;
    } else if (c === "}") {
      depth--;
    }
  } else if (c === quote && questionsStr[i - 1] !== "\\") {
    inString = false;
  }

  current += c;
  i++;

  if (!inString && depth === 0 && current.trim().endsWith("}")) {
    const slugMatch = current.match(/categorySlug:\s*"([^"]+)"/);
    if (slugMatch) {
      const slug = slugMatch[1];
      const withoutSlug = current
        .replace(/\s*categorySlug:\s*"[^"]+",?\s*/g, " ")
        .trim()
        .replace(/,\s*$/, "");
      if (!byCategory[slug]) byCategory[slug] = [];
      byCategory[slug].push(withoutSlug);
    }
    current = "";
  }
}

const questionsDir = path.join(__dirname, "..", "questions");
if (!fs.existsSync(questionsDir)) fs.mkdirSync(questionsDir, { recursive: true });

const varNames = [];
for (const [slug, items] of Object.entries(byCategory)) {
  const varName = slug.replace(/-/g, "_") + "Questions";
  varNames.push({ slug, varName });
  const cleanItems = items.map((item) => item.replace(/,\s*$/, "").trim());
  const body = cleanItems.map((item) => "  " + item).join(",\n");
  const content = `export const ${varName} = [\n${body},\n];\n`;
  const filePath = path.join(questionsDir, `${slug}.ts`);
  fs.writeFileSync(filePath, content, "utf8");
  console.log(`Created questions/${slug}.ts (${items.length} questions)`);
}

const indexLines = varNames.map(({ slug, varName }) => `import { ${varName} } from "./${slug}";`);
const entries = varNames.map(({ slug, varName }) => `  { slug: "${slug}", questions: ${varName} },`).join("\n");
const indexContent = `${indexLines.join("\n")}

export const allCategoryQuestions = [\n${entries}\n];\n`;
fs.writeFileSync(path.join(questionsDir, "index.ts"), indexContent, "utf8");
console.log("Created questions/index.ts");
console.log(`\nDone. ${Object.keys(byCategory).length} categories.`);
console.log("Run: npx prisma db seed");