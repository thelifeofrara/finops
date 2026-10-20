import { redirect } from "next/navigation";
import { Flash } from "@/components/Flash";
import { fmt } from "@/lib/i18n";
import { getDict, getSession } from "@/lib/session";
import { requestLink } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ sent?: string; err?: string }> }) {
  if (await getSession()) redirect("/");
  const { sent, err } = await searchParams;
  const { l } = await getDict();
  const errors: Record<string, string> = { invalid: l.login.invalidEmail, too_many: l.login.tooMany, bad_link: l.login.badLink };

  if (sent) {
    return (
      <section className="narrow">
        <h1>{l.login.sentTitle}</h1>
        <p>{fmt(l.login.sentBody, { email: sent })}</p>
      </section>
    );
  }
  return (
    <section className="narrow">
      <h1>{l.login.title}</h1>
      <p className="muted">{l.login.intro}</p>
      <Flash err={err ? (errors[err] ?? null) : null} />
      <form action={requestLink} className="stack">
        <label>
          {l.login.email}
          <input name="email" type="email" autoComplete="email" required autoFocus />
        </label>
        <button type="submit">{l.login.send}</button>
      </form>
    </section>
  );
}
