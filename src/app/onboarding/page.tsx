import { redirect } from "next/navigation";
import { BusinessFields } from "@/components/BusinessFields";
import { Flash } from "@/components/Flash";
import { getDict, requireUser, getSession } from "@/lib/session";
import { createBusiness } from "./actions";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const user = await requireUser();
  if ((await getSession())?.business) redirect("/");
  const { err } = await searchParams;
  const { l } = await getDict();
  const o = l.onboarding;
  return (
    <section className="narrow">
      <h1>{o.title}</h1>
      <p className="muted">{o.intro}</p>
      <Flash err={err === "voen" ? o.errVoen : err ? o.errRequired : null} />
      <form action={createBusiness} className="stack">
        <BusinessFields l={l} value={{ replyToEmail: user.email }} />
        <label className="check"><input type="checkbox" name="consentTax" required /> {o.consentTax}</label>
        <label className="check"><input type="checkbox" name="consentPersonal" required /> {o.consentPersonal}</label>
        <button type="submit">{o.submit}</button>
      </form>
    </section>
  );
}
