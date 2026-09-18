import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Limpa dados financeiros de teste, preservando categorias e tags.
 */
export async function POST() {
  await prisma.$transaction(async (tx) => {
    await tx.entry.deleteMany();
    await tx.installmentPlan.deleteMany();
    await tx.subscription.deleteMany();
    await tx.recurrence.deleteMany();
    await tx.importBatch.deleteMany();
    await tx.savingsMovement.deleteMany();
    await tx.savingsBalance.upsert({
      where: { id: "default" },
      create: { id: "default", amountCents: 0 },
      update: { amountCents: 0 },
    });
    await tx.dashboardLayout.deleteMany();
  });

  console.log("Contas limpas: lançamentos, planos, importações e reserva zerada");
  return NextResponse.json({ ok: true });
}
