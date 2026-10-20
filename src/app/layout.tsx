import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getDict, getSession } from "@/lib/session";
import { LOCALES } from "@/lib/i18n";
import { logout, setLocale } from "./actions";

export const metadata: Metadata = { title: "FinOps", description: "Biznes üçün pul və mühasibat" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { l, locale } = await getDict();
  const session = await getSession();
  const n = l.nav;
  return (
    <html lang={locale}>
      <body>
        <header className="nav">
          <Link href="/" className="brand">{l.appName}</Link>
          {session?.business && (
            <nav>
              <Link href="/">{n.receivables}</Link>
              <Link href="/invoices">{n.invoices}</Link>
              <Link href="/payments">{n.payments}</Link>
              <Link href="/import">{n.imports}</Link>
              <Link href="/ledger">{n.ledger}</Link>
              <Link href="/tax">{n.tax}</Link>
              <Link href="/advance">{n.advance}</Link>
              <Link href="/settings">{n.settings}</Link>
            </nav>
          )}
          <div className="tools">
            <form action={setLocale} className="inline" aria-label={l.common.language}>
              {LOCALES.map((loc) => (
                <button key={loc} name="locale" value={loc} className={loc === locale ? "chip active" : "chip"} aria-pressed={loc === locale}>
                  {loc.toUpperCase()}
                </button>
              ))}
            </form>
            {session && (
              <form action={logout} className="inline">
                <button className="link">{l.common.logout}</button>
              </form>
            )}
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
