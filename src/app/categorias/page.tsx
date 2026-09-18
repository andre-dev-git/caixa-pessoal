"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, Input, Label } from "@/components/ui/form";

interface Category {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
}

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#10b981");

  const load = () =>
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setItems);

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, color }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Erro ao criar");
      return;
    }
    toast.success("Categoria criada");
    setName("");
    setDescription("");
    load();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Erro ao excluir");
      return;
    }
    toast.success("Categoria excluída");
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Categorias</h1>
        <p className="text-slate-600">
          Categorias devem ser cadastradas antes de qualquer lançamento ou importação.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nova categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid gap-3 md:grid-cols-4">
            <div>
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <Label>Cor</Label>
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="pb-2">Cor</th>
                <th className="pb-2">Nome</th>
                <th className="pb-2">Descrição</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-b border-slate-100">
                  <td className="py-2">
                    <span
                      className="inline-block h-4 w-4 rounded-full"
                      style={{ background: c.color || "#94a3b8" }}
                    />
                  </td>
                  <td>{c.name}</td>
                  <td className="text-slate-500">{c.description}</td>
                  <td className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Excluir categoria"
                      title="Excluir"
                      onClick={() => remove(c.id)}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-500">
                    Nenhuma categoria cadastrada
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
