import { NextRequest, NextResponse } from "next/server";
import {
  listEntries,
  parseFiltersFromSearchParams,
} from "@/lib/domain/entries";
import { ENTRY_TYPE_LABELS, type EntryType } from "@/lib/utils";
import Papa from "papaparse";

export async function GET(req: NextRequest) {
  const filters = parseFiltersFromSearchParams(req.nextUrl.searchParams);
  const entries = await listEntries(filters);

  const rows = entries.map((e) => ({
    date: e.date,
    description: e.description,
    amount: (e.amountCents / 100).toFixed(2),
    type: ENTRY_TYPE_LABELS[e.type as EntryType] ?? e.type,
    category: e.category.name,
    tags: e.tags.map((t) => t.tag.name).join("|"),
    origin: e.origin,
    installment: e.installmentPlanId ? "sim" : "não",
    subscription: e.subscriptionId ? "sim" : "não",
    recurrence: e.recurrenceId ? "sim" : "não",
  }));

  const csv = Papa.unparse(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="lancamentos.csv"',
    },
  });
}
