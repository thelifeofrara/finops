import { runReminders } from "../src/lib/reminderRun";
import { prisma } from "../src/lib/db/prisma";

// Usage:
//   npm run worker            run every WORKER_INTERVAL_MINUTES
//   npm run reminders:once    run once and exit (use from cron)
//   DRY_RUN=1 npm run ...     decide and log, do not send email

const once = process.argv.includes("--once");
const dryRun = process.env.DRY_RUN === "1";
const intervalMs = Number(process.env.WORKER_INTERVAL_MINUTES ?? 60) * 60_000;

async function tick() {
  const started = new Date().toISOString();
  const s = await runReminders(undefined, !dryRun);
  console.log(`[${started}] reminders sent=${s.sent} skipped=${s.skipped} failed=${s.failed}${dryRun ? " (dry run)" : ""}`);
}

async function main() {
  await tick();
  if (once) return;
  setInterval(() => void tick().catch((e) => console.error(e)), intervalMs);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => {
    if (once) void prisma.$disconnect();
  });
