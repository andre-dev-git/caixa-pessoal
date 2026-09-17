import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseCsvImport, parseJsonImport } from "@/lib/import/parse";
import { buildImportPreview, confirmImport } from "@/lib/import/engine";
import type { ConfirmActions } from "@/lib/import/engine";

export async function GET() {
  const batches = await prisma.importBatch.findMany({
    orderBy: { importedAt: "desc" },
  });
  return NextResponse.json(batches);
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      const format = String(form.get("format") || "");
      const action = String(form.get("action") || "preview");

      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 });
      }

      const text = await file.text();
      let records: unknown[];

      if (format === "csv" || file.name.endsWith(".csv")) {
        records = parseCsvImport(text).records;
      } else if (format === "json" || file.name.endsWith(".json")) {
        records = parseJsonImport(JSON.parse(text)).records;
      } else {
        return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
      }

      if (action === "confirm") {
        const actionsRaw = form.get("actions");
        const actions: ConfirmActions = actionsRaw
          ? JSON.parse(String(actionsRaw))
          : {};
        const batch = await confirmImport({
          format: format === "csv" || file.name.endsWith(".csv") ? "csv" : "json",
          fileName: file.name,
          records,
          actions,
        });
        return NextResponse.json(batch, { status: 201 });
      }

      const preview = await buildImportPreview(records);
      return NextResponse.json({ preview, records });
    }

    // JSON API structured import
    const body = await req.json();
    const action = body.action ?? "preview";
    const payload = parseJsonImport(body);
    const format = (body.format as "json" | "api") || "api";

    if (action === "confirm") {
      const batch = await confirmImport({
        format,
        fileName: body.fileName,
        records: payload.records,
        actions: body.actions ?? {},
      });
      return NextResponse.json(batch, { status: 201 });
    }

    const preview = await buildImportPreview(payload.records);
    return NextResponse.json({ preview, records: payload.records });
  } catch (e) {
    console.error("Erro na importação", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro na importação" },
      { status: 400 }
    );
  }
}
