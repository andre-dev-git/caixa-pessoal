import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  format,
  isAfter,
  isBefore,
  isEqual,
  parseISO,
} from "date-fns";
import type { Periodicity } from "@/lib/utils";

export function addPeriod(date: Date, periodicity: Periodicity, count = 1): Date {
  switch (periodicity) {
    case "weekly":
      return addWeeks(date, count);
    case "monthly":
      return addMonths(date, count);
    case "quarterly":
      return addMonths(date, count * 3);
    case "yearly":
      return addYears(date, count);
    default:
      return addMonths(date, count);
  }
}

export function toIsoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function installmentDate(startDate: string, occurrenceNumber: number): string {
  const start = parseISO(startDate);
  return toIsoDate(addMonths(start, occurrenceNumber - 1));
}

export function installmentAmounts(
  totalAmountCents: number,
  totalInstallments: number
): number[] {
  const base = Math.floor(totalAmountCents / totalInstallments);
  const amounts = Array.from({ length: totalInstallments }, () => base);
  const remainder = totalAmountCents - base * totalInstallments;
  amounts[totalInstallments - 1] += remainder;
  return amounts;
}

export interface InstallmentDerived {
  currentInstallment: number;
  occurredCount: number;
  futureCount: number;
  committedCents: number;
  lastInstallmentMonth: string;
  amounts: number[];
  dates: string[];
}

export function deriveInstallmentPlan(
  startDate: string,
  totalAmountCents: number,
  installmentCents: number,
  totalInstallments: number,
  asOf: string = toIsoDate(new Date())
): InstallmentDerived {
  const amounts = installmentAmounts(totalAmountCents, totalInstallments);
  // Prefer stored installmentCents for display consistency when equal base
  const dates = Array.from({ length: totalInstallments }, (_, i) =>
    installmentDate(startDate, i + 1)
  );
  const asOfDate = parseISO(asOf);
  let occurredCount = 0;
  let currentInstallment = 0;
  for (let i = 0; i < dates.length; i++) {
    const d = parseISO(dates[i]);
    if (isBefore(d, asOfDate) || isEqual(d, asOfDate)) {
      occurredCount++;
      currentInstallment = i + 1;
    }
  }
  const futureCount = totalInstallments - occurredCount;
  const committedCents = amounts
    .slice(occurredCount)
    .reduce((sum, v) => sum + v, 0);
  const lastDate = dates[dates.length - 1];
  return {
    currentInstallment: currentInstallment || 0,
    occurredCount,
    futureCount,
    committedCents,
    lastInstallmentMonth: lastDate.slice(0, 7),
    amounts: amounts.map((a, i) =>
      i < totalInstallments - 1 ? installmentCents : amounts[i]
    ),
    dates,
  };
}

export function recurringOccurrenceDates(
  startDate: string,
  periodicity: Periodicity,
  untilDate: string,
  cancelledAt?: string | null
): string[] {
  const start = parseISO(startDate);
  const until = parseISO(untilDate);
  const end =
    cancelledAt != null
      ? (() => {
          const c = parseISO(cancelledAt);
          return isBefore(c, until) ? c : until;
        })()
      : until;

  if (isAfter(start, end)) return [];

  const dates: string[] = [];
  let current = start;
  let guard = 0;
  while ((isBefore(current, end) || isEqual(current, end)) && guard < 10000) {
    dates.push(toIsoDate(current));
    current = addPeriod(current, periodicity);
    guard++;
  }
  return dates;
}

export function futureRecurringDates(
  startDate: string,
  periodicity: Periodicity,
  fromExclusive: string,
  horizonDate: string,
  cancelledAt?: string | null
): string[] {
  const all = recurringOccurrenceDates(
    startDate,
    periodicity,
    horizonDate,
    cancelledAt
  );
  const from = parseISO(fromExclusive);
  return all.filter((d) => isAfter(parseISO(d), from));
}

export function monthsHorizon(months = 12): string {
  return toIsoDate(addMonths(new Date(), months));
}

export function daysHorizon(days = 90): string {
  return toIsoDate(addDays(new Date(), days));
}
