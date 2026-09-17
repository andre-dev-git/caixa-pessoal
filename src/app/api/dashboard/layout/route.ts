import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const DEFAULT_LAYOUT = [
  { i: "expenses", x: 0, y: 0, w: 3, h: 2 },
  { i: "income", x: 3, y: 0, w: 3, h: 2 },
  { i: "balance", x: 6, y: 0, w: 3, h: 2 },
  { i: "committed", x: 9, y: 0, w: 3, h: 2 },
  { i: "byCategory", x: 0, y: 2, w: 6, h: 4 },
  { i: "byTag", x: 6, y: 2, w: 6, h: 4 },
  { i: "daily", x: 0, y: 6, w: 6, h: 4 },
  { i: "monthly", x: 6, y: 6, w: 6, h: 4 },
  { i: "topExpenses", x: 0, y: 10, w: 4, h: 4 },
  { i: "subscriptions", x: 4, y: 10, w: 4, h: 4 },
  { i: "futureInstallments", x: 8, y: 10, w: 4, h: 4 },
  { i: "comparison", x: 0, y: 14, w: 6, h: 3 },
  { i: "heatmap", x: 6, y: 14, w: 6, h: 4 },
  { i: "calendar", x: 0, y: 18, w: 12, h: 5 },
];

export async function GET() {
  let row = await prisma.dashboardLayout.findUnique({
    where: { id: "default" },
  });
  if (!row) {
    row = await prisma.dashboardLayout.create({
      data: { id: "default", layout: JSON.stringify(DEFAULT_LAYOUT) },
    });
  }
  return NextResponse.json({
    layout: JSON.parse(row.layout),
    defaults: DEFAULT_LAYOUT,
  });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const layout = body.layout ?? DEFAULT_LAYOUT;
  const row = await prisma.dashboardLayout.upsert({
    where: { id: "default" },
    create: { id: "default", layout: JSON.stringify(layout) },
    update: { layout: JSON.stringify(layout) },
  });
  return NextResponse.json({ layout: JSON.parse(row.layout) });
}
