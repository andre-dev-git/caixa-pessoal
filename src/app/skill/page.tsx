"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, Textarea } from "@/components/ui/form";
import { buildSkillText } from "@/lib/skill";

export default function SkillPage() {
  const [text, setText] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/tags").then((r) => r.json()),
    ]).then(([categories, tags]) => {
      setText(
        buildSkillText(
          categories.map((c: { name: string }) => c.name),
          tags.map((t: { name: string }) => t.name)
        )
      );
    });
  }, []);

  async function copy() {
    await navigator.clipboard.writeText(text);
    toast.success("Skill copiada para a área de transferência");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Integração ChatGPT Skill</h1>
          <p className="text-slate-600">
            Copie a Skill, cole no ChatGPT e use faturas/extratos/PDFs/imagens para
            gerar o JSON oficial. A lista de categorias e tags atuais já está
            embutida no texto.
          </p>
        </div>
        <Button onClick={copy}>Copiar Skill</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Texto da Skill</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            className="min-h-[480px] font-mono text-xs"
            value={text}
            readOnly
          />
        </CardContent>
      </Card>
    </div>
  );
}
