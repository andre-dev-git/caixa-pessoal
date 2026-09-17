import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  buildEntryWhere,
  parseFiltersFromSearchParams,
  ensureMaterialized,
} from "@/lib/domain/entries";
import {
  deriveInstallmentPlan,
  futureRecurringDates,
  monthsHorizon,
} from "@/lib/domain/projections";
import type { Periodicity } from "@/lib/utils";
import { differenceInCalendarDays, parseISO, format, startOfMonth, endOfMonth, subMonths } from "date-fns";

export async function GET(req: NextRequest) {
  await ensureMaterialized();
  const filters = parseFiltersFromSearchParams(req.nextUrl.searchParams);
  const where = buildEntryWhere(filters);

  const entries = await prisma.entry.findMany({
    where,
    include: {
      category: true,
      tags: { include: { tag: true } },
    },
  });

  const expenseTypes = new Set(["expense"]);
  const incomeTypes = new Set(["income", "chargeback", "refund"]);

  const totalExpenses = entries
    .filter((e) => expenseTypes.has(e.type))
    .reduce((s, e) => s + e.amountCents, 0);
  const totalIncome = entries
    .filter((e) => incomeTypes.has(e.type))
    .reduce((s, e) => s + e.amountCents, 0);

  const byCategory: Record<string, number> = {};
  const byTag: Record<string, number> = {};
  const byDay: Record<string, number> = {};
  const byMonth: Record<string, { expenses: number; income: number }> = {};

  for (const e of entries) {
    const sign = expenseTypes.has(e.type) ? 1 : incomeTypes.has(e.type) ? 0 : 0;
    if (expenseTypes.has(e.type)) {
      byCategory[e.category.name] =
        (byCategory[e.category.name] ?? 0) + e.amountCents;
      byDay[e.date] = (byDay[e.date] ?? 0) + e.amountCents;
      for (const t of e.tags) {
        byTag[t.tag.name] = (byTag[t.tag.name] ?? 0) + e.amountCents;
      }
    }
    const month = e.date.slice(0, 7);
    if (!byMonth[month]) byMonth[month] = { expenses: 0, income: 0 };
    if (expenseTypes.has(e.type)) byMonth[month].expenses += e.amountCents;
    if (incomeTypes.has(e.type)) byMonth[month].income += e.amountCents;
    void sign;
  }

  const topExpenses = [...entries]
    .filter((e) => e.type === "expense")
    .sort((a, b) => b.amountCents - a.amountCents)
    .slice(0, 10)
    .map((e) => ({
      id: e.id,
      description: e.description,
      amountCents: e.amountCents,
      date: e.date,
      category: e.category.name,
    }));

  const plans = await prisma.installmentPlan.findMany({
    include: { category: true },
  });
  const futureInstallments = plans.flatMap((p) => {
    const d = deriveInstallmentPlan(
      p.startDate,
      p.totalAmountCents,
      p.installmentCents,
      p.totalInstallments
    );
    return d.dates.slice(d.occurredCount).map((date, idx) => ({
      description: p.description,
      date,
      amountCents: d.amounts[d.occurredCount + idx],
      category: p.category.name,
      installment: `${d.occurredCount + idx + 1}/${p.totalInstallments}`,
    }));
  });

  const committedCents = plans.reduce((sum, p) => {
    const d = deriveInstallmentPlan(
      p.startDate,
      p.totalAmountCents,
      p.installmentCents,
      p.totalInstallments
    );
    return sum + d.committedCents;
  }, 0);

  const subscriptions = await prisma.subscription.findMany({
    where: { status: "active" },
    include: { category: true },
  });
  const recurrences = await prisma.recurrence.findMany({
    where: { status: "active" },
    include: { category: true },
  });

  const horizon = monthsHorizon(6);
  const today = format(new Date(), "yyyy-MM-dd");

  const projectedSubscriptions = subscriptions.flatMap((s) =>
    futureRecurringDates(
      s.startDate,
      s.periodicity as Periodicity,
      today,
      horizon,
      s.cancelledAt
    ).map((date) => ({
      description: s.description,
      date,
      amountCents: s.amountCents,
      category: s.category.name,
      kind: "subscription" as const,
    }))
  );

  const projectedRecurrences = recurrences.flatMap((r) =>
    futureRecurringDates(
      r.startDate,
      r.periodicity as Periodicity,
      today,
      horizon,
      r.cancelledAt
    ).map((date) => ({
      description: r.description,
      date,
      amountCents: r.amountCents,
      category: r.category.name,
      kind: "recurrence" as const,
    }))
  );

  // Period comparison: current month vs previous
  const now = new Date();
  const curStart = format(startOfMonth(now), "yyyy-MM-dd");
  const curEnd = format(endOfMonth(now), "yyyy-MM-dd");
  const prevMonth = subMonths(now, 1);
  const prevStart = format(startOfMonth(prevMonth), "yyyy-MM-dd");
  const prevEnd = format(endOfMonth(prevMonth), "yyyy-MM-dd");

  const currentMonthEntries = await prisma.entry.findMany({
    where: { date: { gte: curStart, lte: curEnd }, type: "expense" },
  });
  const prevMonthEntries = await prisma.entry.findMany({
    where: { date: { gte: prevStart, lte: prevEnd }, type: "expense" },
  });

  const currentTotal = currentMonthEntries.reduce((s, e) => s + e.amountCents, 0);
  const previousTotal = prevMonthEntries.reduce((s, e) => s + e.amountCents, 0);
  const absoluteDiff = currentTotal - previousTotal;
  const percentDiff =
    previousTotal === 0
      ? currentTotal === 0
        ? 0
        : 100
      : (absoluteDiff / previousTotal) * 100;

  // Calendar / heatmap data
  const heatmap = Object.entries(byDay).map(([date, amountCents]) => ({
    date,
    amountCents,
    intensity: Math.min(1, amountCents / 50000),
  }));

  return NextResponse.json({
    totals: {
      expenses: totalExpenses,
      income: totalIncome,
      balance: totalIncome - totalExpenses,
    },
    byCategory: Object.entries(byCategory).map(([name, amountCents]) => ({
      name,
      amountCents,
    })),
    byTag: Object.entries(byTag).map(([name, amountCents]) => ({
      name,
      amountCents,
    })),
    byDay: Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amountCents]) => ({ date, amountCents })),
    byMonth: Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, ...v })),
    topExpenses,
    subscriptions: subscriptions.map((s) => ({
      id: s.id,
      description: s.description,
      amountCents: s.amountCents,
      periodicity: s.periodicity,
      category: s.category.name,
    })),
    recurrences: recurrences.map((r) => ({
      id: r.id,
      description: r.description,
      amountCents: r.amountCents,
      periodicity: r.periodicity,
      category: r.category.name,
    })),
    futureInstallments,
    committedCents,
    projectedSubscriptions,
    projectedRecurrences,
    comparison: {
      current: { from: curStart, to: curEnd, total: currentTotal },
      previous: { from: prevStart, to: prevEnd, total: previousTotal },
      absoluteDiff,
      percentDiff,
    },
    heatmap,
    daySpan:
      entries.length > 0
        ? differenceInCalendarDays(
            parseISO(
              [...entries].sort((a, b) => b.date.localeCompare(a.date))[0].date
            ),
            parseISO(
              [...entries].sort((a, b) => a.date.localeCompare(b.date))[0].date
            )
          ) + 1
        : 0,
  });
}
