import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { Lead, LeadSource, LeadStore, PipelineStage } from "./types.js";

const DATA_DIR = path.join(import.meta.dirname, "..", "data");
const STORE_PATH = path.join(DATA_DIR, "leads.json");

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadStore(): LeadStore {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(STORE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { leads: [] };
  }
}

function saveStore(store: LeadStore): void {
  ensureDataDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

export function getAllLeads(): Lead[] {
  return loadStore().leads;
}

export function getLastImportAt(): string | undefined {
  return loadStore().lastImportAt;
}

export function addLead(params: {
  company: string;
  contactName: string;
  email: string;
  title?: string;
  source: LeadSource;
  stage?: PipelineStage;
  notes?: string;
}): Lead {
  const store = loadStore();
  const now = new Date().toISOString();
  const lead: Lead = {
    id: crypto.randomUUID().slice(0, 8),
    company: params.company,
    contactName: params.contactName,
    email: params.email,
    title: params.title,
    source: params.source,
    stage: params.stage || "new",
    notes: params.notes || "",
    lastContactDate: now,
    createdAt: now,
    updatedAt: now,
  };
  store.leads.push(lead);
  saveStore(store);
  return lead;
}

export function updateLead(
  id: string,
  updates: Partial<Pick<Lead, "stage" | "notes" | "lastContactDate">>,
): Lead | null {
  const store = loadStore();
  const idx = store.leads.findIndex((l) => l.id === id);
  if (idx === -1) return null;

  const lead = store.leads[idx];
  if (updates.stage) lead.stage = updates.stage;
  if (updates.notes !== undefined) lead.notes = updates.notes;
  if (updates.lastContactDate) lead.lastContactDate = updates.lastContactDate;
  lead.updatedAt = new Date().toISOString();

  store.leads[idx] = lead;
  saveStore(store);
  return lead;
}

export function findLeadByEmail(email: string): Lead | undefined {
  return loadStore().leads.find((l) => l.email === email);
}

export function setLastImportAt(date: string): void {
  const store = loadStore();
  store.lastImportAt = date;
  saveStore(store);
}

export function getStaleLeads(staleDays: number = 7): Lead[] {
  const cutoff = Date.now() - staleDays * 24 * 60 * 60 * 1000;
  return getAllLeads().filter(
    (l) =>
      l.stage !== "won" &&
      l.stage !== "lost" &&
      new Date(l.lastContactDate).getTime() < cutoff,
  );
}
