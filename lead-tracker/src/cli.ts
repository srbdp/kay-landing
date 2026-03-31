#!/usr/bin/env node

import { addLead, updateLead, getAllLeads, getStaleLeads } from "./store.js";
import { importOutbound } from "./import.js";
import {
  printDashboard,
  printLeadList,
  printFollowUps,
  generateDashboardJson,
} from "./dashboard.js";
import { STAGE_ORDER } from "./types.js";
import type { LeadSource, PipelineStage } from "./types.js";
import fs from "fs";
import path from "path";

const args = process.argv.slice(2);
const command = args[0];

function flag(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

function usage(): void {
  console.log(`
  lead-tracker — Lightweight lead pipeline tracker

  Usage: npx tsx src/cli.ts <command> [options]

  Commands:

    dashboard              Show pipeline summary, source breakdown, stale alerts
    list [--stage X]       List all leads (optionally filter by stage)
    add                    Add a new lead
      --company <name>     Company name (required)
      --name <name>        Contact name (required)
      --email <email>      Email address (required)
      --title <title>      Job title
      --source <source>    outbound | linkedin | inbound (required)
      --stage <stage>      Pipeline stage (default: new)
      --notes <text>       Notes

    update <id>            Update a lead
      --stage <stage>      New pipeline stage
      --notes <text>       Update notes
      --contacted          Set last contact date to now

    import                 Import leads from cold-outbound/data/send-state.json
      --dir <path>         Path to cold-outbound directory

    follow-ups             Show overdue follow-ups
    stale                  Show leads with no activity in 7+ days
    export-json            Write dashboard data to data/dashboard.json (for HTML UI)

  Pipeline stages: ${STAGE_ORDER.join(" → ")}
  Sources: outbound | linkedin | inbound
`);
}

function run(): void {
  switch (command) {
    case "dashboard":
    case "dash": {
      printDashboard();
      break;
    }

    case "list":
    case "ls": {
      const stageFilter = flag("stage") as PipelineStage | undefined;
      let leads = getAllLeads();
      if (stageFilter) {
        leads = leads.filter((l) => l.stage === stageFilter);
      }
      printLeadList(leads);
      break;
    }

    case "add": {
      const company = flag("company");
      const contactName = flag("name");
      const email = flag("email");
      const source = flag("source") as LeadSource | undefined;

      if (!company || !contactName || !email || !source) {
        console.error(
          "\n  Error: --company, --name, --email, and --source are required.\n",
        );
        process.exit(1);
      }

      if (!["outbound", "linkedin", "inbound"].includes(source)) {
        console.error(
          "\n  Error: --source must be outbound, linkedin, or inbound.\n",
        );
        process.exit(1);
      }

      const stage = (flag("stage") as PipelineStage) || "new";
      const title = flag("title");
      const notes = flag("notes");

      const lead = addLead({ company, contactName, email, title, source, stage, notes });
      console.log(`\n  Added lead ${lead.id}: ${lead.contactName} at ${lead.company} [${lead.source}/${lead.stage}]\n`);
      break;
    }

    case "update": {
      const id = args[1];
      if (!id) {
        console.error("\n  Error: provide a lead ID. Usage: update <id> --stage <stage>\n");
        process.exit(1);
      }

      const updates: Parameters<typeof updateLead>[1] = {};
      const newStage = flag("stage") as PipelineStage | undefined;
      const newNotes = flag("notes");
      const contacted = args.includes("--contacted");

      if (newStage) {
        if (!STAGE_ORDER.includes(newStage)) {
          console.error(`\n  Error: invalid stage. Valid: ${STAGE_ORDER.join(", ")}\n`);
          process.exit(1);
        }
        updates.stage = newStage;
      }
      if (newNotes !== undefined) updates.notes = newNotes;
      if (contacted) updates.lastContactDate = new Date().toISOString();

      const updated = updateLead(id, updates);
      if (!updated) {
        console.error(`\n  Error: lead ${id} not found.\n`);
        process.exit(1);
      }
      console.log(`\n  Updated lead ${updated.id}: ${updated.contactName} → ${updated.stage}\n`);
      break;
    }

    case "import": {
      const dir = flag("dir");
      const result = importOutbound(dir || undefined);
      console.log(
        `\n  Import complete: ${result.imported} new leads imported, ${result.skipped} already existed.\n`,
      );
      break;
    }

    case "follow-ups":
    case "followups": {
      printFollowUps();
      break;
    }

    case "stale": {
      const stale = getStaleLeads();
      if (stale.length === 0) {
        console.log("\n  No stale leads.\n");
      } else {
        console.log(`\n  ${stale.length} stale lead(s) (no activity 7+ days):\n`);
        printLeadList(stale);
      }
      break;
    }

    case "export-json": {
      const data = generateDashboardJson();
      const outPath = path.join(import.meta.dirname, "..", "data", "dashboard.json");
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
      console.log(`\n  Dashboard data written to ${outPath}\n`);
      break;
    }

    case "help":
    case "--help":
    case "-h":
    case undefined: {
      usage();
      break;
    }

    default: {
      console.error(`\n  Unknown command: ${command}\n`);
      usage();
      process.exit(1);
    }
  }
}

run();
