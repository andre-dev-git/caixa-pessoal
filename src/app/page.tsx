"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import GridLayout, { type Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { EntryFiltersBar } from "@/components/filters/entry-filters-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, Input, Label } from "@/components/ui/form";
import { formatBRL } from "@/lib/utils";
import {
  eachDayOfInterval,
  endOfMonth,
  format,
  startOfMonth,
} from "date-fns";

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

interface DashboardData {
  totals: { expenses: number; income: number; balance: number };
  byCategory: { name: string; amountCents: number }[];
  byTag: { name: string; amountCents: number }[];
  byDay: { date: string; amountCents: number }[];
  byMonth: { month: string; expenses: number; income: number }[];
  topExpenses: {
    id: string;
    description: string;
    amountCents: number;
    date: string;
    category: string;
  }[];
  subscriptions: {
    id: string;
    description: string;
    amountCents: number;
    periodicity: string;
    category: string;
  }[];
  recurrences: {
    id: string;
    description: string;
    amountCents: number;
    periodicity: string;
    category: string;
  }[];
  futureInstallments: {
    description: string;
    date: string;
    amountCents: number;
    category: string;
    installment: string;
  }[];
  committedCents: number;
  comparison: {
    current: { from: string; to: string; total: number };
    previous: { from: string; to: string; total: number };
    absoluteDiff: number;
    percentDiff: number;
  };
  heatmap: { date: string; amountCents: number; intensity: number }[];
}

function Stat({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex h-full flex-col justify-center rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className={`mt-1 text-2xl font-bold ${tone || ""}`}>{value}</p>
    </div>
  );
}

function DashboardInner() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<DashboardData | null>(null);
  const [layout, setLayout] = useState<Layout[]>([]);
  const [width, setWidth] = useState(1100);
  const [chartType, setChartType] = useState<"bar" | "line" | "area" | "pie" | "donut">(
    "bar"
  );
  const [compare, setCompare] = useState({
    periodAFrom: "",
    periodATo: "",
    periodBFrom: "",
    periodBTo: "",
    result: null as null | {
      periodA: { total: number };
      periodB: { total: number };
      absoluteDiff: number;
      percentDiff: number;
    },
  });

  useEffect(() => {
    const el = document.querySelector("main .max-w-7xl") as HTMLElement | null;
    const update = () => setWidth(el?.clientWidth || window.innerWidth - 280);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const load = useCallback(() => {
    fetch(`/api/dashboard?${searchParams.toString()}`)
      .then((r) => r.json())
      .then(setData);
    fetch("/api/dashboard/layout")
      .then((r) => r.json())
      .then((d) => setLayout(d.layout));
  }, [searchParams]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveLayout(next: Layout[]) {
    setLayout(next);
    await fetch("/api/dashboard/layout", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layout: next }),
    });
  }

  async function runCompare() {
    const p = new URLSearchParams({
      ...Object.fromEntries(searchParams.entries()),
      periodAFrom: compare.periodAFrom,
      periodATo: compare.periodATo,
      periodBFrom: compare.periodBFrom,
      periodBTo: compare.periodBTo,
    });
    const res = await fetch(`/api/dashboard/compare?${p}`);
    const body = await res.json();
    if (res.ok) setCompare((c) => ({ ...c, result: body }));
  }

  const heatMap = useMemo(() => {
    if (!data) return [];
    const map = new Map(data.heatmap.map((h) => [h.date, h]));
    const now = new Date();
    const days = eachDayOfInterval({
      start: startOfMonth(now),
      end: endOfMonth(now),
    });
    return days.map((d) => {
      const key = format(d, "yyyy-MM-dd");
      const hit = map.get(key);
      return {
        date: key,
        label: format(d, "d"),
        amountCents: hit?.amountCents ?? 0,
        intensity: hit?.intensity ?? 0,
      };
    });
  }, [data]);

  if (!data) return <div>Carregando dashboard...</div>;

  const categoryData = data.byCategory.map((c) => ({
    name: c.name,
    value: c.amountCents / 100,
  }));

  function renderCategoryChart() {
    if (chartType === "pie" || chartType === "donut") {
      return (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={categoryData}
              dataKey="value"
              nameKey="name"
              innerRadius={chartType === "donut" ? 55 : 0}
              outerRadius={90}
              label
            >
              {categoryData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => formatBRL(Number(v) * 100)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );
    }
    if (chartType === "line") {
      return (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={categoryData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" hide />
            <YAxis />
            <Tooltip formatter={(v) => formatBRL(Number(v) * 100)} />
            <Line type="monotone" dataKey="value" stroke="#10b981" />
          </LineChart>
        </ResponsiveContainer>
      );
    }
    if (chartType === "area") {
      return (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={categoryData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" hide />
            <YAxis />
            <Tooltip formatter={(v) => formatBRL(Number(v) * 100)} />
            <Area type="monotone" dataKey="value" stroke="#10b981" fill="#6ee7b7" />
          </AreaChart>
        </ResponsiveContainer>
      );
    }
    return (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={categoryData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" hide />
          <YAxis />
          <Tooltip formatter={(v) => formatBRL(Number(v) * 100)} />
          <Bar dataKey="value" fill="#10b981" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  const widgets: Record<string, React.ReactNode> = {
    expenses: (
      <Stat title="Despesas" value={formatBRL(data.totals.expenses)} tone="text-red-600" />
    ),
    income: (
      <Stat title="Receitas" value={formatBRL(data.totals.income)} tone="text-emerald-600" />
    ),
    balance: (
      <Stat
        title="Saldo do período"
        value={formatBRL(data.totals.balance)}
        tone={data.totals.balance >= 0 ? "text-emerald-700" : "text-red-700"}
      />
    ),
    committed: (
      <Stat
        title="Comprometido em parcelas"
        value={formatBRL(data.committedCents)}
        tone="text-amber-700"
      />
    ),
    byCategory: (
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gastos por categoria</CardTitle>
          <select
            className="rounded border px-2 py-1 text-xs"
            value={chartType}
            onChange={(e) =>
              setChartType(e.target.value as typeof chartType)
            }
          >
            <option value="bar">Barras</option>
            <option value="line">Linhas</option>
            <option value="area">Área</option>
            <option value="pie">Pizza</option>
            <option value="donut">Donut</option>
          </select>
        </CardHeader>
        <CardContent>{renderCategoryChart()}</CardContent>
      </Card>
    ),
    byTag: (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Gastos por tag</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={data.byTag.map((t) => ({
                name: t.name,
                value: t.amountCents / 100,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(v) => formatBRL(Number(v) * 100)} />
              <Bar dataKey="value" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    ),
    daily: (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Evolução diária</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart
              data={data.byDay.map((d) => ({
                date: d.date.slice(5),
                value: d.amountCents / 100,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(v) => formatBRL(Number(v) * 100)} />
              <Area type="monotone" dataKey="value" stroke="#ef4444" fill="#fecaca" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    ),
    monthly: (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Evolução mensal · Receitas x Despesas</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={data.byMonth.map((m) => ({
                month: m.month,
                despesas: m.expenses / 100,
                receitas: m.income / 100,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(v) => formatBRL(Number(v) * 100)} />
              <Legend />
              <Bar dataKey="despesas" fill="#ef4444" />
              <Bar dataKey="receitas" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    ),
    topExpenses: (
      <Card className="h-full overflow-auto">
        <CardHeader>
          <CardTitle>Maiores gastos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data.topExpenses.map((e) => (
            <div key={e.id} className="flex justify-between gap-2 border-b py-1">
              <div>
                <div className="font-medium">{e.description}</div>
                <div className="text-xs text-slate-500">
                  {e.date} · {e.category}
                </div>
              </div>
              <div className="font-semibold">{formatBRL(e.amountCents)}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    ),
    subscriptions: (
      <Card className="h-full overflow-auto">
        <CardHeader>
          <CardTitle>Assinaturas e recorrências</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data.subscriptions.map((s) => (
            <div key={s.id} className="flex justify-between border-b py-1">
              <span>
                {s.description}{" "}
                <span className="text-xs text-slate-500">({s.periodicity})</span>
              </span>
              <span>{formatBRL(s.amountCents)}</span>
            </div>
          ))}
          {data.recurrences.map((s) => (
            <div key={s.id} className="flex justify-between border-b py-1">
              <span>
                {s.description}{" "}
                <span className="text-xs text-slate-500">recorrência</span>
              </span>
              <span>{formatBRL(s.amountCents)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    ),
    futureInstallments: (
      <Card className="h-full overflow-auto">
        <CardHeader>
          <CardTitle>Parcelas futuras</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data.futureInstallments.slice(0, 20).map((f, i) => (
            <div key={i} className="flex justify-between border-b py-1">
              <div>
                <div>{f.description}</div>
                <div className="text-xs text-slate-500">
                  {f.date} · {f.installment}
                </div>
              </div>
              <div>{formatBRL(f.amountCents)}</div>
            </div>
          ))}
          {data.futureInstallments.length === 0 && (
            <p className="text-slate-500">Nenhuma parcela futura</p>
          )}
        </CardContent>
      </Card>
    ),
    comparison: (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Comparação entre períodos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="rounded-lg bg-slate-50 p-3">
            <p>
              Mês atual ({data.comparison.current.from} → {data.comparison.current.to}
              ): <strong>{formatBRL(data.comparison.current.total)}</strong>
            </p>
            <p>
              Mês anterior ({data.comparison.previous.from} →{" "}
              {data.comparison.previous.to}):{" "}
              <strong>{formatBRL(data.comparison.previous.total)}</strong>
            </p>
            <p>
              Diferença: {formatBRL(data.comparison.absoluteDiff)} (
              {data.comparison.percentDiff.toFixed(1)}%)
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Período A de</Label>
              <Input
                type="date"
                value={compare.periodAFrom}
                onChange={(e) =>
                  setCompare({ ...compare, periodAFrom: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Período A até</Label>
              <Input
                type="date"
                value={compare.periodATo}
                onChange={(e) =>
                  setCompare({ ...compare, periodATo: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Período B de</Label>
              <Input
                type="date"
                value={compare.periodBFrom}
                onChange={(e) =>
                  setCompare({ ...compare, periodBFrom: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Período B até</Label>
              <Input
                type="date"
                value={compare.periodBTo}
                onChange={(e) =>
                  setCompare({ ...compare, periodBTo: e.target.value })
                }
              />
            </div>
          </div>
          <Button size="sm" onClick={runCompare}>
            Comparar A x B
          </Button>
          {compare.result && (
            <div className="rounded-lg border p-3">
              <p>A: {formatBRL(compare.result.periodA.total)}</p>
              <p>B: {formatBRL(compare.result.periodB.total)}</p>
              <p>
                Diff: {formatBRL(compare.result.absoluteDiff)} (
                {compare.result.percentDiff.toFixed(1)}%)
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    ),
    heatmap: (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>
            Heatmap · {format(new Date(), "MM/yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {heatMap.map((d) => (
              <div
                key={d.date}
                title={`${d.date}: ${formatBRL(d.amountCents)}`}
                className="flex aspect-square items-center justify-center rounded text-[10px] text-slate-700"
                style={{
                  background:
                    d.amountCents === 0
                      ? "#f1f5f9"
                      : `rgba(16, 185, 129, ${0.2 + d.intensity * 0.8})`,
                }}
              >
                {d.label}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    ),
    calendar: (
      <Card className="h-full overflow-auto">
        <CardHeader>
          <CardTitle>Calendário de gastos (mês atual)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 text-xs">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div key={d} className="text-center font-medium text-slate-500">
                {d}
              </div>
            ))}
            {(() => {
              const now = new Date();
              const start = startOfMonth(now);
              const pad = start.getDay();
              const cells: React.ReactNode[] = [];
              for (let i = 0; i < pad; i++) {
                cells.push(<div key={`pad-${i}`} />);
              }
              for (const d of heatMap) {
                cells.push(
                  <div
                    key={d.date}
                    className="min-h-16 rounded-lg border border-slate-100 p-1"
                  >
                    <div className="font-medium">{d.label}</div>
                    {d.amountCents > 0 && (
                      <div className="text-red-600">
                        {formatBRL(d.amountCents)}
                      </div>
                    )}
                  </div>
                );
              }
              return cells;
            })()}
          </div>
        </CardContent>
      </Card>
    ),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-slate-600">
          Widgets arrastáveis. Filtros aplicados aos gráficos e totais.
        </p>
      </div>

      <EntryFiltersBar exportEnabled />

      <GridLayout
        className="layout"
        layout={layout}
        cols={12}
        rowHeight={60}
        width={width}
        onDragStop={(l) => saveLayout(l)}
        onResizeStop={(l) => saveLayout(l)}
        draggableHandle=".drag-handle"
      >
        {layout.map((item) => (
          <div key={item.i} className="overflow-hidden">
            <div className="drag-handle mb-1 cursor-move text-[10px] uppercase tracking-wide text-slate-400">
              arrastar
            </div>
            <div className="h-[calc(100%-16px)]">{widgets[item.i]}</div>
          </div>
        ))}
      </GridLayout>
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
