import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { ENTRY_TYPES, centsFromDecimal, isIsoDate } from "@/lib/utils";

const updateSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  date: z.string().refine(isIsoDate),
  type: z.enum(ENTRY_TYPES),
  categoryId: z.string().min(1),
  tagIds: z.array(z.string()).optional().default([]),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const category = await prisma.category.findUnique({
    where: { id: parsed.data.categoryId },
  });
  if (!category) {
    return NextResponse.json({ error: "Categoria inexistente" }, { status: 400 });
  }

  await prisma.entryTag.deleteMany({ where: { entryId: id } });
  const entry = await prisma.entry.update({
    where: { id },
    data: {
      description: parsed.data.description,
      amountCents: centsFromDecimal(parsed.data.amount),
      date: parsed.data.date,
      type: parsed.data.type,
      categoryId: parsed.data.categoryId,
      tags: {
        create: parsed.data.tagIds.map((tagId) => ({ tagId })),
      },
    },
    include: {
      category: true,
      tags: { include: { tag: true } },
    },
  });
  return NextResponse.json(entry);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.entry.delete({ where: { id } });
  console.log(`Lançamento excluído: ${id}`);
  return NextResponse.json({ ok: true });
}
