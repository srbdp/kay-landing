import path from "path";
import { ImapFlow } from "imapflow";
import { StateTracker, SendRecord } from "./state";

// ---------------------------------------------------------------------------
// Lead-tracker integration (direct file import to avoid cross-package deps)
// ---------------------------------------------------------------------------
import fs from "fs";
import crypto from "crypto";

const LEAD_STORE_PATH = path.join(__dirname, "..", "..", "lead-tracker", "data", "leads.json");

interface Lead {
  id: string;
  company: string;
  contactName: string;
  email: string;
  title?: string;
  source: "outbound" | "linkedin" | "inbound";
  stage: string;
  notes: string;
  lastContactDate: string;
  createdAt: string;
  updatedAt: string;
}

interface LeadStore {
  leads: Lead[];
  lastImportAt?: string;
}

function loadLeadStore(): LeadStore {
  try {
    const raw = fs.readFileSync(LEAD_STORE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { leads: [] };
  }
}

function saveLeadStore(store: LeadStore): void {
  const dir = path.dirname(LEAD_STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(LEAD_STORE_PATH, JSON.stringify(store, null, 2));
}

function findLeadByEmail(email: string): Lead | undefined {
  return loadLeadStore().leads.find((l) => l.email === email);
}

function upsertLead(params: {
  email: string;
  company: string;
  contactName: string;
  title?: string;
  stage: string;
  notes: string;
}): { action: "created" | "updated"; lead: Lead } {
  const store = loadLeadStore();
  const now = new Date().toISOString();
  const existing = store.leads.find((l) => l.email === params.email);

  if (existing) {
    existing.stage = params.stage as Lead["stage"];
    existing.notes = params.notes;
    existing.lastContactDate = now;
    existing.updatedAt = now;
    saveLeadStore(store);
    return { action: "updated", lead: existing };
  }

  const lead: Lead = {
    id: crypto.randomUUID().slice(0, 8),
    company: params.company,
    contactName: params.contactName,
    email: params.email,
    title: params.title,
    source: "outbound",
    stage: params.stage as Lead["stage"],
    notes: params.notes,
    lastContactDate: now,
    createdAt: now,
    updatedAt: now,
  };
  store.leads.push(lead);
  saveLeadStore(store);
  return { action: "created", lead };
}

// ---------------------------------------------------------------------------
// Reply intent classification (heuristic, no AI)
// ---------------------------------------------------------------------------

type ReplyIntent = "hot" | "neutral" | "negative";

const HOT_PATTERNS = [
  /\b(meeting|demo|call|chat|schedule|book|calendar|slot|availab)\w*/i,
  /\b(pric|cost|rate|packag|plan|quot|proposal|budget)\w*/i,
  /\b(interest|intrigued|tell me more|learn more|sounds good|love to)\w*/i,
  /\b(let'?s connect|happy to|would like to|want to discuss)\b/i,
];

const NEGATIVE_PATTERNS = [
  /\b(unsubscribe|opt.?out|remove me|stop email|no longer)\b/i,
  /\b(not interested|no thanks|no thank you|pass on this|don'?t contact)\b/i,
  /\b(wrong person|not the right|not relevant)\b/i,
];

const NEUTRAL_PATTERNS = [
  /\b(out of office|ooo|auto.?reply|automatic reply|away from)\b/i,
  /\b(on vacation|on leave|on holiday|will return|returning)\b/i,
  /\b(this is an automated|do not reply to this)\b/i,
];

function classifyReply(bodyText: string): ReplyIntent {
  for (const pat of NEUTRAL_PATTERNS) {
    if (pat.test(bodyText)) return "neutral";
  }
  for (const pat of NEGATIVE_PATTERNS) {
    if (pat.test(bodyText)) return "negative";
  }
  for (const pat of HOT_PATTERNS) {
    if (pat.test(bodyText)) return "hot";
  }
  // Default: treat a human reply as positive engagement
  return "hot";
}

function intentToStage(intent: ReplyIntent): string {
  switch (intent) {
    case "hot":
      return "replied";
    case "neutral":
      return "contacted";
    case "negative":
      return "lost";
  }
}

// ---------------------------------------------------------------------------
// IMAP reply checker
// ---------------------------------------------------------------------------

interface ImapConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  tls: boolean;
}

function getImapConfig(): ImapConfig | null {
  const host = process.env.REPLY_IMAP_HOST;
  const user = process.env.REPLY_IMAP_USER;
  const pass = process.env.REPLY_IMAP_PASS;

  if (!host || !user || !pass) return null;

  return {
    host,
    port: parseInt(process.env.REPLY_IMAP_PORT || "993", 10),
    user,
    pass,
    tls: process.env.REPLY_IMAP_TLS !== "false",
  };
}

interface ReplyResult {
  email: string;
  company: string;
  contactName: string;
  subject: string;
  snippet: string;
  intent: ReplyIntent;
  date: Date;
  messageId: string;
}

function extractSnippet(text: string, maxLen = 200): string {
  // Strip quoted lines (lines starting with >) and blank lines, take first chunk
  const lines = text.split("\n").filter((l) => !l.startsWith(">") && l.trim());
  return lines.join(" ").trim().slice(0, maxLen);
}

function matchReplyToSend(
  inReplyTo: string | undefined,
  subject: string,
  fromEmail: string,
  sends: SendRecord[],
): SendRecord | undefined {
  // First try In-Reply-To / References header match
  if (inReplyTo) {
    const match = sends.find(
      (s) => s.messageId && inReplyTo.includes(s.messageId) && s.status === "sent",
    );
    if (match) return match;
  }

  // Fallback: match by sender email
  return sends.find(
    (s) => s.email.toLowerCase() === fromEmail.toLowerCase() && s.status === "sent",
  );
}

async function fetchReplies(
  config: ImapConfig,
  sends: SendRecord[],
  sinceDays: number,
): Promise<ReplyResult[]> {
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.tls,
    auth: { user: config.user, pass: config.pass },
    logger: false,
  });

  const results: ReplyResult[] = [];
  const since = new Date();
  since.setDate(since.getDate() - sinceDays);

  await client.connect();

  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const messages = client.fetch(
        { since, answered: false },
        {
          envelope: true,
          source: true,
          headers: ["in-reply-to", "references"],
        },
      );

      for await (const msg of messages) {
        const envelope = msg.envelope;
        if (!envelope?.from?.[0]?.address) continue;

        const fromEmail = envelope.from[0].address;
        const fromName = envelope.from[0].name || fromEmail.split("@")[0];
        const subject = envelope.subject || "(no subject)";
        const inReplyTo = envelope.inReplyTo;

        const send = matchReplyToSend(inReplyTo, subject, fromEmail, sends);
        if (!send) continue;

        // Extract body text from raw source
        let bodyText = "";
        if (msg.source) {
          const rawStr = msg.source.toString("utf-8");
          // Simple extraction: grab text after blank line (headers end)
          const bodyStart = rawStr.indexOf("\r\n\r\n");
          if (bodyStart !== -1) {
            bodyText = rawStr
              .slice(bodyStart + 4)
              // Strip HTML tags
              .replace(/<[^>]+>/g, " ")
              // Collapse whitespace
              .replace(/\s+/g, " ")
              .trim();
          }
        }

        const snippet = extractSnippet(bodyText);
        const intent = classifyReply(bodyText || subject);

        results.push({
          email: fromEmail,
          company: send.company,
          contactName: fromName,
          subject,
          snippet,
          intent,
          date: envelope.date || new Date(),
          messageId: envelope.messageId || "",
        });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  return results;
}

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------

interface RunOptions {
  stateFile?: string;
  sinceDays: number;
  dryRun: boolean;
}

function parseArgs(): RunOptions {
  const args = process.argv.slice(2);
  let stateFile: string | undefined;
  let sinceDays = 30;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--state":
        stateFile = args[++i];
        break;
      case "--since-days":
        sinceDays = parseInt(args[++i], 10);
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

  return { stateFile, sinceDays, dryRun };
}

function printUsage(): void {
  console.log(`
Reply Monitor — Check for outbound email replies via IMAP
==========================================================

Usage: npx tsx src/check-replies.ts [options]

Options:
  --state <path>       Path to send-state.json (default: data/send-state.json)
  --since-days <n>     Check emails from the last N days (default: 30)
  --dry-run            Show what would happen without updating leads
  --help               Show this help message

Environment Variables (required):
  REPLY_IMAP_HOST      IMAP server hostname (e.g. imap.gmail.com)
  REPLY_IMAP_USER      IMAP username / email
  REPLY_IMAP_PASS      IMAP password or app password

Optional:
  REPLY_IMAP_PORT      IMAP port (default: 993)
  REPLY_IMAP_TLS       Use TLS (default: true, set to "false" to disable)
`);
}

async function run(): Promise<void> {
  const opts = parseArgs();

  console.log("Reply Monitor");
  console.log("=============");

  const imapConfig = getImapConfig();
  if (!imapConfig) {
    console.log("\nIMAP not configured. Set these environment variables:");
    console.log("  REPLY_IMAP_HOST  — IMAP server hostname (e.g. imap.gmail.com)");
    console.log("  REPLY_IMAP_USER  — IMAP username / email");
    console.log("  REPLY_IMAP_PASS  — IMAP password or app password");
    console.log("\nExiting gracefully.");
    process.exit(0);
  }

  const state = new StateTracker(opts.stateFile);
  const sends = state.getAllSends().filter((s) => s.status === "sent");

  if (sends.length === 0) {
    console.log("\nNo sent emails found in state. Nothing to check.");
    return;
  }

  console.log(`Checking replies for ${sends.length} sent emails (last ${opts.sinceDays} days)`);
  console.log(`IMAP: ${imapConfig.user}@${imapConfig.host}:${imapConfig.port}\n`);

  const replies = await fetchReplies(imapConfig, sends, opts.sinceDays);

  if (replies.length === 0) {
    console.log("No new replies found.\n");
    console.log("--- Summary ---");
    console.log("New replies: 0");
    console.log("Leads updated: 0");
    console.log("Hot leads: 0");
    return;
  }

  console.log(`Found ${replies.length} replies:\n`);

  let leadsUpdated = 0;
  let hotCount = 0;

  for (const reply of replies) {
    const stage = intentToStage(reply.intent);
    const intentLabel =
      reply.intent === "hot" ? "🔥 HOT" : reply.intent === "negative" ? "❌ NEGATIVE" : "— NEUTRAL";

    console.log(`  ${reply.email} (${reply.company})`);
    console.log(`    Subject: ${reply.subject}`);
    console.log(`    Intent:  ${intentLabel} → stage: ${stage}`);
    if (reply.snippet) {
      console.log(`    Snippet: ${reply.snippet.slice(0, 120)}...`);
    }

    if (reply.intent === "hot") hotCount++;

    if (!opts.dryRun) {
      const notes = `Reply detected ${reply.date.toISOString().split("T")[0]}: "${reply.snippet.slice(0, 100)}" [${reply.intent}]`;
      const { action } = upsertLead({
        email: reply.email,
        company: reply.company,
        contactName: reply.contactName,
        stage,
        notes,
      });
      console.log(`    Lead: ${action}`);
      leadsUpdated++;
    } else {
      console.log(`    [DRY RUN] Would upsert lead → ${stage}`);
    }
    console.log();
  }

  console.log("--- Summary ---");
  console.log(`New replies: ${replies.length}`);
  console.log(`Leads updated: ${leadsUpdated}`);
  console.log(`Hot leads: ${hotCount}`);
  if (hotCount > 0) {
    console.log("\n⚡ Hot leads require immediate follow-up!");
  }
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
