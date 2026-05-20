import { PrismaClient } from "@prisma/client";
import { allCategoryQuestions } from "../questions";

const prisma = new PrismaClient();

function slugToName(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const CATEGORIES = allCategoryQuestions.map(({ slug }) => ({
  slug,
  name: slugToName(slug),
}));

const QUESTIONS = allCategoryQuestions.flatMap(({ slug, questions }) =>
  questions.map((q) => ({ ...q, categorySlug: slug }))
);



async function main() {
  console.log("Seeding categories...");
  const categoryIds: Record<string, string> = {};
  for (const c of CATEGORIES) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, name: c.name },
      update: { name: c.name },
    });
    categoryIds[c.slug] = cat.id;
  }

  console.log("Seeding questions...");
  let added = 0;
  for (const q of QUESTIONS) {
    const categoryId = categoryIds[q.categorySlug];
    if (!categoryId) continue;
    const existing = await prisma.question.findFirst({
      where: { categoryId, text: q.text },
    });
    if (existing) continue;
    await prisma.question.create({
      data: {
        categoryId,
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex,
      },
    });
    added += 1;
  }
  console.log(`Seed complete. ${added} new question(s) added.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
