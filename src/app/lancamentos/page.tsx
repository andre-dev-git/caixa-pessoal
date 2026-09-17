"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
} from "@/components/ui/form";
import { EntryFiltersBar } from "@/components/filters/entry-filters-bar";
import {
  ENTRY_TYPE_LABELS,
  ENTRY_TYPES,
  formatBRL,
  type EntryType,
} from "@/lib/utils";

interface Category {
  id: string;
  name: string;
}
interface Tag {
  id: string;
  name: string;
}
interface Entry {
  id: string;
  description: string;
  amountCents: number;
  date: string;
  type: string;
  origin: string;
  category: Category;
  tags: { tag: Tag }[];
  installmentPlanId?: string | null;
  subscriptionId?: string | null;
  recurrenceId?: string | null;
}

function EntriesInner() {
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [form, setForm] = useState({
    description: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    type: "expense",
    categoryId: "",
    tagIds: [] as string[],
  });

  const load = () => {
    fetch(`/api/entries?${searchParams.toString()}`)
      .then((r) => r.json())
      .then(setEntries);
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/tags").then((r) => r.json()),
    ]).then(([c, t]) => {
      setCategories(c);
      setTags(t);
      if (c[0]) setForm((f) => ({ ...f, categoryId: f.categoryId || c[0].id }));
    });
  }, []);

  useEffect(() => {
    load();
  }, [searchParams]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: form.description,
        amount: Number(form.amount),
        date: form.date,
        type: form.type,
        categoryId: form.categoryId,
        tagIds: form.tagIds,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Erro ao criar");
      return;
    }
    toast.success("Lançamento criado");
    setForm((f) => ({ ...f, description: "", amount: "", tagIds: [] }));
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/entries/${id}`, { method: "DELETE" });
    toast.success("Lançamento excluído");
    load();
  }

  function kindBadge(e: Entry) {
    if (e.installmentPlanId) return "Parcelado";
    if (e.subscriptionId) return "Assinatura";
    if (e.recurrenceId) return "Recorrente";
    return "Pontual";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lançamentos</h1>
        <p className="text-slate-600">
          Cadastro manual, busca e filtros. A exportação CSV respeita os filtros ativos.
        </p>
      </div>

      <EntryFiltersBar />

      <Card>
        <CardHeader>
          <CardTitle>Novo lançamento pontual</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2">
              <Label>Descrição</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {ENTRY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ENTRY_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-3">
              <Label>Tags</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {tags.map((t) => {
                  const checked = form.tagIds.includes(t.id);
                  return (
                    <label
                      key={t.id}
                      className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${
                        checked
                          ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                          : "border-slate-200"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mr-1"
                        checked={checked}
                        onChange={(e) => {
                          setForm({
                            ...form,
                            tagIds: e.target.checked
                              ? [...form.tagIds, t.id]
                              : form.tagIds.filter((id) => id !== t.id),
                          });
                        }}
                      />
                      {t.name}
                    </label>
                  );
                })}
              </div>
            </div>
            <div>
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto pt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="pb-2">Data</th>
                <th className="pb-2">Descrição</th>
                <th className="pb-2">Tipo</th>
                <th className="pb-2">Categoria</th>
                <th className="pb-2">Tags</th>
                <th className="pb-2">Origem</th>
                <th className="pb-2">Valor</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-slate-100">
                  <td className="py-2 whitespace-nowrap">{e.date}</td>
                  <td>
                    <div>{e.description}</div>
                    <Badge className="mt-1">{kindBadge(e)}</Badge>
                  </td>
                  <td>
                    {ENTRY_TYPE_LABELS[e.type as EntryType] ?? e.type}
                  </td>
                  <td>{e.category.name}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {e.tags.map((t) => (
                        <Badge key={t.tag.id}>{t.tag.name}</Badge>
                      ))}
                    </div>
                  </td>
                  <td>{e.origin === "import" ? "Importação" : "Manual"}</td>
                  <td className="font-medium whitespace-nowrap">
                    {formatBRL(e.amountCents)}
                  </td>
                  <td className="text-right">
                    {!e.installmentPlanId &&
                      !e.subscriptionId &&
                      !e.recurrenceId && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => remove(e.id)}
                        >
                          Excluir
                        </Button>
                      )}
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Nenhum lançamento encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function EntriesPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <EntriesInner />
    </Suspense>
  );
}
