import { prisma } from "@/lib/db";
import { materializeDueEntries } from "@/lib/materialize";
import type { Prisma } from "@prisma/client";

export interface EntryFilters {
  from?: string;
  to?: string;
  categoryId?: string;
  tagIds?: string[];
  type?: string;
  search?: string;
  origin?: string;
  punctual?: boolean;
  installment?: boolean;
  subscription?: boolean;
  recurrence?: boolean;
}

export function buildEntryWhere(filters: EntryFilters): Prisma.EntryWhereInput {
  const where: Prisma.EntryWhereInput = {};

  if (filters.from || filters.to) {
    where.date = {};
    if (filters.from) where.date.gte = filters.from;
    if (filters.to) where.date.lte = filters.to;
  }

  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.type) where.type = filters.type;
  if (filters.origin) where.origin = filters.origin;
  if (filters.search) {
    where.description = { contains: filters.search };
  }
  if (filters.tagIds && filters.tagIds.length > 0) {
    where.tags = {
      some: {
        tagId: { in: filters.tagIds },
      },
    };
  }

  const kindFilters: Prisma.EntryWhereInput[] = [];
  if (filters.punctual === true) {
    kindFilters.push({
      installmentPlanId: null,
      subscriptionId: null,
      recurrenceId: null,
    });
  }
  if (filters.installment === true) {
    kindFilters.push({ installmentPlanId: { not: null } });
  }
  if (filters.subscription === true) {
    kindFilters.push({ subscriptionId: { not: null } });
  }
  if (filters.recurrence === true) {
    kindFilters.push({ recurrenceId: { not: null } });
  }
  if (kindFilters.length === 1) {
    Object.assign(where, kindFilters[0]);
  } else if (kindFilters.length > 1) {
    where.OR = kindFilters;
  }

  return where;
}

export function parseFiltersFromSearchParams(
  params: URLSearchParams
): EntryFilters {
  const tagIds = params.get("tagIds");
  return {
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
    categoryId: params.get("categoryId") ?? undefined,
    tagIds: tagIds ? tagIds.split(",").filter(Boolean) : undefined,
    type: params.get("type") ?? undefined,
    search: params.get("search") ?? undefined,
    origin: params.get("origin") ?? undefined,
    punctual: params.get("punctual") === "1" ? true : undefined,
    installment: params.get("installment") === "1" ? true : undefined,
    subscription: params.get("subscription") === "1" ? true : undefined,
    recurrence: params.get("recurrence") === "1" ? true : undefined,
  };
}

export async function ensureMaterialized() {
  await materializeDueEntries();
}

export async function listEntries(filters: EntryFilters) {
  await ensureMaterialized();
  return prisma.entry.findMany({
    where: buildEntryWhere(filters),
    include: {
      category: true,
      tags: { include: { tag: true } },
      installmentPlan: true,
      subscription: true,
      recurrence: true,
      importBatch: true,
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
}
