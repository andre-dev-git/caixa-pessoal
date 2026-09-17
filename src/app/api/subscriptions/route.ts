import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { PERIODICITIES, centsFromDecimal, isIsoDate } from "@/lib/utils";
import { materializeDueEntries } from "@/lib/materialize";

const schema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  startDate: z.string().refine(isIsoDate),
  periodicity: z.enum(PERIODICITIES),
  categoryId: z.string().min(1),
  tagIds: z.array(z.string()).optional().default([]),
  status: z.enum(["active", "cancelled"]).optional(),
});

export async function GET() {
  await materializeDueEntries();
  const items = await prisma.subscription.findMany({
    include: {
      category: true,
      tags: { include: { tag: true } },
      entries: { orderBy: { date: "desc" } },
    },
    orderBy: { startDate: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const category = await prisma.category.findUnique({
    where: { id: parsed.data.categoryId },
  });
  if (!category) {
    return NextResponse.json({ error: "Categoria inexistente" }, { status: 400 });
  }

  const item = await prisma.subscription.create({
    data: {
      description: parsed.data.description,
      amountCents: centsFromDecimal(parsed.data.amount),
      startDate: parsed.data.startDate,
      periodicity: parsed.data.periodicity,
      status: parsed.data.status ?? "active",
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

  await materializeDueEntries();
  console.log(`Assinatura criada: ${item.description}`);
  return NextResponse.json(item, { status: 201 });
}
