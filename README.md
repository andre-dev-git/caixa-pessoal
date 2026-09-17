# Caixa Pessoal

Sistema web local de controle de gastos pessoais (Next.js + SQLite).

## Como rodar

```bash
npm install
npx prisma migrate dev
npx tsx prisma/seed.ts
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Funcionalidades

- Lançamentos pontuais (despesa, receita, estorno, reembolso)
- Parcelamentos, assinaturas e recorrências com materialização no vencimento
- Categorias e tags pré-cadastradas (obrigatórias)
- Importação CSV/JSON/API com preview, erros por campo, duplicidades e reversão
- Dashboard com widgets configuráveis e gráficos
- Exportação CSV com filtros
- Skill do ChatGPT para gerar o JSON oficial

## API de importação

`POST /api/imports` com body:

```json
{
  "version": "1.0",
  "action": "preview",
  "records": []
}
```

Use `"action": "confirm"` e opcionalmente `"actions": { "0": "skip" }` para confirmar.
