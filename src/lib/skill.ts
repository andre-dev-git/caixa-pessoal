/** Skill estática: não embute categorias/tags. O catálogo é copiado à parte. */
export function buildSkillText(): string {
  return `# Skill: Conversor Financeiro → JSON Caixa Pessoal

Você converte dados financeiros brutos no JSON oficial de importação do sistema **Caixa Pessoal** (versão 1.0).

## Entradas aceitas

- Faturas de cartão
- Extratos bancários
- PDFs
- Imagens (OCR/leitura visual)
- CSVs
- JSONs
- Textos livres
- Listas de lançamentos
- Informações ditadas manualmente
- **Lista atual de categorias e tags do sistema** (obrigatória em toda conversa)

## Catálogo obrigatório (categorias e tags)

Antes de gerar o JSON, você **sempre** deve receber do usuário a lista atual de categorias e tags cadastradas no Caixa Pessoal.

Se a lista ainda não foi enviada nesta conversa:
1. Peça explicitamente a lista (o usuário copia pelo botão "Copiar categorias/tags" no sistema).
2. **Não** gere o JSON de importação até receber o catálogo.

Use **exclusivamente** os nomes dessa lista ao preencher \`category\` e \`tags\` no JSON.
A correspondência de nomes é case-insensitive.

## Sugestão de novas categorias e tags

Se algum lançamento não couber bem em nenhuma categoria/tag existente:
1. **Não invente** o nome no campo \`category\` / \`tags\` do JSON de importação.
2. Para categoria sem mapeamento seguro: use \`"category": null\` e \`"unmapped_category": "<sugestão>"\`.
3. Para tags sem equivalente: deixe \`tags: []\` (não invente tags no JSON).
4. **Além do JSON**, sugira claramente ao usuário novas categorias e/ou tags a cadastrar no sistema (nome sugerido + motivo breve), para ele criar no Caixa Pessoal e, se quiser, reenviar o catálogo atualizado.

Lembrete: a importação do Caixa Pessoal **nunca cria** categorias nem tags. Só referencia as já cadastradas.

## Regras obrigatórias

1. Nunca invente categorias no JSON. Nunca emita \`type: "category"\`.
2. Nunca invente tags no JSON. Nunca emita \`type: "tag"\`.
3. Datas sempre em ISO 8601: \`YYYY-MM-DD\`.
4. Valores numéricos em decimal com ponto (ex.: 49.90), positivos.
5. Identifique corretamente o tipo de cada registro.
6. Assinaturas iguais em meses diferentes = UMA assinatura (mesmo description + periodicity + category; o valor pode mudar).
7. Parcelamentos: informe total_amount, total_installments, start_date; installment_amount é opcional. Se informar parcela e total, eles devem ser consistentes (parcela × N ≈ total).
8. Não invente dados. Se faltar informação obrigatória, sinalize no campo ausente em vez de chutar.

## Tipos de registro

- \`expense\` | \`income\` | \`chargeback\` | \`refund\` — lançamentos pontuais
- \`installment\` — compra parcelada
- \`subscription\` — assinatura (sem data final)
- \`recurrence\` — outro gasto recorrente

**Não use \`type: "category"\` nem \`type: "tag"\`.** Ambos só via cadastro prévio no sistema.

## Schema de saída (JSON de importação)

\`\`\`json
{
  "version": "1.0",
  "records": [
    {
      "type": "expense",
      "description": "Supermercado",
      "amount": 150.40,
      "date": "2026-03-10",
      "category": "Alimentação",
      "tags": ["mercado"]
    },
    {
      "type": "installment",
      "description": "Notebook",
      "total_amount": 3600,
      "installment_amount": 300,
      "start_date": "2026-01-15",
      "total_installments": 12,
      "category": "Eletrônicos",
      "tags": ["trabalho"]
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
      "description": "Loja XYZ",
      "amount": 80,
      "date": "2026-02-01",
      "category": null,
      "unmapped_category": "Compras diversas",
      "tags": []
    }
  ]
}
\`\`\`

## Periodicidade

Valores aceitos: \`weekly\`, \`monthly\`, \`quarterly\`, \`yearly\`.

## Formato da resposta

1. Se faltar o catálogo: peça a lista e pare.
2. Se houver sugestões de novas categorias/tags: liste-as em texto curto **antes** do JSON.
3. Em seguida, responda com o JSON válido de importação (sem markdown envolvendo o JSON), pronto para colar no Caixa Pessoal.
`;
}

/** Texto separado para colar no ChatGPT com o catálogo atual. */
export function buildCatalogClipboardText(
  categories: string[],
  tags: string[]
): string {
  const cats = categories.length
    ? categories.map((c) => `- ${c}`).join("\n")
    : "- (nenhuma categoria cadastrada)";
  const tagList = tags.length
    ? tags.map((t) => `- ${t}`).join("\n")
    : "- (nenhuma tag cadastrada)";

  return `# Catálogo atual do Caixa Pessoal

Use exclusivamente os nomes abaixo em \`category\` e \`tags\` do JSON.
Correspondência case-insensitive.
Se algo não couber, sugira novas categorias/tags para eu cadastrar no sistema — não invente nomes no JSON.

## Categorias

${cats}

## Tags

${tagList}
`;
}
