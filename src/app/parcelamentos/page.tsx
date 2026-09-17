"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  Badge,
} from "@/components/ui/form";
import { formatBRL } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
}
interface Tag {
  id: string;
  name: string;
}

interface Plan {
  id: string;
  description: string;
  totalAmountCents: number;
  installmentCents: number;
  startDate: string;
  totalInstallments: number;
  category: Category;
  tags: { tag: Tag }[];
  derived: {
    currentInstallment: number;
    occurredCount: number;
    futureCount: number;
    committedCents: number;
    lastInstallmentMonth: string;
  };
}

export default function InstallmentsPage() {
  const [items, setItems] = useState<Plan[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [form, setForm] = useState({
    description: "",
    totalAmount: "",
    installmentAmount: "",
    startDate: new Date().toISOString().slice(0, 10),
    totalInstallments: "12",
    categoryId: "",
    tagIds: [] as string[],
  });

  const load = () =>
    fetch("/api/installments")
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
    const res = await fetch("/api/installments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: form.description,
        totalAmount: Number(form.totalAmount),
        installmentAmount: form.installmentAmount
          ? Number(form.installmentAmount)
          : undefined,
        startDate: form.startDate,
        totalInstallments: Number(form.totalInstallments),
        categoryId: form.categoryId,
        tagIds: form.tagIds,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Erro");
      return;
    }
    toast.success("Parcelamento criado");
    setForm((f) => ({
      ...f,
      description: "",
      totalAmount: "",
      installmentAmount: "",
      tagIds: [],
    }));
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/installments/${id}`, { method: "DELETE" });
    toast.success("Parcelamento excluído");
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Parcelamentos</h1>
        <p className="text-slate-600">
          Cadastre a compra uma vez. O sistema calcula parcelas, comprometido e projeções.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nova compra parcelada</CardTitle>
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
              <Label>Valor total (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.totalAmount}
                onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Valor da parcela (opcional)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.installmentAmount}
                onChange={(e) =>
                  setForm({ ...form, installmentAmount: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Data inicial</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Total de parcelas</Label>
              <Input
                type="number"
                min="1"
                value={form.totalInstallments}
                onChange={(e) =>
                  setForm({ ...form, totalInstallments: e.target.value })
                }
                required
              />
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
                {tags.map((t) => {
                  const checked = form.tagIds.includes(t.id);
                  return (
                    <label key={t.id} className="text-xs">
                      <input
                        type="checkbox"
                        className="mr-1"
                        checked={checked}
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

      <div className="grid gap-4">
        {items.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex flex-col gap-3 pt-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-semibold">{p.description}</h3>
                <p className="text-sm text-slate-600">
                  {p.category.name} · início {p.startDate} · última parcela{" "}
                  {p.derived.lastInstallmentMonth}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge>
                    Parcela {p.derived.currentInstallment}/{p.totalInstallments}
                  </Badge>
                  <Badge>{p.derived.occurredCount} ocorridas</Badge>
                  <Badge>{p.derived.futureCount} futuras</Badge>
                  <Badge>
                    Comprometido {formatBRL(p.derived.committedCents)}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">
                  {formatBRL(p.totalAmountCents)}
                </p>
                <p className="text-sm text-slate-500">
                  {formatBRL(p.installmentCents)} / parcela
                </p>
                <Button
                  className="mt-2"
                  size="sm"
                  variant="destructive"
                  onClick={() => remove(p.id)}
                >
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && (
          <p className="text-slate-500">Nenhum parcelamento cadastrado</p>
        )}
      </div>
    </div>
  );
}
