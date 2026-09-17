import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/form";
import { CSV_COLUMNS } from "@/lib/import/parse";

export default function DocsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Formatos oficiais</h1>
        <p className="text-slate-600">
          Schema JSON 1.0 e CSV oficial para importação estruturada.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>JSON — version &quot;1.0&quot;</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Envelope: <code>{`{ "version": "1.0", "records": [...] }`}</code>
          </p>
          <p>Tipos de registro: category, tag, expense, income, chargeback, refund,
            installment, subscription, recurrence.</p>
          <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">{`{
  "version": "1.0",
  "records": [
    { "type": "category", "name": "Alimentação", "color": "#10b981" },
    { "type": "tag", "name": "mercado" },
    {
      "type": "expense",
      "description": "Supermercado",
      "amount": 150.4,
      "date": "2026-03-10",
      "category": "Alimentação",
      "tags": ["mercado"]
    },
    {
      "type": "income",
      "description": "Salário",
      "amount": 5000,
      "date": "2026-03-05",
      "category": "Renda",
      "tags": []
    },
    {
      "type": "installment",
      "description": "Notebook",
      "total_amount": 3600,
      "installment_amount": 300,
      "start_date": "2026-01-15",
      "total_installments": 12,
      "category": "Eletrônicos",
      "tags": []
    },
    {
      "type": "subscription",
      "description": "Netflix",
      "amount": 55.9,
      "start_date": "2026-01-05",
      "periodicity": "monthly",
      "status": "active",
      "category": "Streaming",
      "tags": []
    },
    {
      "type": "recurrence",
      "description": "Academia",
      "amount": 120,
      "start_date": "2026-01-01",
      "periodicity": "monthly",
      "status": "active",
      "category": "Saúde",
      "tags": []
    },
    {
      "type": "expense",
      "description": "Item sem categoria",
      "amount": 20,
      "date": "2026-03-01",
      "category": null,
      "unmapped_category": "Diversos",
      "tags": []
    }
  ]
}`}</pre>
          <ul className="list-disc space-y-1 pl-5 text-slate-700">
            <li>Datas: YYYY-MM-DD (ISO 8601)</li>
            <li>Valores: número decimal positivo</li>
            <li>Categorias/tags inexistentes rejeitam o registro (exceto type category/tag)</li>
            <li>Periodicidade: weekly | monthly | quarterly | yearly</li>
            <li>API: POST /api/imports com o mesmo JSON (action: preview | confirm)</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CSV oficial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Cabeçalho (ordem sugerida):</p>
          <code className="block overflow-x-auto rounded bg-slate-100 p-2 text-xs">
            {CSV_COLUMNS.join(",")}
          </code>
          <p>
            Tags múltiplas: separadas por <code>|</code>. Colunas não usadas podem
            ficar vazias conforme o type da linha.
          </p>
          <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">{`type,description,amount,date,category,tags,total_amount,installment_amount,start_date,total_installments,periodicity,status,name,color
category,,,,,,, ,,,,,Alimentação,#10b981
expense,Supermercado,150.40,2026-03-10,Alimentação,mercado,,,,,,,,
installment,Notebook,,,Eletrônicos,,3600,300,2026-01-15,12,,,
subscription,Netflix,55.90,,Streaming,,, ,2026-01-05,,monthly,active,,`}</pre>
        </CardContent>
      </Card>
    </div>
  );
}
