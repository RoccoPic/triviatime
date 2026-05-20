import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const categories = await prisma.category.findMany({
    select: { id: true, slug: true, name: true },
    orderBy: { slug: "asc" },
  });
  return NextResponse.json(categories);
}
