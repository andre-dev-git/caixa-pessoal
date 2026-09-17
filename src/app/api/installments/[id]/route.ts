import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.installmentPlan.delete({ where: { id } });
  console.log(`Parcelamento excluído: ${id}`);
  return NextResponse.json({ ok: true });
}
