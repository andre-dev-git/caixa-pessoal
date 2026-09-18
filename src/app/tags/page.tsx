"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, Input, Label } from "@/components/ui/form";

interface Tag {
  id: string;
  name: string;
  color?: string | null;
}

export default function TagsPage() {
  const [items, setItems] = useState<Tag[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");

  const load = () =>
    fetch("/api/tags")
      .then((r) => r.json())
      .then(setItems);

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Erro ao criar");
      return;
    }
    toast.success("Tag criada");
    setName("");
    load();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/tags/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Erro ao excluir");
      return;
    }
    toast.success("Tag excluída");
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tags</h1>
        <p className="text-slate-600">
          Tags também precisam ser cadastradas previamente. Importações rejeitam tags inexistentes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nova tag</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid gap-3 md:grid-cols-3">
            <div>
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
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
          <div className="flex flex-wrap gap-2">
            {items.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm"
              >
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ background: t.color || "#94a3b8" }}
                />
                {t.name}
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Excluir tag"
                  title="Excluir"
                  onClick={() => remove(t.id)}
                  className="h-7 w-7 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-slate-500">Nenhuma tag cadastrada</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
