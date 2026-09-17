import { prisma } from "@/lib/db";
import {
  deriveInstallmentPlan,
  recurringOccurrenceDates,
  toIsoDate,
} from "@/lib/domain/projections";
import type { Periodicity } from "@/lib/utils";

export async function materializeDueEntries(asOf = toIsoDate(new Date())) {
  console.log(`Materializando lançamentos vencidos até ${asOf}`);
  let created = 0;

  const plans = await prisma.installmentPlan.findMany({
    include: { tags: true },
  });

  for (const plan of plans) {
    const derived = deriveInstallmentPlan(
      plan.startDate,
      plan.totalAmountCents,
      plan.installmentCents,
      plan.totalInstallments,
      asOf
    );

    for (let i = 0; i < derived.occurredCount; i++) {
      const occurrenceNumber = i + 1;
      const existing = await prisma.entry.findFirst({
        where: {
          installmentPlanId: plan.id,
          occurrenceNumber,
        },
      });
      if (existing) continue;

      await prisma.entry.create({
        data: {
          description: `${plan.description} (${occurrenceNumber}/${plan.totalInstallments})`,
          amountCents: derived.amounts[i],
          date: derived.dates[i],
          type: "expense",
          categoryId: plan.categoryId,
          origin: plan.importId ? "import" : "manual",
          importId: plan.importId,
          installmentPlanId: plan.id,
          occurrenceNumber,
          tags: {
            create: plan.tags.map((t) => ({ tagId: t.tagId })),
          },
        },
      });
      created++;
    }
  }

  const subscriptions = await prisma.subscription.findMany({
    include: { tags: true },
  });

  for (const sub of subscriptions) {
    const until =
      sub.status === "cancelled" && sub.cancelledAt
        ? sub.cancelledAt < asOf
          ? sub.cancelledAt
          : asOf
        : asOf;
    const dates = recurringOccurrenceDates(
      sub.startDate,
      sub.periodicity as Periodicity,
      until,
      sub.cancelledAt
    );

    for (let i = 0; i < dates.length; i++) {
      const occurrenceNumber = i + 1;
      const existing = await prisma.entry.findFirst({
        where: {
          subscriptionId: sub.id,
          occurrenceNumber,
        },
      });
      if (existing) continue;

      await prisma.entry.create({
        data: {
          description: sub.description,
          amountCents: sub.amountCents,
          date: dates[i],
          type: "expense",
          categoryId: sub.categoryId,
          origin: sub.importId ? "import" : "manual",
          importId: sub.importId,
          subscriptionId: sub.id,
          occurrenceNumber,
          tags: {
            create: sub.tags.map((t) => ({ tagId: t.tagId })),
          },
        },
      });
      created++;
    }
  }

  const recurrences = await prisma.recurrence.findMany({
    include: { tags: true },
  });

  for (const rec of recurrences) {
    const until =
      rec.status === "cancelled" && rec.cancelledAt
        ? rec.cancelledAt < asOf
          ? rec.cancelledAt
          : asOf
        : asOf;
    const dates = recurringOccurrenceDates(
      rec.startDate,
      rec.periodicity as Periodicity,
      until,
      rec.cancelledAt
    );

    for (let i = 0; i < dates.length; i++) {
      const occurrenceNumber = i + 1;
      const existing = await prisma.entry.findFirst({
        where: {
          recurrenceId: rec.id,
          occurrenceNumber,
        },
      });
      if (existing) continue;

      await prisma.entry.create({
        data: {
          description: rec.description,
          amountCents: rec.amountCents,
          date: dates[i],
          type: "expense",
          categoryId: rec.categoryId,
          origin: rec.importId ? "import" : "manual",
          importId: rec.importId,
          recurrenceId: rec.id,
          occurrenceNumber,
          tags: {
            create: rec.tags.map((t) => ({ tagId: t.tagId })),
          },
        },
      });
      created++;
    }
  }

  if (created > 0) {
    console.log(`Materializados ${created} lançamento(s)`);
  }
  return created;
}
