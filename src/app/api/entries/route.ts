import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { ENTRY_TYPES, isIsoDate } from "@/lib/utils";
import {
  listEntries,
  parseFiltersFromSearchParams,
} from "@/lib/domain/entries";
import { centsFromDecimal } from "@/lib/utils";

const createSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  date: z.string().refine(isIsoDate, "Data inválida (YYYY-MM-DD)"),
  type: z.enum(ENTRY_TYPES),
  categoryId: z.string().min(1),
  tagIds: z.array(z.string()).optional().default([]),
});

export async function GET(req: NextRequest) {
  const filters = parseFiltersFromSearchParams(req.nextUrl.searchParams);
  const entries = await listEntries(filters);
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const category = await prisma.category.findUnique({
    where: { id: parsed.data.categoryId },
  });
  if (!category) {
    return NextResponse.json(
      { error: "Categoria inexistente" },
      { status: 400 }
    );
  }

  if (parsed.data.tagIds.length > 0) {
    const tags = await prisma.tag.findMany({
      where: { id: { in: parsed.data.tagIds } },
    });
    if (tags.length !== parsed.data.tagIds.length) {
      return NextResponse.json(
        { error: "Uma ou mais tags são inexistentes" },
        { status: 400 }
      );
    }
  }

  const entry = await prisma.entry.create({
    data: {
      description: parsed.data.description,
      amountCents: centsFromDecimal(parsed.data.amount),
      date: parsed.data.date,
      type: parsed.data.type,
      categoryId: parsed.data.categoryId,
      origin: "manual",
      tags: {
        create: parsed.data.tagIds.map((tagId) => ({ tagId })),
      },
    },
    include: {
      category: true,
      tags: { include: { tag: true } },
    },
  });

  console.log(`Lançamento criado: ${entry.description}`);
  return NextResponse.json(entry, { status: 201 });
}
