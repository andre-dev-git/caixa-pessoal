import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string().optional(),
});

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  try {
    const category = await prisma.category.create({ data: parsed.data });
    console.log(`Categoria criada: ${category.name}`);
    return NextResponse.json(category, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Já existe uma categoria com este nome" },
      { status: 409 }
    );
  }
}
