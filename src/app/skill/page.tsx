"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Textarea,
} from "@/components/ui/form";
import { buildCatalogClipboardText, buildSkillText } from "@/lib/skill";

const STATIC_SKILL = buildSkillText();

export default function SkillPage() {
  const [catalogText, setCatalogText] = useState("");
  const [categoryCount, setCategoryCount] = useState(0);
  const [tagCount, setTagCount] = useState(0);

  useEffect(() => {
    Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/tags").then((r) => r.json()),
    ]).then(([categories, tags]) => {
      const catNames = categories.map((c: { name: string }) => c.name);
      const tagNames = tags.map((t: { name: string }) => t.name);
      setCategoryCount(catNames.length);
      setTagCount(tagNames.length);
      setCatalogText(buildCatalogClipboardText(catNames, tagNames));
    });
  }, []);

  async function copySkill() {
    await navigator.clipboard.writeText(STATIC_SKILL);
    toast.success("Skill copiada para a área de transferência");
  }

  async function copyCatalog() {
    if (!catalogText) {
      toast.error("Catálogo ainda não carregou");
      return;
    }
    await navigator.clipboard.writeText(catalogText);
    toast.success(
      `Categorias (${categoryCount}) e tags (${tagCount}) copiadas`
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Integração ChatGPT Skill</h1>
          <p className="text-slate-600">
            A Skill é estática: cole uma vez no ChatGPT. Em cada conversa (ou
            quando o catálogo mudar), copie e envie também as categorias/tags
            atuais. O modelo deve sugerir novas categorias/tags quando faltar
            mapeamento — você cadastra no sistema antes de importar.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button onClick={copySkill}>Copiar Skill</Button>
          <Button variant="secondary" onClick={copyCatalog}>
            Copiar categorias/tags
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Texto da Skill (estático)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            className="min-h-[360px] font-mono text-xs"
            value={STATIC_SKILL}
            readOnly
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Catálogo atual ({categoryCount} categorias · {tagCount} tags)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            className="min-h-[220px] font-mono text-xs"
            value={catalogText || "Carregando..."}
            readOnly
          />
        </CardContent>
      </Card>
    </div>
  );
}
