"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Tags,
  FolderTree,
  CreditCard,
  Repeat,
  CalendarClock,
  Upload,
  Sparkles,
  FileText,
  PiggyBank,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reserva", label: "Reserva", icon: PiggyBank },
  { href: "/lancamentos", label: "Lançamentos", icon: ArrowLeftRight },
  { href: "/categorias", label: "Categorias", icon: FolderTree },
  { href: "/tags", label: "Tags", icon: Tags },
  { href: "/parcelamentos", label: "Parcelamentos", icon: CreditCard },
  { href: "/assinaturas", label: "Assinaturas", icon: Repeat },
  { href: "/recorrencias", label: "Recorrências", icon: CalendarClock },
  { href: "/importacoes", label: "Importações", icon: Upload },
  { href: "/skill", label: "Skill ChatGPT", icon: Sparkles },
  { href: "/docs", label: "Formatos", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 px-5 py-5">
        <p className="text-xs uppercase tracking-widest text-emerald-400">
          Pessoal
        </p>
        <h1 className="text-xl font-bold">Caixa Pessoal</h1>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {links.map(({ href, label, icon: Icon }) => {
          const active =
            mounted &&
            (href === "/" ? pathname === "/" : pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-emerald-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
