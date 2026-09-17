"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  Textarea,
} from "@/components/ui/form";
import type { DuplicateAction, ImportPreview } from "@/lib/import/schema";

interface Batch {
  id: string;
  importedAt: string;
  format: string;
  fileName?: string | null;
  totalRecords: number;
  acceptedCount: number;
  rejectedCount: number;
  createdSummary: string;
  status: string;
}

export default function ImportsPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [format, setFormat] = useState<"csv" | "json">("json");
  const [file, setFile] = useState<File | null>(null);
  const [jsonText, setJsonText] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [records, setRecords] = useState<unknown[]>([]);
  const [actions, setActions] = useState<Record<number, DuplicateAction>>({});
  const [loading, setLoading] = useState(false);

  const load = () =>
    fetch("/api/imports")
      .then((r) => r.json())
      .then(setBatches);

  useEffect(() => {
    load();
  }, []);

  async function runPreview() {
    setLoading(true);
    try {
      if (file) {
        const form = new FormData();
        form.append("file", file);
        form.append("format", format);
        form.append("action", "preview");
        const res = await fetch("/api/imports", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Erro no preview");
          return;
        }
        setPreview(data.preview);
        setRecords(data.records);
        const defaults: Record<number, DuplicateAction> = {};
        for (const r of data.preview.records as ImportPreview["records"]) {
          if (r.isDuplicate) defaults[r.index] = "skip";
        }
        setActions(defaults);
      } else if (jsonText.trim()) {
        const payload = JSON.parse(jsonText);
        const res = await fetch("/api/imports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, action: "preview", format: "json" }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Erro no preview");
          return;
        }
        setPreview(data.preview);
        setRecords(data.records);
        const defaults: Record<number, DuplicateAction> = {};
        for (const r of data.preview.records as ImportPreview["records"]) {
          if (r.isDuplicate) defaults[r.index] = "skip";
        }
        setActions(defaults);
      } else {
        toast.error("Selecione um arquivo ou cole um JSON");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    setLoading(true);
    try {
      let res: Response;
      if (file) {
        const form = new FormData();
        form.append("file", file);
        form.append("format", format);
        form.append("action", "confirm");
        form.append("actions", JSON.stringify(actions));
        res = await fetch("/api/imports", { method: "POST", body: form });
      } else {
        res = await fetch("/api/imports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            version: "1.0",
            records,
            action: "confirm",
            format: "json",
            actions,
          }),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao confirmar");
        return;
      }
      toast.success("Importação confirmada");
      setPreview(null);
      setRecords([]);
      setFile(null);
      setJsonText("");
      load();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Importações</h1>
        <p className="text-slate-600">
          CSV, JSON ou API. Preview obrigatório com erros por campo e duplicidades.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nova importação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Select
              value={format}
              onChange={(e) => setFormat(e.target.value as "csv" | "json")}
              className="w-40"
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
            </Select>
            <input
              type="file"
              accept={format === "csv" ? ".csv,text/csv" : ".json,application/json"}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div>
            <p className="mb-1 text-sm text-slate-600">
              Ou cole o JSON oficial (ex.: gerado pela Skill):
            </p>
            <Textarea
              rows={8}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder='{"version":"1.0","records":[...]}'
            />
          </div>
          <Button onClick={runPreview} disabled={loading}>
            {loading ? "Processando..." : "Gerar preview"}
          </Button>
        </CardContent>
      </Card>

      {preview && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge>Total: {preview.total}</Badge>
              <Badge className="bg-emerald-100 text-emerald-800">
                Válidos: {preview.validCount}
              </Badge>
              <Badge className="bg-red-100 text-red-800">
                Inválidos: {preview.invalidCount}
              </Badge>
              <Badge className="bg-amber-100 text-amber-800">
                Duplicidades: {preview.duplicateCount}
              </Badge>
            </div>
            {preview.invalidCategories.length > 0 && (
              <p className="text-sm text-red-700">
                Categorias inválidas: {preview.invalidCategories.join(", ")}
              </p>
            )}
            {preview.invalidTags.length > 0 && (
              <p className="text-sm text-red-700">
                Tags inválidas: {preview.invalidTags.join(", ")}
              </p>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="pb-2">#</th>
                    <th className="pb-2">Tipo</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Erros / Duplicata</th>
                    <th className="pb-2">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.records.map((r) => (
                    <tr key={r.index} className="border-b border-slate-100 align-top">
                      <td className="py-2">{r.index + 1}</td>
                      <td>{r.recordType}</td>
                      <td>
                        {r.valid ? (
                          <span className="text-emerald-700">Válido</span>
                        ) : (
                          <span className="text-red-700">Inválido</span>
                        )}
                        {r.isDuplicate && (
                          <Badge className="ml-2 bg-amber-100 text-amber-800">
                            Duplicata
                          </Badge>
                        )}
                      </td>
                      <td>
                        {r.errors.map((e, i) => (
                          <div key={i} className="text-red-600">
                            <strong>{e.field}</strong>: {e.message}
                          </div>
                        ))}
                        {r.duplicateOf && (
                          <div className="text-amber-700">
                            Possível duplicata de {r.duplicateOf.entity}:{" "}
                            {r.duplicateOf.label}
                          </div>
                        )}
                      </td>
                      <td>
                        {r.isDuplicate && r.valid ? (
                          <Select
                            value={actions[r.index] ?? "skip"}
                            onChange={(e) =>
                              setActions({
                                ...actions,
                                [r.index]: e.target.value as DuplicateAction,
                              })
                            }
                          >
                            <option value="skip">Ignorar</option>
                            <option value="import">Importar mesmo assim</option>
                            <option value="link">Vincular ao existente</option>
                          </Select>
                        ) : r.valid ? (
                          "Importar"
                        ) : (
                          "Rejeitado"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button
              onClick={confirm}
              disabled={loading || preview.validCount === 0}
            >
              Confirmar importação
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="pb-2">ID</th>
                <th className="pb-2">Data</th>
                <th className="pb-2">Formato</th>
                <th className="pb-2">Arquivo</th>
                <th className="pb-2">Aceitos</th>
                <th className="pb-2">Status</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} className="border-b border-slate-100">
                  <td className="py-2 font-mono text-xs">{b.id.slice(0, 8)}…</td>
                  <td>{new Date(b.importedAt).toLocaleString("pt-BR")}</td>
                  <td>{b.format}</td>
                  <td>{b.fileName || "—"}</td>
                  <td>
                    {b.acceptedCount}/{b.totalRecords} (rej. {b.rejectedCount})
                  </td>
                  <td>
                    <Badge
                      className={
                        b.status === "reverted"
                          ? "bg-slate-200"
                          : "bg-emerald-100 text-emerald-800"
                      }
                    >
                      {b.status === "reverted" ? "Revertida" : "Concluída"}
                    </Badge>
                  </td>
                  <td className="text-right">
                    <Link href={`/importacoes/${b.id}`}>
                      <Button size="sm" variant="outline">
                        Detalhes
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
