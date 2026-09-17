import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { centsFromDecimal, isIsoDate } from "@/lib/utils";
import {
  deriveInstallmentPlan,
  resolveInstallmentCents,
  validateInstallmentConsistency,
} from "@/lib/domain/projections";
import { materializeDueEntries } from "@/lib/materialize";

const schema = z.object({
  description: z.string().min(1),
  totalAmount: z.number().positive(),
  installmentAmount: z.number().positive().optional(),
  startDate: z.string().refine(isIsoDate),
  totalInstallments: z.number().int().positive(),
  categoryId: z.string().min(1),
  tagIds: z.array(z.string()).optional().default([]),
});

export async function GET() {
  await materializeDueEntries();
  const plans = await prisma.installmentPlan.findMany({
    include: {
      category: true,
      tags: { include: { tag: true } },
      entries: true,
    },
    orderBy: { startDate: "desc" },
  });

  const enriched = plans.map((p) => ({
    ...p,
    derived: deriveInstallmentPlan(
      p.startDate,
      p.totalAmountCents,
      p.installmentCents,
      p.totalInstallments
    ),
  }));

  return NextResponse.json(enriched);
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

  const totalAmountCents = centsFromDecimal(parsed.data.totalAmount);
  const installmentCentsInput =
    parsed.data.installmentAmount != null
      ? centsFromDecimal(parsed.data.installmentAmount)
      : null;
  const consistencyError = validateInstallmentConsistency(
    totalAmountCents,
    parsed.data.totalInstallments,
    installmentCentsInput
  );
  if (consistencyError) {
    return NextResponse.json({ error: consistencyError }, { status: 400 });
  }

  const installmentCents = resolveInstallmentCents(
    totalAmountCents,
    parsed.data.totalInstallments,
    installmentCentsInput
  );

  const plan = await prisma.installmentPlan.create({
    data: {
      description: parsed.data.description,
      totalAmountCents,
      installmentCents,
      startDate: parsed.data.startDate,
      totalInstallments: parsed.data.totalInstallments,
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
  console.log(`Parcelamento criado: ${plan.description}`);
  return NextResponse.json(plan, { status: 201 });
}
