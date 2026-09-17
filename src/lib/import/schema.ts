import { z } from "zod";
import { ENTRY_TYPES, ISO_DATE_REGEX, PERIODICITIES } from "@/lib/utils";

const isoDate = z
  .string()
  .regex(ISO_DATE_REGEX, "Data deve estar no formato YYYY-MM-DD")
  .refine((v) => {
    const d = new Date(`${v}T00:00:00`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Data inválida");

const amount = z.number().finite().positive("Valor deve ser positivo");

const baseTags = z.array(z.string().min(1)).optional().default([]);

export const categoryRecordSchema = z.object({
  type: z.literal("category"),
  name: z.string().min(1, "Nome da categoria é obrigatório"),
  description: z.string().optional(),
  color: z.string().optional(),
});

export const tagRecordSchema = z.object({
  type: z.literal("tag"),
  name: z.string().min(1, "Nome da tag é obrigatório"),
  color: z.string().optional(),
});

export const entryRecordSchema = z.object({
  type: z.enum(ENTRY_TYPES),
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: amount,
  date: isoDate,
  category: z.string().min(1, "Categoria é obrigatória").nullable().optional(),
  unmapped_category: z.string().optional(),
  tags: baseTags,
});

export const installmentRecordSchema = z.object({
  type: z.literal("installment"),
  description: z.string().min(1, "Descrição é obrigatória"),
  total_amount: amount,
  installment_amount: amount.optional(),
  start_date: isoDate,
  total_installments: z.number().int().positive("Total de parcelas inválido"),
  category: z.string().min(1, "Categoria é obrigatória").nullable().optional(),
  unmapped_category: z.string().optional(),
  tags: baseTags,
});

export const subscriptionRecordSchema = z.object({
  type: z.literal("subscription"),
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: amount,
  start_date: isoDate,
  periodicity: z.enum(PERIODICITIES),
  status: z.enum(["active", "cancelled"]).optional().default("active"),
  category: z.string().min(1, "Categoria é obrigatória").nullable().optional(),
  unmapped_category: z.string().optional(),
  tags: baseTags,
});

export const recurrenceRecordSchema = z.object({
  type: z.literal("recurrence"),
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: amount,
  start_date: isoDate,
  periodicity: z.enum(PERIODICITIES),
  status: z.enum(["active", "cancelled"]).optional().default("active"),
  category: z.string().min(1, "Categoria é obrigatória").nullable().optional(),
  unmapped_category: z.string().optional(),
  tags: baseTags,
});

export const importRecordSchema = z.discriminatedUnion("type", [
  categoryRecordSchema,
  tagRecordSchema,
  entryRecordSchema,
  installmentRecordSchema,
  subscriptionRecordSchema,
  recurrenceRecordSchema,
]);

export const importPayloadSchema = z.object({
  version: z.literal("1.0"),
  records: z.array(z.unknown()),
});

export type ImportRecord = z.infer<typeof importRecordSchema>;
export type DuplicateAction = "import" | "skip" | "link";

export interface FieldError {
  field: string;
  message: string;
}

export interface PreviewRecord {
  index: number;
  raw: unknown;
  recordType: string;
  valid: boolean;
  errors: FieldError[];
  parsed?: ImportRecord;
  isDuplicate: boolean;
  duplicateOf?: {
    entity: string;
    id: string;
    label: string;
  };
  duplicateAction?: DuplicateAction;
}

export interface ImportPreview {
  total: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  invalidCategories: string[];
  invalidTags: string[];
  records: PreviewRecord[];
}
