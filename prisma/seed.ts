import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const categories = [
    { name: "Alimentação", color: "#10b981" },
    { name: "Moradia", color: "#6366f1" },
    { name: "Transporte", color: "#f59e0b" },
    { name: "Saúde", color: "#ef4444" },
    { name: "Streaming", color: "#8b5cf6" },
    { name: "Renda", color: "#14b8a6" },
    { name: "Eletrônicos", color: "#0ea5e9" },
    { name: "Lazer", color: "#ec4899" },
  ];

  for (const c of categories) {
    await prisma.category.upsert({
      where: { name: c.name },
      create: c,
      update: {},
    });
  }

  const tags = [
    { name: "mercado", color: "#84cc16" },
    { name: "trabalho", color: "#64748b" },
    { name: "essencial", color: "#f97316" },
  ];

  for (const t of tags) {
    await prisma.tag.upsert({
      where: { name: t.name },
      create: t,
      update: {},
    });
  }

  console.log("Seed concluído: categorias e tags iniciais");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
