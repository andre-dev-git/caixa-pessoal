import { prisma } from "@/lib/db";
import {
  importRecordSchema,
  type DuplicateAction,
  type FieldError,
  type ImportPreview,
  type ImportRecord,
  type PreviewRecord,
} from "@/lib/import/schema";
import { centsFromDecimal, normalizeDescription } from "@/lib/utils";
import {
  resolveInstallmentCents,
  validateInstallmentConsistency,
} from "@/lib/domain/projections";

async function loadCatalog() {
  const [categories, tags] = await Promise.all([
    prisma.category.findMany(),
    prisma.tag.findMany(),
  ]);
  return {
    categoriesByName: new Map(
      categories.map((c) => [c.name.toLowerCase(), c])
    ),
    tagsByName: new Map(tags.map((t) => [t.name.toLowerCase(), t])),
    categories,
    tags,
  };
}

function zodToFieldErrors(err: {
  issues: { path: PropertyKey[]; message: string }[];
}): FieldError[] {
  return err.issues.map((i) => ({
    field: i.path.map(String).join(".") || "record",
    message: i.message,
  }));
}

async function findDuplicate(
  record: ImportRecord
): Promise<PreviewRecord["duplicateOf"] | undefined> {
  if (record.type === "tag") return undefined;

  if (
    record.type === "expense" ||
    record.type === "income" ||
    record.type === "chargeback" ||
    record.type === "refund"
  ) {
    const amountCents = centsFromDecimal(record.amount);
    const category = record.category
      ? await prisma.category.findFirst({
          where: { name: { equals: record.category } },
        })
      : null;
    if (!category) return undefined;

    const match = await prisma.entry.findFirst({
      where: {
        date: record.date,
        amountCents,
        description: record.description,
        categoryId: category.id,
        type: record.type,
        installmentPlanId: null,
        subscriptionId: null,
        recurrenceId: null,
      },
    });
    if (match) {
      return {
        entity: "entry",
        id: match.id,
        label: `${match.date} · ${match.description}`,
      };
    }
    return undefined;
  }

  if (record.type === "installment") {
    const category = record.category
      ? await prisma.category.findFirst({
          where: { name: { equals: record.category } },
        })
      : null;
    if (!category) return undefined;
    const totalAmountCents = centsFromDecimal(record.total_amount);
    const match = await prisma.installmentPlan.findFirst({
      where: {
        description: record.description,
        totalAmountCents,
        startDate: record.start_date,
        totalInstallments: record.total_installments,
        categoryId: category.id,
      },
    });
    if (match) {
      return {
        entity: "installment",
        id: match.id,
        label: match.description,
      };
    }
    return undefined;
  }

  if (record.type === "subscription" || record.type === "recurrence") {
    const category = record.category
      ? await prisma.category.findFirst({
          where: { name: { equals: record.category } },
        })
      : null;
    if (!category) return undefined;
    const norm = normalizeDescription(record.description);

    if (record.type === "subscription") {
      const all = await prisma.subscription.findMany({
        where: {
          periodicity: record.periodicity,
          categoryId: category.id,
        },
      });
      const match = all.find(
        (s) => normalizeDescription(s.description) === norm
      );
      if (match) {
        return {
          entity: "subscription",
          id: match.id,
          label: match.description,
        };
      }
    } else {
      const all = await prisma.recurrence.findMany({
        where: {
          periodicity: record.periodicity,
          categoryId: category.id,
        },
      });
      const match = all.find(
        (s) => normalizeDescription(s.description) === norm
      );
      if (match) {
        return {
          entity: "recurrence",
          id: match.id,
          label: match.description,
        };
      }
    }
  }

  return undefined;
}

export async function buildImportPreview(
  records: unknown[]
): Promise<ImportPreview> {
  const catalog = await loadCatalog();
  const pendingTags = new Set<string>();
  const invalidCategories = new Set<string>();
  const invalidTags = new Set<string>();

  // Tags podem ser criadas explicitamente no mesmo lote; categorias não.
  for (const raw of records) {
    if (!raw || typeof raw !== "object") continue;
    const t = (raw as { type?: string }).type;
    if (t === "tag" && "name" in (raw as object)) {
      const name = String((raw as { name?: string }).name ?? "").toLowerCase();
      if (name) pendingTags.add(name);
    }
  }

  const previewRecords: PreviewRecord[] = [];

  for (let index = 0; index < records.length; index++) {
    const raw = records[index];

    if (
      raw &&
      typeof raw === "object" &&
      (raw as { type?: string }).type === "category"
    ) {
      previewRecords.push({
        index,
        raw,
        recordType: "category",
        valid: false,
        errors: [
          {
            field: "type",
            message:
              "Importação não cria categorias. Cadastre a categoria antes e referencie-a pelo nome.",
          },
        ],
        isDuplicate: false,
      });
      continue;
    }

    const parsed = importRecordSchema.safeParse(raw);
    if (!parsed.success) {
      previewRecords.push({
        index,
        raw,
        recordType:
          raw && typeof raw === "object" && "type" in raw
            ? String((raw as { type: unknown }).type)
            : "unknown",
        valid: false,
        errors: zodToFieldErrors(parsed.error),
        isDuplicate: false,
      });
      continue;
    }

    const record = parsed.data;
    const errors: FieldError[] = [];

    if (record.type !== "tag") {
      const catName = record.category;
      if (catName == null || catName === "") {
        errors.push({
          field: "category",
          message: record.unmapped_category
            ? `Categoria não mapeada: ${record.unmapped_category}`
            : "Categoria é obrigatória",
        });
        if (record.unmapped_category) {
          invalidCategories.add(record.unmapped_category);
        }
      } else if (!catalog.categoriesByName.has(catName.toLowerCase())) {
        errors.push({
          field: "category",
          message: `Categoria inexistente: ${catName}`,
        });
        invalidCategories.add(catName);
      }

      for (const tagName of record.tags ?? []) {
        const exists =
          catalog.tagsByName.has(tagName.toLowerCase()) ||
          pendingTags.has(tagName.toLowerCase());
        if (!exists) {
          errors.push({
            field: "tags",
            message: `Tag inexistente: ${tagName}`,
          });
          invalidTags.add(tagName);
        }
      }
    }

    if (record.type === "installment") {
      const consistencyError = validateInstallmentConsistency(
        centsFromDecimal(record.total_amount),
        record.total_installments,
        record.installment_amount != null
          ? centsFromDecimal(record.installment_amount)
          : null
      );
      if (consistencyError) {
        errors.push({
          field: "installment_amount",
          message: consistencyError,
        });
      }
    }

    const duplicateOf =
      errors.length === 0 ? await findDuplicate(record) : undefined;

    previewRecords.push({
      index,
      raw,
      recordType: record.type,
      valid: errors.length === 0,
      errors,
      parsed: record,
      isDuplicate: Boolean(duplicateOf),
      duplicateOf,
      duplicateAction: duplicateOf ? "skip" : undefined,
    });
  }

  return {
    total: previewRecords.length,
    validCount: previewRecords.filter((r) => r.valid).length,
    invalidCount: previewRecords.filter((r) => !r.valid).length,
    duplicateCount: previewRecords.filter((r) => r.isDuplicate).length,
    invalidCategories: [...invalidCategories],
    invalidTags: [...invalidTags],
    records: previewRecords,
  };
}

export interface ConfirmActions {
  [index: number]: DuplicateAction;
}

export async function confirmImport(opts: {
  format: "csv" | "json" | "api";
  fileName?: string;
  records: unknown[];
  actions: ConfirmActions;
}) {
  const preview = await buildImportPreview(opts.records);
  let accepted = 0;
  let rejected = 0;
  const created = {
    categories: 0,
    tags: 0,
    entries: 0,
    installments: 0,
    subscriptions: 0,
    recurrences: 0,
    linked: 0,
  };

  const batch = await prisma.importBatch.create({
    data: {
      format: opts.format,
      fileName: opts.fileName,
      totalRecords: preview.total,
      acceptedCount: 0,
      rejectedCount: 0,
      createdSummary: "{}",
      status: "completed",
    },
  });

  // Tags primeiro; categorias nunca são criadas na importação
  const ordered = [...preview.records].sort((a, b) => {
    const rank = (t: string) => (t === "tag" ? 0 : 1);
    return rank(a.recordType) - rank(b.recordType);
  });

  for (const item of ordered) {
    const action =
      opts.actions[item.index] ?? item.duplicateAction ?? "import";

    if (!item.valid || !item.parsed) {
      rejected++;
      continue;
    }

    if (item.isDuplicate && action === "skip") {
      rejected++;
      continue;
    }

    if (item.isDuplicate && action === "link" && item.duplicateOf) {
      created.linked++;
      accepted++;
      continue;
    }

    const record = item.parsed;

    try {
      if (record.type === "tag") {
        const existing = await prisma.tag.findFirst({
          where: { name: { equals: record.name } },
        });
        if (!existing) {
          await prisma.tag.create({
            data: {
              name: record.name,
              color: record.color,
              importId: batch.id,
            },
          });
          created.tags++;
        }
        accepted++;
        continue;
      }

      const category = await prisma.category.findFirst({
        where: { name: { equals: record.category! } },
      });
      if (!category) {
        rejected++;
        continue;
      }

      const tagNames = record.tags ?? [];
      const tags = await prisma.tag.findMany({
        where: {
          OR: tagNames.map((name) => ({ name: { equals: name } })),
        },
      });
      if (tags.length !== tagNames.length) {
        rejected++;
        continue;
      }

      if (
        record.type === "expense" ||
        record.type === "income" ||
        record.type === "chargeback" ||
        record.type === "refund"
      ) {
        await prisma.entry.create({
          data: {
            description: record.description,
            amountCents: centsFromDecimal(record.amount),
            date: record.date,
            type: record.type,
            categoryId: category.id,
            origin: "import",
            importId: batch.id,
            tags: {
              create: tags.map((t) => ({ tagId: t.id })),
            },
          },
        });
        created.entries++;
        accepted++;
        continue;
      }

      if (record.type === "installment") {
        const totalAmountCents = centsFromDecimal(record.total_amount);
        const installmentCentsInput =
          record.installment_amount != null
            ? centsFromDecimal(record.installment_amount)
            : null;
        const consistencyError = validateInstallmentConsistency(
          totalAmountCents,
          record.total_installments,
          installmentCentsInput
        );
        if (consistencyError) {
          rejected++;
          continue;
        }
        const installmentCents = resolveInstallmentCents(
          totalAmountCents,
          record.total_installments,
          installmentCentsInput
        );

        await prisma.installmentPlan.create({
          data: {
            description: record.description,
            totalAmountCents,
            installmentCents,
            startDate: record.start_date,
            totalInstallments: record.total_installments,
            categoryId: category.id,
            importId: batch.id,
            tags: {
              create: tags.map((t) => ({ tagId: t.id })),
            },
          },
        });
        created.installments++;
        accepted++;
        continue;
      }

      if (record.type === "subscription") {
        await prisma.subscription.create({
          data: {
            description: record.description,
            amountCents: centsFromDecimal(record.amount),
            startDate: record.start_date,
            periodicity: record.periodicity,
            status: record.status ?? "active",
            categoryId: category.id,
            importId: batch.id,
            tags: {
              create: tags.map((t) => ({ tagId: t.id })),
            },
          },
        });
        created.subscriptions++;
        accepted++;
        continue;
      }

      if (record.type === "recurrence") {
        await prisma.recurrence.create({
          data: {
            description: record.description,
            amountCents: centsFromDecimal(record.amount),
            startDate: record.start_date,
            periodicity: record.periodicity,
            status: record.status ?? "active",
            categoryId: category.id,
            importId: batch.id,
            tags: {
              create: tags.map((t) => ({ tagId: t.id })),
            },
          },
        });
        created.recurrences++;
        accepted++;
      }
    } catch (e) {
      console.error("Erro ao confirmar registro de importação", e);
      rejected++;
    }
  }

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      acceptedCount: accepted,
      rejectedCount: rejected,
      createdSummary: JSON.stringify(created),
    },
  });

  const { materializeDueEntries } = await import("@/lib/materialize");
  await materializeDueEntries();

  return prisma.importBatch.findUniqueOrThrow({ where: { id: batch.id } });
}

export async function revertImport(importId: string) {
  const batch = await prisma.importBatch.findUnique({
    where: { id: importId },
  });
  if (!batch) throw new Error("Importação não encontrada");
  if (batch.status === "reverted") throw new Error("Importação já revertida");

  await prisma.$transaction(async (tx) => {
    await tx.entry.deleteMany({ where: { importId } });
    await tx.installmentPlan.deleteMany({ where: { importId } });
    await tx.subscription.deleteMany({ where: { importId } });
    await tx.recurrence.deleteMany({ where: { importId } });
    await tx.category.deleteMany({ where: { importId } });
    await tx.tag.deleteMany({ where: { importId } });
    await tx.importBatch.update({
      where: { id: importId },
      data: { status: "reverted", revertedAt: new Date() },
    });
  });

  console.log(`Importação ${importId} revertida`);
  return prisma.importBatch.findUniqueOrThrow({ where: { id: importId } });
}
