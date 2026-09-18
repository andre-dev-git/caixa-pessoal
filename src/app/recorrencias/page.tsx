"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
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
import {
  formatBRL,
  formatDateBR,
  PERIODICITIES,
  PERIODICITY_LABELS,
  type Periodicity,
} from "@/lib/utils";

interface Category {
  id: string;
  name: string;
}
interface Tag {
  id: string;
  name: string;
}
interface Recurrence {
  id: string;
  description: string;
  amountCents: number;
  startDate: string;
  periodicity: string;
  status: string;
  cancelledAt?: string | null;
  category: Category;
  tags: { tag: Tag }[];
  entries: { id: string; date: string }[];
}

export default function RecurrencesPage() {
  const [items, setItems] = useState<Recurrence[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [form, setForm] = useState({
    description: "",
    amount: "",
    startDate: new Date().toISOString().slice(0, 10),
    periodicity: "monthly",
    categoryId: "",
    tagIds: [] as string[],
  });

  const load = () =>
    fetch("/api/recurrences")
      .then((r) => r.json())
      .then(setItems);

  useEffect(() => {
    Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/tags").then((r) => r.json()),
    ]).then(([c, t]) => {
      setCategories(c);
      setTags(t);
      if (c[0]) setForm((f) => ({ ...f, categoryId: c[0].id }));
    });
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/recurrences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: form.description,
        amount: Number(form.amount),
        startDate: form.startDate,
        periodicity: form.periodicity,
        categoryId: form.categoryId,
        tagIds: form.tagIds,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Erro");
      return;
    }
    toast.success("Recorrência criada");
    setForm((f) => ({ ...f, description: "", amount: "", tagIds: [] }));
    load();
  }

  async function cancel(id: string) {
    await fetch(`/api/recurrences/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    toast.success("Recorrência cancelada");
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/recurrences/${id}`, { method: "DELETE" });
    toast.success("Recorrência excluída");
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Recorrências</h1>
        <p className="text-slate-600">
          Gastos recorrentes que não são assinaturas (ex.: academia, condomínio).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nova recorrência</CardTitle>
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
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Início</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Periodicidade</Label>
              <Select
                value={form.periodicity}
                onChange={(e) => setForm({ ...form, periodicity: e.target.value })}
              >
                {PERIODICITIES.map((p) => (
                  <option key={p} value={p}>
                    {PERIODICITY_LABELS[p]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
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
                {tags.map((t) => (
                  <label key={t.id} className="text-xs">
                    <input
                      type="checkbox"
                      className="mr-1"
                      checked={form.tagIds.includes(t.id)}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          tagIds: e.target.checked
                            ? [...form.tagIds, t.id]
                            : form.tagIds.filter((id) => id !== t.id),
                        })
                      }
                    />
                    {t.name}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {items.map((s) => (
          <Card key={s.id}>
            <CardContent className="flex flex-col gap-3 pt-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{s.description}</h3>
                  <Badge
                    className={
                      s.status === "active"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-200"
                    }
                  >
                    {s.status === "active" ? "Ativa" : "Cancelada"}
                  </Badge>
                </div>
                <p className="text-sm text-slate-600">
                  {s.category.name} ·{" "}
                  {PERIODICITY_LABELS[s.periodicity as Periodicity]} · desde{" "}
                  {formatDateBR(s.startDate)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{formatBRL(s.amountCents)}</p>
                <div className="mt-2 flex justify-end gap-2">
                  {s.status === "active" && (
                    <Button size="sm" variant="outline" onClick={() => cancel(s.id)}>
                      Cancelar
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Excluir recorrência"
                    title="Excluir"
                    onClick={() => remove(s.id)}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
