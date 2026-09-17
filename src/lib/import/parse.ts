import Papa from "papaparse";
import { importPayloadSchema } from "@/lib/import/schema";

const CSV_COLUMNS = [
  "type",
  "description",
  "amount",
  "date",
  "category",
  "unmapped_category",
  "tags",
  "total_amount",
  "installment_amount",
  "start_date",
  "total_installments",
  "periodicity",
  "status",
  "name",
  "color",
] as const;

function emptyToUndefined(v: unknown): unknown {
  if (v === "" || v === null || v === undefined) return undefined;
  return v;
}

function parseNumber(v: unknown): unknown {
  const e = emptyToUndefined(v);
  if (e === undefined) return undefined;
  if (typeof e === "number") return e;
  const s = String(e).replace(",", ".");
  const n = Number(s);
  return Number.isNaN(n) ? e : n;
}

function parseTags(v: unknown): string[] | undefined {
  const e = emptyToUndefined(v);
  if (e === undefined) return undefined;
  if (Array.isArray(e)) return e.map(String);
  return String(e)
    .split("|")
    .map((t) => t.trim())
    .filter(Boolean);
}

function rowToRecord(row: Record<string, unknown>): unknown {
  const type = String(emptyToUndefined(row.type) ?? "").trim();
  if (type === "tag") {
    return {
      type,
      name: emptyToUndefined(row.name) ?? emptyToUndefined(row.description),
      color: emptyToUndefined(row.color),
    };
  }
  if (type === "category") {
    // Categorias não são criadas na importação; mantém o registro para rejeição explícita.
    return {
      type,
      name: emptyToUndefined(row.name) ?? emptyToUndefined(row.description),
      description: emptyToUndefined(row.description),
      color: emptyToUndefined(row.color),
    };
  }
  if (type === "installment") {
    return {
      type,
      description: emptyToUndefined(row.description),
      total_amount: parseNumber(row.total_amount),
      installment_amount: parseNumber(row.installment_amount),
      start_date: emptyToUndefined(row.start_date) ?? emptyToUndefined(row.date),
      total_installments: parseNumber(row.total_installments),
      category: emptyToUndefined(row.category) ?? null,
      unmapped_category: emptyToUndefined(row.unmapped_category),
      tags: parseTags(row.tags) ?? [],
    };
  }
  if (type === "subscription" || type === "recurrence") {
    return {
      type,
      description: emptyToUndefined(row.description),
      amount: parseNumber(row.amount),
      start_date: emptyToUndefined(row.start_date) ?? emptyToUndefined(row.date),
      periodicity: emptyToUndefined(row.periodicity),
      status: emptyToUndefined(row.status) ?? "active",
      category: emptyToUndefined(row.category) ?? null,
      unmapped_category: emptyToUndefined(row.unmapped_category),
      tags: parseTags(row.tags) ?? [],
    };
  }
  return {
    type,
    description: emptyToUndefined(row.description),
    amount: parseNumber(row.amount),
    date: emptyToUndefined(row.date),
    category: emptyToUndefined(row.category) ?? null,
    unmapped_category: emptyToUndefined(row.unmapped_category),
    tags: parseTags(row.tags) ?? [],
  };
}

export function parseJsonImport(raw: unknown): { version: "1.0"; records: unknown[] } {
  const parsed = importPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      "JSON inválido: esperado { version: \"1.0\", records: [...] }"
    );
  }
  return parsed.data as { version: "1.0"; records: unknown[] };
}

export function parseCsvImport(csvText: string): { version: "1.0"; records: unknown[] } {
  const result = Papa.parse<Record<string, unknown>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  if (result.errors.length > 0) {
    const msg = result.errors.map((e) => e.message).join("; ");
    throw new Error(`CSV inválido: ${msg}`);
  }

  const records = result.data.map(rowToRecord);
  return { version: "1.0", records };
}

export function recordsToCsv(records: Record<string, unknown>[]): string {
  return Papa.unparse(records, { columns: [...CSV_COLUMNS] });
}

export { CSV_COLUMNS };
