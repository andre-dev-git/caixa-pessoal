import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
  try {
    const category = await prisma.category.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json(category);
  } catch {
    return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const inUse =
    (await prisma.entry.count({ where: { categoryId: id } })) +
    (await prisma.installmentPlan.count({ where: { categoryId: id } })) +
    (await prisma.subscription.count({ where: { categoryId: id } })) +
    (await prisma.recurrence.count({ where: { categoryId: id } }));

  if (inUse > 0) {
    return NextResponse.json(
      { error: "Categoria em uso e não pode ser excluída" },
      { status: 409 }
    );
  }

  await prisma.category.delete({ where: { id } });
  console.log(`Categoria excluída: ${id}`);
  return NextResponse.json({ ok: true });
}
