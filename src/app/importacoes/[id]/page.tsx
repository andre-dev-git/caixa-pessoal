"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/form";
import { formatBRL } from "@/lib/utils";

interface Detail {
  id: string;
  importedAt: string;
  format: string;
  fileName?: string | null;
  totalRecords: number;
  acceptedCount: number;
  rejectedCount: number;
  createdSummary: string;
  status: string;
  entries: {
    id: string;
    description: string;
    amountCents: number;
    date: string;
    type: string;
    category: { name: string };
  }[];
  installmentPlans: { id: string; description: string; category: { name: string } }[];
  subscriptions: { id: string; description: string; category: { name: string } }[];
  recurrences: { id: string; description: string; category: { name: string } }[];
  categories: { id: string; name: string }[];
  tags: { id: string; name: string }[];
}

export default function ImportDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const [data, setData] = useState<Detail | null>(null);

  const load = () =>
    fetch(`/api/imports/${id}`)
      .then((r) => r.json())
      .then(setData);

  useEffect(() => {
    load();
  }, [id]);

  async function revert() {
    if (!confirm("Reverter completamente esta importação?")) return;
    const res = await fetch(`/api/imports/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "revert" }),
    });
    const body = await res.json();
    if (!res.ok) {
      toast.error(body.error || "Erro ao reverter");
      return;
    }
    toast.success("Importação revertida");
    load();
  }

  if (!data) return <div>Carregando...</div>;

  let summary: Record<string, number> = {};
  try {
    summary = JSON.parse(data.createdSummary || "{}");
  } catch {
    summary = {};
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/importacoes" className="text-sm text-emerald-700 hover:underline">
            ← Voltar
          </Link>
          <h1 className="mt-2 text-2xl font-bold">Importação</h1>
          <p className="font-mono text-xs text-slate-500">{data.id}</p>
        </div>
        {data.status !== "reverted" && (
          <Button variant="destructive" onClick={revert}>
            Reverter importação
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge>{new Date(data.importedAt).toLocaleString("pt-BR")}</Badge>
        <Badge>{data.format}</Badge>
        <Badge>{data.fileName || "sem arquivo"}</Badge>
        <Badge>
          {data.acceptedCount} aceitos / {data.rejectedCount} rejeitados
        </Badge>
        <Badge
          className={
            data.status === "reverted"
              ? "bg-slate-200"
              : "bg-emerald-100 text-emerald-800"
          }
        >
          {data.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumo criado</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="rounded bg-slate-50 p-3 text-xs">
            {JSON.stringify(summary, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lançamentos ({data.entries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="pb-2">Data</th>
                <th className="pb-2">Descrição</th>
                <th className="pb-2">Categoria</th>
                <th className="pb-2">Valor</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((e) => (
                <tr key={e.id} className="border-b border-slate-100">
                  <td className="py-2">{e.date}</td>
                  <td>{e.description}</td>
                  <td>{e.category.name}</td>
                  <td>{formatBRL(e.amountCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Parcelamentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {data.installmentPlans.map((p) => (
              <div key={p.id}>
                {p.description} · {p.category.name}
              </div>
            ))}
            {data.installmentPlans.length === 0 && "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Assinaturas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {data.subscriptions.map((p) => (
              <div key={p.id}>
                {p.description} · {p.category.name}
              </div>
            ))}
            {data.subscriptions.length === 0 && "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recorrências / Catálogo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {data.recurrences.map((p) => (
              <div key={p.id}>{p.description}</div>
            ))}
            <div className="pt-2 text-slate-500">
              Categorias: {data.categories.map((c) => c.name).join(", ") || "—"}
            </div>
            <div className="text-slate-500">
              Tags: {data.tags.map((t) => t.name).join(", ") || "—"}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
