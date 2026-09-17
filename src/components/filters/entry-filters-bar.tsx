"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Input, Label, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { ENTRY_TYPE_LABELS, ENTRY_TYPES } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
}
interface Tag {
  id: string;
  name: string;
}

export function EntryFiltersBar({
  exportEnabled = true,
}: {
  exportEnabled?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [form, setForm] = useState({
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
    categoryId: searchParams.get("categoryId") ?? "",
    tagIds: searchParams.get("tagIds") ?? "",
    type: searchParams.get("type") ?? "",
    search: searchParams.get("search") ?? "",
    origin: searchParams.get("origin") ?? "",
    punctual: searchParams.get("punctual") === "1",
    installment: searchParams.get("installment") === "1",
    subscription: searchParams.get("subscription") === "1",
    recurrence: searchParams.get("recurrence") === "1",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/tags").then((r) => r.json()),
    ]).then(([c, t]) => {
      setCategories(c);
      setTags(t);
    });
  }, []);

  const apply = useCallback(() => {
    const p = new URLSearchParams();
    Object.entries(form).forEach(([k, v]) => {
      if (typeof v === "boolean") {
        if (v) p.set(k, "1");
      } else if (v) {
        p.set(k, v);
      }
    });
    router.push(`?${p.toString()}`);
  }, [form, router]);

  const clear = () => {
    setForm({
      from: "",
      to: "",
      categoryId: "",
      tagIds: "",
      type: "",
      search: "",
      origin: "",
      punctual: false,
      installment: false,
      subscription: false,
      recurrence: false,
    });
    router.push("?");
  };

  const exportUrl = `/api/export/csv?${searchParams.toString()}`;

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid gap-3 md:grid-cols-4">
        <div>
          <Label>De</Label>
          <Input
            type="date"
            value={form.from}
            onChange={(e) => setForm({ ...form, from: e.target.value })}
          />
        </div>
        <div>
          <Label>Até</Label>
          <Input
            type="date"
            value={form.to}
            onChange={(e) => setForm({ ...form, to: e.target.value })}
          />
        </div>
        <div>
          <Label>Categoria</Label>
          <Select
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Tipo</Label>
          <Select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="">Todos</option>
            {ENTRY_TYPES.map((t) => (
              <option key={t} value={t}>
                {ENTRY_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Busca (descrição)</Label>
          <Input
            value={form.search}
            onChange={(e) => setForm({ ...form, search: e.target.value })}
            placeholder="Ex: mercado"
          />
        </div>
        <div>
          <Label>Origem</Label>
          <Select
            value={form.origin}
            onChange={(e) => setForm({ ...form, origin: e.target.value })}
          >
            <option value="">Todas</option>
            <option value="manual">Manual</option>
            <option value="import">Importação</option>
          </Select>
        </div>
        <div>
          <Label>Tags (IDs separados por vírgula)</Label>
          <Select
            value={form.tagIds}
            onChange={(e) => setForm({ ...form, tagIds: e.target.value })}
          >
            <option value="">Todas</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        {(
          [
            ["punctual", "Pontual"],
            ["installment", "Parcelado"],
            ["subscription", "Assinatura"],
            ["recurrence", "Recorrente"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
            />
            {label}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={apply}>
          Aplicar filtros
        </Button>
        <Button type="button" variant="outline" onClick={clear}>
          Limpar
        </Button>
        {exportEnabled && (
          <a href={exportUrl}>
            <Button type="button" variant="secondary">
              Exportar CSV filtrado
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}
