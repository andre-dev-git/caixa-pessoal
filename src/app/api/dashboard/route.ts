import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  buildEntryWhere,
  parseFiltersFromSearchParams,
  ensureMaterialized,
} from "@/lib/domain/entries";
import {
  format,
  parseISO,
  startOfWeek,
  startOfMonth,
} from "date-fns";

export async function GET(req: NextRequest) {
  await ensureMaterialized();
  const filters = parseFiltersFromSearchParams(req.nextUrl.searchParams);
  const where = buildEntryWhere(filters);

  const entries = await prisma.entry.findMany({
    where,
    include: { category: true },
  });

  const expenses = entries.filter((e) => e.type === "expense");
  const incomeTypes = new Set(["income", "chargeback", "refund"]);
  const incomes = entries.filter((e) => incomeTypes.has(e.type));

  const totalExpenses = expenses.reduce((s, e) => s + e.amountCents, 0);
  const totalIncome = incomes.reduce((s, e) => s + e.amountCents, 0);

  const byCategoryMap: Record<string, number> = {};
  for (const e of expenses) {
    byCategoryMap[e.category.name] =
      (byCategoryMap[e.category.name] ?? 0) + e.amountCents;
  }

  const byDayMap: Record<string, number> = {};
  const byWeekMap: Record<string, number> = {};
  const byMonthMap: Record<string, number> = {};

  for (const e of expenses) {
    const day = e.date;
    byDayMap[day] = (byDayMap[day] ?? 0) + e.amountCents;

    const d = parseISO(day);
    const weekStart = format(
      startOfWeek(d, { weekStartsOn: 1 }),
      "yyyy-MM-dd"
    );
    byWeekMap[weekStart] = (byWeekMap[weekStart] ?? 0) + e.amountCents;

    const month = format(startOfMonth(d), "yyyy-MM");
    byMonthMap[month] = (byMonthMap[month] ?? 0) + e.amountCents;
  }

  const toSeries = (map: Record<string, number>) =>
    Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, amountCents]) => ({ key, amountCents }));

  const savings = await prisma.savingsBalance.upsert({
    where: { id: "default" },
    create: { id: "default", amountCents: 0 },
    update: {},
  });

  return NextResponse.json({
    totals: {
      expenses: totalExpenses,
      income: totalIncome,
      balance: totalIncome - totalExpenses,
    },
    byCategory: Object.entries(byCategoryMap).map(([name, amountCents]) => ({
      name,
      amountCents,
    })),
    spending: {
      day: toSeries(byDayMap),
      week: toSeries(byWeekMap),
      month: toSeries(byMonthMap),
    },
    savingsAmountCents: savings.amountCents,
  });
}
