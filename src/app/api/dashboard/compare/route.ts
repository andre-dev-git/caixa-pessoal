import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  buildEntryWhere,
  parseFiltersFromSearchParams,
  ensureMaterialized,
} from "@/lib/domain/entries";

export async function GET(req: NextRequest) {
  await ensureMaterialized();
  const params = req.nextUrl.searchParams;
  const periodAFrom = params.get("periodAFrom");
  const periodATo = params.get("periodATo");
  const periodBFrom = params.get("periodBFrom");
  const periodBTo = params.get("periodBTo");
  const categoryId = params.get("categoryId") ?? undefined;

  if (!periodAFrom || !periodATo || !periodBFrom || !periodBTo) {
    return NextResponse.json(
      { error: "Informe periodAFrom, periodATo, periodBFrom e periodBTo" },
      { status: 400 }
    );
  }

  const baseFilters = parseFiltersFromSearchParams(params);

  async function sumPeriod(from: string, to: string) {
    const where = buildEntryWhere({
      ...baseFilters,
      from,
      to,
      categoryId: categoryId ?? baseFilters.categoryId,
      type: "expense",
    });
    const entries = await prisma.entry.findMany({ where });
    return entries.reduce((s, e) => s + e.amountCents, 0);
  }

  const totalA = await sumPeriod(periodAFrom, periodATo);
  const totalB = await sumPeriod(periodBFrom, periodBTo);
  const absoluteDiff = totalA - totalB;
  const percentDiff =
    totalB === 0 ? (totalA === 0 ? 0 : 100) : (absoluteDiff / totalB) * 100;

  return NextResponse.json({
    periodA: { from: periodAFrom, to: periodATo, total: totalA },
    periodB: { from: periodBFrom, to: periodBTo, total: totalB },
    absoluteDiff,
    percentDiff,
  });
}
