import { getDict } from "@/lib/session";
import { verifyLink } from "@/app/login/actions";

export const dynamic = "force-dynamic";

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const { l } = await getDict();
  return (
    <section className="narrow">
      <h1>{l.login.verifyTitle}</h1>
      <p className="muted">{l.login.verifyBody}</p>
      <form action={verifyLink} className="stack">
        <input type="hidden" name="token" value={token} />
        <button type="submit">{l.login.verifyButton}</button>
      </form>
    </section>
  );
}
