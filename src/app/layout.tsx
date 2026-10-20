import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { t } from "@/lib/format";

export const metadata: Metadata = { title: "FinOps", description: "Biznes üçün pul və mühasibat" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const l = t.az;
  return (
    <html lang="az">
      <body>
        <header className="nav">
          <Link href="/" className="brand">{l.appName}</Link>
          <nav>
            <Link href="/">{l.receivables}</Link>
            <Link href="/invoices">{l.invoices}</Link>
            <Link href="/import">{l.imports}</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
