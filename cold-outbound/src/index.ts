import path from "path";
import { loadTargets, Target } from "./targets";
import { TEMPLATES, mergeTemplate, EmailTemplate } from "./templates";
import { createProvider, EmailProvider } from "./providers";
import { StateTracker } from "./state";

const MAX_EMAILS_PER_DAY = 50;
const DELAY_BETWEEN_SENDS_MS = 2000;

interface RunOptions {
  targetsFile: string;
  stateFile?: string;
  dryRun: boolean;
}

function parseArgs(): RunOptions {
  const args = process.argv.slice(2);
  let targetsFile = path.join(process.cwd(), "data", "targets.json");
  let stateFile: string | undefined;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--targets":
        targetsFile = args[++i];
        break;
      case "--state":
        stateFile = args[++i];
        break;
      case "--dry-run":
        dryRun = true;
        break;
      case "--help":
        printUsage();
        process.exit(0);
      default:
        console.error(`Unknown argument: ${args[i]}`);
        printUsage();
        process.exit(1);
    }
  }

  return { targetsFile, stateFile, dryRun };
}

function printUsage(): void {
  console.log(`
Cold Outbound Email Sender
==========================

Usage: npx tsx src/index.ts [options]

Options:
  --targets <path>   Path to targets file (JSON or CSV). Default: data/targets.json
  --state <path>     Path to send state file. Default: data/send-state.json
  --dry-run          Print what would be sent without actually sending
  --help             Show this help message

Environment Variables:
  OUTBOUND_PROVIDER    Email provider: resend | sendgrid | smtp (default: resend)
  OUTBOUND_API_KEY     API key for the selected provider
  OUTBOUND_FROM_EMAIL  Sender email address (default: brandon@kay.ai)
  OUTBOUND_FROM_NAME   Sender display name (default: Brandon)

  SMTP-only:
  SMTP_HOST            SMTP server host (default: localhost)
  SMTP_PORT            SMTP server port (default: 587)
  SMTP_USER            SMTP username
  SMTP_PASS            SMTP password
  SMTP_SECURE          Use TLS (default: false)

Cadence:
  Email 1 (cold open)      — sent immediately on first run
  Email 2 (value follow-up) — sent 3+ days after Email 1
  Email 3 (break-up)       — sent 7+ days after Email 1

Rate limit: ${MAX_EMAILS_PER_DAY} emails/day for cold outbound warming.
`);
}

function getNextTemplate(target: Target, state: StateTracker): EmailTemplate | null {
  const firstSend = state.getFirstSendDate(target.email);

  for (const template of TEMPLATES) {
    if (state.hasBeenSent(target.email, template.id)) {
      continue;
    }

    if (template.dayOffset === 0) {
      return template;
    }

    if (!firstSend) {
      return null;
    }

    const daysSinceFirst = (Date.now() - firstSend.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceFirst >= template.dayOffset) {
      return template;
    }

    return null;
  }

  return null;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run(): Promise<void> {
  const opts = parseArgs();

  console.log("Cold Outbound Email Sender");
  console.log("=========================");
  if (opts.dryRun) {
    console.log("*** DRY RUN MODE — no emails will be sent ***\n");
  }

  const targets = loadTargets(opts.targetsFile);
  console.log(`Loaded ${targets.length} targets from ${opts.targetsFile}`);

  const state = new StateTracker(opts.stateFile);
  const sendsToday = state.getSendsToday();
  const remaining = MAX_EMAILS_PER_DAY - sendsToday;
  console.log(`Sends today: ${sendsToday}/${MAX_EMAILS_PER_DAY} (${remaining} remaining)\n`);

  if (remaining <= 0 && !opts.dryRun) {
    console.log("Daily rate limit reached. Try again tomorrow.");
    return;
  }

  let provider: EmailProvider | null = null;
  if (!opts.dryRun) {
    provider = createProvider();
    console.log(`Email provider: ${provider.name}\n`);
  }

  let sentCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const target of targets) {
    if (sentCount >= remaining && !opts.dryRun) {
      console.log(`\nRate limit reached (${MAX_EMAILS_PER_DAY}/day). Stopping.`);
      break;
    }

    const template = getNextTemplate(target, state);
    if (!template) {
      skippedCount++;
      continue;
    }

    const { subject, body } = mergeTemplate(template, target);

    if (opts.dryRun) {
      console.log(`[DRY RUN] To: ${target.email} (${target.company})`);
      console.log(`          Template: ${template.id} (Day ${template.dayOffset})`);
      console.log(`          Subject: ${subject}`);
      console.log(`          Body preview: ${body.substring(0, 100)}...`);
      console.log();
      sentCount++;
      continue;
    }

    console.log(`Sending ${template.id} to ${target.email} (${target.company})...`);
    const result = await provider!.send(target.email, subject, body);

    state.record({
      email: target.email,
      company: target.company,
      templateId: template.id,
      sentAt: new Date().toISOString(),
      messageId: result.messageId,
      status: result.success ? "sent" : "failed",
      error: result.error,
    });

    if (result.success) {
      console.log(`  ✓ Sent (${result.messageId || "ok"})`);
      sentCount++;
    } else {
      console.log(`  ✗ Failed: ${result.error}`);
      failedCount++;
    }

    if (sentCount < remaining) {
      await sleep(DELAY_BETWEEN_SENDS_MS);
    }
  }

  console.log("\n--- Summary ---");
  console.log(`Sent: ${sentCount}`);
  console.log(`Skipped (already sent or not due): ${skippedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`Total sends today: ${sendsToday + sentCount}`);
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
