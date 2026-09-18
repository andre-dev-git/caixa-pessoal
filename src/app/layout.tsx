import type { Metadata } from "next";
import { Geist_Mono, Montserrat } from "next/font/google";
import { Toaster } from "sonner";
import { Sidebar } from "@/components/layout/sidebar";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Caixa Pessoal",
  description: "Controle de gastos pessoais",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${montserrat.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full bg-slate-50 font-sans text-slate-900 antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <div className="mx-auto max-w-7xl p-6 md:p-8">{children}</div>
          </main>
        </div>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
