import { getAllLeads, getStaleLeads } from "./store.js";
import { STAGE_ORDER } from "./types.js";
import type { Lead, LeadSource, PipelineStage } from "./types.js";

function pad(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : str + " ".repeat(len - str.length);
}

function stageLabel(stage: PipelineStage): string {
  const labels: Record<PipelineStage, string> = {
    new: "New",
    contacted: "Contacted",
    replied: "Replied",
    meeting_booked: "Meeting Booked",
    proposal_sent: "Proposal Sent",
    won: "Won",
    lost: "Lost",
  };
  return labels[stage];
}

export function printDashboard(): void {
  const leads = getAllLeads();

  if (leads.length === 0) {
    console.log("\n  No leads yet. Run `import` to pull from cold outbound or `add` to create one.\n");
    return;
  }

  // Pipeline summary
  console.log("\n  === PIPELINE SUMMARY ===\n");
  const stageCounts = new Map<PipelineStage, number>();
  for (const stage of STAGE_ORDER) stageCounts.set(stage, 0);
  for (const lead of leads) {
    stageCounts.set(lead.stage, (stageCounts.get(lead.stage) || 0) + 1);
  }

  const activeLeads = leads.filter((l) => l.stage !== "won" && l.stage !== "lost").length;
  const wonLeads = stageCounts.get("won") || 0;
  const lostLeads = stageCounts.get("lost") || 0;

  for (const stage of STAGE_ORDER) {
    const count = stageCounts.get(stage) || 0;
    const bar = "#".repeat(count);
    console.log(`  ${pad(stageLabel(stage), 16)} ${pad(String(count), 4)} ${bar}`);
  }

  console.log(`\n  Total: ${leads.length}  |  Active: ${activeLeads}  |  Won: ${wonLeads}  |  Lost: ${lostLeads}`);

  // Leads by source
  console.log("\n  === BY SOURCE ===\n");
  const sourceCounts = new Map<LeadSource, number>();
  for (const lead of leads) {
    sourceCounts.set(lead.source, (sourceCounts.get(lead.source) || 0) + 1);
  }
  for (const [source, count] of sourceCounts) {
    console.log(`  ${pad(source, 12)} ${count}`);
  }

  // Stale leads
  const stale = getStaleLeads();
  if (stale.length > 0) {
    console.log(`\n  === STALE LEADS (no activity 7+ days) ===\n`);
    for (const lead of stale) {
      const daysSince = Math.floor(
        (Date.now() - new Date(lead.lastContactDate).getTime()) / (1000 * 60 * 60 * 24),
      );
      console.log(
        `  ${pad(lead.id, 10)} ${pad(lead.company, 20)} ${pad(lead.contactName, 16)} ${pad(lead.stage, 16)} ${daysSince}d ago`,
      );
    }
  }

  console.log("");
}

export function printLeadList(leads?: Lead[]): void {
  const list = leads || getAllLeads();

  if (list.length === 0) {
    console.log("\n  No leads found.\n");
    return;
  }

  console.log(
    `\n  ${pad("ID", 10)} ${pad("Company", 20)} ${pad("Contact", 16)} ${pad("Source", 10)} ${pad("Stage", 16)} ${pad("Last Contact", 12)}`,
  );
  console.log("  " + "-".repeat(84));

  for (const lead of list) {
    const lastContact = lead.lastContactDate.split("T")[0];
    console.log(
      `  ${pad(lead.id, 10)} ${pad(lead.company, 20)} ${pad(lead.contactName, 16)} ${pad(lead.source, 10)} ${pad(lead.stage, 16)} ${lastContact}`,
    );
  }
  console.log("");
}

export function printFollowUps(): void {
  const leads = getAllLeads();
  const now = Date.now();

  // Leads in "contacted" for 3+ days need follow-up
  // Leads in "replied" for 1+ day need follow-up
  // Leads in "meeting_booked" for 2+ days need follow-up
  const thresholds: Partial<Record<PipelineStage, number>> = {
    contacted: 3,
    replied: 1,
    meeting_booked: 2,
    proposal_sent: 5,
  };

  const overdue: Array<{ lead: Lead; daysSince: number; threshold: number }> = [];

  for (const lead of leads) {
    const threshold = thresholds[lead.stage];
    if (!threshold) continue;

    const daysSince = Math.floor(
      (now - new Date(lead.lastContactDate).getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSince >= threshold) {
      overdue.push({ lead, daysSince, threshold });
    }
  }

  if (overdue.length === 0) {
    console.log("\n  No overdue follow-ups.\n");
    return;
  }

  console.log(`\n  === OVERDUE FOLLOW-UPS (${overdue.length}) ===\n`);
  console.log(
    `  ${pad("ID", 10)} ${pad("Company", 20)} ${pad("Contact", 16)} ${pad("Stage", 16)} ${pad("Overdue", 10)}`,
  );
  console.log("  " + "-".repeat(72));

  for (const { lead, daysSince, threshold } of overdue) {
    console.log(
      `  ${pad(lead.id, 10)} ${pad(lead.company, 20)} ${pad(lead.contactName, 16)} ${pad(lead.stage, 16)} ${daysSince}d (>${threshold}d)`,
    );
  }
  console.log("");
}

export function generateDashboardJson(): object {
  const leads = getAllLeads();
  const stageCounts: Record<string, number> = {};
  for (const stage of STAGE_ORDER) stageCounts[stage] = 0;
  for (const lead of leads) stageCounts[lead.stage]++;

  const sourceCounts: Record<string, number> = {};
  for (const lead of leads) {
    sourceCounts[lead.source] = (sourceCounts[lead.source] || 0) + 1;
  }

  return {
    totalLeads: leads.length,
    activeLeads: leads.filter((l) => l.stage !== "won" && l.stage !== "lost").length,
    stageCounts,
    sourceCounts,
    staleLeads: getStaleLeads().map((l) => ({
      id: l.id,
      company: l.company,
      contactName: l.contactName,
      stage: l.stage,
      daysSinceContact: Math.floor(
        (Date.now() - new Date(l.lastContactDate).getTime()) / (1000 * 60 * 60 * 24),
      ),
    })),
    leads,
    generatedAt: new Date().toISOString(),
  };
}
