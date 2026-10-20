import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { translator } from "@/lib/i18n";
import { currentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "FinOps", description: "Get paid faster and keep your books" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = await translator();
  const user = await currentUser();
  return (
    <html lang={locale}>
      <body>
        <header className="nav">
          <Link href="/" className="brand">{t("appName")}</Link>
          {user?.business ? (
            <nav>
              <Link href="/">{t("nav_receivables")}</Link>
              <Link href="/invoices">{t("nav_invoices")}</Link>
              <Link href="/payments">{t("nav_payments")}</Link>
              <Link href="/ledger">{t("nav_ledger")}</Link>
              <Link href="/tax">{t("nav_tax")}</Link>
              <Link href="/discounting">{t("nav_discounting")}</Link>
              <Link href="/import">{t("nav_import")}</Link>
            </nav>
          ) : null}
          <div className="right">
            {/* A plain anchor: Link would prefetch this URL, and the URL changes the cookie. */}
            <a href={`/lang?to=${locale === "az" ? "en" : "az"}`}>{t("lang_switch")}</a>
            {user ? (
              <form action="/logout" method="post">
                <button type="submit" className="link">{t("logout")}</button>
              </form>
            ) : null}
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
