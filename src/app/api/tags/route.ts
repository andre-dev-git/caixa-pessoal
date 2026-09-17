import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
});

export async function GET() {
  const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(tags);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
  try {
    const tag = await prisma.tag.create({ data: parsed.data });
    console.log(`Tag criada: ${tag.name}`);
    return NextResponse.json(tag, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Já existe uma tag com este nome" },
      { status: 409 }
    );
  }
}
