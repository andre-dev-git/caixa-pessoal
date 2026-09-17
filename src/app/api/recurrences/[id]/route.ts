import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { todayIso } from "@/lib/utils";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  if (body.action === "cancel") {
    const item = await prisma.recurrence.update({
      where: { id },
      data: { status: "cancelled", cancelledAt: todayIso() },
    });
    console.log(`Recorrência cancelada: ${id}`);
    return NextResponse.json(item);
  }

  if (body.action === "reactivate") {
    const item = await prisma.recurrence.update({
      where: { id },
      data: { status: "active", cancelledAt: null },
    });
    return NextResponse.json(item);
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.recurrence.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
