import { BusinessFields } from "@/components/BusinessFields";
import { Flash } from "@/components/Flash";
import { prisma } from "@/lib/db/prisma";
import { STAGES } from "@/lib/domain/reminders";
import { getDict, requireBusiness } from "@/lib/session";
import { updateBusiness, updateTemplate } from "./actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const biz = await requireBusiness();
  const [{ l }, { ok, err }, templates] = await Promise.all([
    getDict(),
    searchParams,
    prisma.reminderTemplate.findMany({ where: { businessId: biz.id } }),
  ]);
  const s = l.settings;
  const byStage = new Map(templates.map((t) => [t.stage, t]));
  return (
    <>
      <h1>{s.title}</h1>
      <Flash ok={ok ? s.saved : null} err={err === "voen" ? l.onboarding.errVoen : err ? l.onboarding.errRequired : null} />
      <h2>{s.business}</h2>
      <form action={updateBusiness} className="stack">
        <BusinessFields l={l} value={biz} />
        <button type="submit">{l.common.save}</button>
      </form>

      <h2 id="templates">{s.templates}</h2>
      <p className="muted">{s.templatesHelp}</p>
      {STAGES.map((stage) => {
        const t = byStage.get(stage);
        return (
          <details key={stage} className="card" style={{ marginBottom: 8 }}>
            <summary>{l.enums.stage[stage]}{t && !t.enabled ? ` (${l.common.no})` : ""}</summary>
            <form action={updateTemplate} className="stack wide" style={{ marginTop: 8 }}>
              <input type="hidden" name="stage" value={stage} />
              <label>{s.subject}<input name="subject" defaultValue={t?.subject ?? ""} required /></label>
              <label>{s.body}<textarea name="body" rows={7} defaultValue={t?.body ?? ""} required /></label>
              <label className="check"><input type="checkbox" name="enabled" defaultChecked={t?.enabled ?? true} /> {s.enabled}</label>
              <button type="submit">{l.common.save}</button>
            </form>
          </details>
        );
      })}
    </>
  );
}
