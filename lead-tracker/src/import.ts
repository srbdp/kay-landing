import fs from "fs";
import path from "path";
import { addLead, findLeadByEmail, setLastImportAt } from "./store.js";

interface SendRecord {
  email: string;
  company: string;
  templateId: string;
  sentAt: string;
  messageId?: string;
  status: "sent" | "failed";
  error?: string;
}

interface CampaignState {
  startedAt: string;
  sends: SendRecord[];
}

interface Target {
  company: string;
  firstName: string;
  email: string;
  title?: string;
  [key: string]: unknown;
}

export function importOutbound(outboundDir?: string): {
  imported: number;
  skipped: number;
} {
  const baseDir =
    outboundDir || path.join(import.meta.dirname, "..", "..", "cold-outbound");
  const statePath = path.join(baseDir, "data", "send-state.json");
  const targetsPath = path.join(baseDir, "data", "targets.json");

  let targets: Target[] = [];
  if (fs.existsSync(targetsPath)) {
    targets = JSON.parse(fs.readFileSync(targetsPath, "utf-8"));
  }

  const targetMap = new Map<string, Target>();
  for (const t of targets) {
    targetMap.set(t.email, t);
  }

  let sends: SendRecord[] = [];
  if (fs.existsSync(statePath)) {
    const state: CampaignState = JSON.parse(
      fs.readFileSync(statePath, "utf-8"),
    );
    sends = state.sends.filter((s) => s.status === "sent");
  }

  // Deduplicate by email — one lead per email
  const seenEmails = new Set<string>();
  let imported = 0;
  let skipped = 0;

  for (const send of sends) {
    if (seenEmails.has(send.email)) continue;
    seenEmails.add(send.email);

    const existing = findLeadByEmail(send.email);
    if (existing) {
      skipped++;
      continue;
    }

    const target = targetMap.get(send.email);
    addLead({
      company: send.company || target?.company || "Unknown",
      contactName: target?.firstName || send.email.split("@")[0],
      email: send.email,
      title: target?.title,
      source: "outbound",
      stage: "contacted",
      notes: `Imported from cold outbound. First email sent ${send.sentAt.split("T")[0]}.`,
    });
    imported++;
  }

  setLastImportAt(new Date().toISOString());
  return { imported, skipped };
}
