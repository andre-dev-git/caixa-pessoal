# Caixa Pessoal

Sistema web local de controle de gastos pessoais (Next.js + SQLite).

## Como rodar

```bash
npm install
npx prisma migrate dev
npx tsx prisma/seed.ts
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no modo de desenvolvimento.

O servidor de produção sobe no logon (oculto) em [http://localhost:47193](http://localhost:47193). Na primeira vez, rode `npm run prod:install`. Depois de mudar código:

```bash
npm run prod:reset
```

Isso derruba o processo, faz o build e sobe de novo.

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
