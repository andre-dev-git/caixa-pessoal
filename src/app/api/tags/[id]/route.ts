import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  color: z.string().optional().nullable(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
  try {
    const tag = await prisma.tag.update({ where: { id }, data: parsed.data });
    return NextResponse.json(tag);
  } catch {
    return NextResponse.json({ error: "Tag não encontrada" }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const inUse =
    (await prisma.entryTag.count({ where: { tagId: id } })) +
    (await prisma.installmentPlanTag.count({ where: { tagId: id } })) +
    (await prisma.subscriptionTag.count({ where: { tagId: id } })) +
    (await prisma.recurrenceTag.count({ where: { tagId: id } }));

  if (inUse > 0) {
    return NextResponse.json(
      { error: "Tag em uso e não pode ser excluída" },
      { status: 409 }
    );
  }

  await prisma.tag.delete({ where: { id } });
  console.log(`Tag excluída: ${id}`);
  return NextResponse.json({ ok: true });
}
