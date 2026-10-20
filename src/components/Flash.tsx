export function Flash({ ok, err }: { ok?: string | null; err?: string | null }) {
  if (err) return <p className="flash error" role="alert">{err}</p>;
  if (ok) return <p className="flash ok" role="status">{ok}</p>;
  return null;
}
