import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { centsFromDecimal, isIsoDate, todayIso } from "@/lib/utils";

async function getOrCreateSavings() {
  return prisma.savingsBalance.upsert({
    where: { id: "default" },
    create: { id: "default", amountCents: 0 },
    update: {},
  });
}

function buildSeries(
  movements: { date: string; balanceAfterCents: number }[]
) {
  const byDate = new Map<string, number>();
  for (const m of movements) {
    byDate.set(m.date, m.balanceAfterCents);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, balanceCents]) => ({ date, balanceCents }));
}

export async function GET() {
  const savings = await getOrCreateSavings();
  const movements = await prisma.savingsMovement.findMany({
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({
    amountCents: savings.amountCents,
    series: buildSeries(movements),
    movements: movements.map((m) => ({
      id: m.id,
      date: m.date,
      deltaCents: m.deltaCents,
      balanceAfterCents: m.balanceAfterCents,
    })),
  });
}

const depositSchema = z.object({
  action: z.literal("deposit"),
  amount: z.number().positive(),
  date: z.string().refine(isIsoDate).optional(),
});

const withdrawSchema = z.object({
  action: z.literal("withdraw"),
  amount: z.number().positive(),
  date: z.string().refine(isIsoDate).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === "deposit") {
    const parsed = depositSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    const delta = centsFromDecimal(parsed.data.amount);
    const date = parsed.data.date ?? todayIso();

    const result = await prisma.$transaction(async (tx) => {
      const savings = await tx.savingsBalance.upsert({
        where: { id: "default" },
        create: { id: "default", amountCents: delta },
        update: { amountCents: { increment: delta } },
      });
      await tx.savingsMovement.create({
        data: {
          date,
          deltaCents: delta,
          balanceAfterCents: savings.amountCents,
        },
      });
      return savings;
    });

    console.log(`Reserva: depósito de ${delta} centavos`);
    return NextResponse.json(result);
  }

  if (body.action === "withdraw") {
    const parsed = withdrawSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const delta = centsFromDecimal(parsed.data.amount);
    const date = parsed.data.date ?? todayIso();
    const current = await getOrCreateSavings();
    if (delta > current.amountCents) {
      return NextResponse.json(
        { error: "Saldo guardado insuficiente" },
        { status: 400 }
      );
    }

    const savings = await prisma.$transaction(async (tx) => {
      const updated = await tx.savingsBalance.update({
        where: { id: "default" },
        data: { amountCents: { decrement: delta } },
      });
      await tx.savingsMovement.create({
        data: {
          date,
          deltaCents: -delta,
          balanceAfterCents: updated.amountCents,
        },
      });
      return updated;
    });

    console.log(`Reserva: resgate de ${delta} centavos (sem lançamento)`);
    return NextResponse.json(savings);
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
}
