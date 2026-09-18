"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@/components/ui/form";
import { formatBRL, formatDateBR } from "@/lib/utils";

interface SavingsSeriesPoint {
  date: string;
  balanceCents: number;
}

interface SavingsMovement {
  id: string;
  date: string;
  deltaCents: number;
  balanceAfterCents: number;
}

export default function SavingsPage() {
  const [amountCents, setAmountCents] = useState(0);
  const [series, setSeries] = useState<SavingsSeriesPoint[]>([]);
  const [movements, setMovements] = useState<SavingsMovement[]>([]);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const load = () =>
    fetch("/api/savings")
      .then((r) => r.json())
      .then((s) => {
        setAmountCents(s.amountCents);
        setSeries(s.series ?? []);
        setMovements([...(s.movements ?? [])].reverse());
      });

  useEffect(() => {
    load();
  }, []);

  async function deposit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/savings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deposit",
          amount: Number(depositAmount),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao guardar");
        return;
      }
      toast.success("Valor guardado na reserva");
      setDepositAmount("");
      setAmountCents(data.amountCents);
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function withdraw(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/savings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "withdraw",
          amount: Number(withdrawAmount),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao resgatar");
        return;
      }
      toast.success("Valor retirado da reserva");
      setWithdrawAmount("");
      setAmountCents(data.amountCents);
      await load();
    } finally {
      setLoading(false);
    }
  }

  const chartData = series.map((p) => ({
    label: formatDateBR(p.date),
    value: p.balanceCents / 100,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reserva</h1>
        <p className="text-slate-600">
          Dinheiro guardado à parte do fluxo de gastos. Guardar e resgatar só
          alteram este saldo — não criam lançamentos no caixa.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-slate-500">Saldo guardado</p>
          <p className="text-3xl font-bold text-amber-700">
            {formatBRL(amountCents)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Evolução do saldo</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">
              Sem movimentos ainda — guarde ou resgate para ver o gráfico.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip
                  formatter={(v) => formatBRL(Number(v) * 100)}
                  labelFormatter={(l) => String(l)}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#d97706"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Saldo"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Guardar</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={deposit} className="space-y-3">
              <div>
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={loading}>
                Guardar
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resgatar</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={withdraw} className="space-y-3">
              <div>
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={loading} variant="secondary">
                Resgatar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="pb-2">Data</th>
                <th className="pb-2">Movimento</th>
                <th className="pb-2">Saldo após</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-b border-slate-100">
                  <td className="py-2 whitespace-nowrap">
                    {formatDateBR(m.date)}
                  </td>
                  <td
                    className={
                      m.deltaCents >= 0
                        ? "font-medium text-emerald-700"
                        : "font-medium text-red-600"
                    }
                  >
                    {m.deltaCents >= 0 ? "+" : ""}
                    {formatBRL(m.deltaCents)}
                  </td>
                  <td>{formatBRL(m.balanceAfterCents)}</td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-slate-500">
                    Nenhum movimento registrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
