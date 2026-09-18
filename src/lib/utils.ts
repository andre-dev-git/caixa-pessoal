import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

/** Formata data ISO YYYY-MM-DD para dd/MM/yyyy. */
export function formatDateBR(isoDate: string): string {
  if (!isoDate) return "";
  const datePart = isoDate.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString("pt-BR");
  }
  const [y, m, d] = datePart.split("-");
  return `${d}/${m}/${y}`;
}

export function parseBRLToCents(value: string | number): number {
  if (typeof value === "number") {
    return Math.round(value * 100);
  }
  const normalized = value
    .replace(/R\$\s?/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();
  const n = Number(normalized);
  if (Number.isNaN(n)) {
    throw new Error("Valor inválido");
  }
  return Math.round(n * 100);
}

export function centsFromDecimal(value: number): number {
  return Math.round(value * 100);
}

export function decimalFromCents(cents: number): number {
  return cents / 100;
}

export function normalizeDescription(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export const ENTRY_TYPES = [
  "expense",
  "income",
  "chargeback",
  "refund",
] as const;

export type EntryType = (typeof ENTRY_TYPES)[number];

/** Tipos disponíveis no cadastro manual. Receita/estorno/reembolso não entram por aqui. */
export const MANUAL_ENTRY_TYPES = ["expense"] as const;

export type ManualEntryType = (typeof MANUAL_ENTRY_TYPES)[number];

export const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  expense: "Despesa",
  income: "Receita",
  chargeback: "Estorno",
  refund: "Reembolso",
};

export const PERIODICITIES = [
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
] as const;

export type Periodicity = (typeof PERIODICITIES)[number];

export const PERIODICITY_LABELS: Record<Periodicity, string> = {
  weekly: "Semanal",
  monthly: "Mensal",
  quarterly: "Trimestral",
  yearly: "Anual",
};

export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE_REGEX.test(value)) return false;
  const d = new Date(`${value}T00:00:00`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
