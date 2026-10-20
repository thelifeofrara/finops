import { redirect } from "next/navigation";
import { sendLoginLink, currentUser } from "@/lib/auth";
import { translator } from "@/lib/i18n";

export const dynamic = "force-dynamic";

async function requestLink(formData: FormData) {
  "use server";
  await sendLoginLink(String(formData.get("email") ?? ""));
  redirect("/login?sent=1");
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  if (await currentUser()) redirect("/");
  const { t } = await translator();
  const { sent, error } = await searchParams;
  return (
    <>
      <h1>{t("login_title")}</h1>
      {error ? <p className="error">{t("login_expired")}</p> : null}
      {sent ? (
        <p className="notice">{t("login_sent")}</p>
      ) : (
        <form action={requestLink} className="stack">
          <input name="email" type="email" placeholder={t("login_email")} required />
          <button type="submit">{t("login_send")}</button>
        </form>
      )}
    </>
  );
}
