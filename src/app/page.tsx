"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { EntryFiltersBar } from "@/components/filters/entry-filters-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/form";
import { formatBRL } from "@/lib/utils";
import { toast } from "sonner";

const COLORS = [
  "#10b981",
  "#6366f1",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#8b5cf6",
  "#84cc16",
  "#ec4899",
];

type SpendingGranularity = "day" | "week" | "month";

interface DashboardData {
  totals: { expenses: number; income: number; balance: number };
  byCategory: { name: string; amountCents: number }[];
  spending: {
    day: { key: string; amountCents: number }[];
    week: { key: string; amountCents: number }[];
    month: { key: string; amountCents: number }[];
  };
  savingsAmountCents: number;
}

function DashboardInner() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<DashboardData | null>(null);
  const [granularity, setGranularity] = useState<SpendingGranularity>("day");
  const [resetting, setResetting] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/dashboard?${searchParams.toString()}`)
      .then((r) => r.json())
      .then(setData);
  }, [searchParams]);

  useEffect(() => {
    load();
  }, [load]);

  async function clearAccounts() {
    const ok = window.confirm(
      "Limpar todas as contas?\n\nIsso apaga lançamentos, parcelamentos, assinaturas, recorrências, importações e zera a reserva.\n\nCategorias e tags são mantidas."
    );
    if (!ok) return;
    const ok2 = window.confirm("Tem certeza? Essa ação não tem volta.");
    if (!ok2) return;

    setResetting(true);
    try {
      const res = await fetch("/api/reset", { method: "POST" });
      if (!res.ok) {
        toast.error("Erro ao limpar contas");
        return;
      }
      toast.success("Contas limpas");
      load();
    } finally {
      setResetting(false);
    }
  }

  if (!data) return <div>Carregando dashboard...</div>;

  const pieData = data.byCategory.map((c) => ({
    name: c.name,
    value: c.amountCents / 100,
  }));

  const spendingSeries = data.spending[granularity].map((p) => ({
    label: granularity === "month" ? p.key : p.key.slice(5),
    full: p.key,
    value: p.amountCents / 100,
  }));

  const granularityLabel =
    granularity === "day"
      ? "Dia a dia"
      : granularity === "week"
        ? "Semana a semana"
        : "Mês a mês";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-slate-600">
            Visão do período filtrado: categorias e evolução dos gastos.
          </p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          disabled={resetting}
          onClick={clearAccounts}
        >
          {resetting ? "Limpando..." : "Limpar contas"}
        </Button>
      </div>

      <EntryFiltersBar />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500">Despesas do período</p>
            <p className="text-2xl font-bold text-red-600">
              {formatBRL(data.totals.expenses)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-end justify-between gap-2 pt-4">
            <div>
              <p className="text-sm text-slate-500">Dinheiro guardado</p>
              <p className="text-2xl font-bold text-amber-700">
                {formatBRL(data.savingsAmountCents)}
              </p>
            </div>
            <Link href="/reserva">
              <Button size="sm" variant="outline">
                Gerenciar
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Gastos por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="py-16 text-center text-sm text-slate-500">
                Sem despesas no período
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={110}
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => formatBRL(Number(v) * 100)}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Gastos do período · {granularityLabel}</CardTitle>
            <div className="flex gap-1">
              {(
                [
                  ["day", "Dia"],
                  ["week", "Semana"],
                  ["month", "Mês"],
                ] as const
              ).map(([key, label]) => (
                <Button
                  key={key}
                  size="sm"
                  variant={granularity === key ? "default" : "outline"}
                  onClick={() => setGranularity(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {spendingSeries.length === 0 ? (
              <p className="py-16 text-center text-sm text-slate-500">
                Sem despesas no período
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={spendingSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(_, payload) =>
                      String(payload?.[0]?.payload?.full ?? "")
                    }
                    formatter={(v) => formatBRL(Number(v) * 100)}
                  />
                  <Bar dataKey="value" fill="#ef4444" name="Gastos" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <DashboardInner />
    </Suspense>
  );
}
