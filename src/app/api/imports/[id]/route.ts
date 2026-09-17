import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { revertImport } from "@/lib/import/engine";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const batch = await prisma.importBatch.findUnique({
    where: { id },
    include: {
      entries: {
        include: { category: true, tags: { include: { tag: true } } },
        orderBy: { date: "desc" },
      },
      installmentPlans: { include: { category: true } },
      subscriptions: { include: { category: true } },
      recurrences: { include: { category: true } },
      categories: true,
      tags: true,
    },
  });
  if (!batch) {
    return NextResponse.json({ error: "Importação não encontrada" }, { status: 404 });
  }
  return NextResponse.json(batch);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (body.action !== "revert") {
    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  }
  try {
    const batch = await revertImport(id);
    return NextResponse.json(batch);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao reverter" },
      { status: 400 }
    );
  }
}
