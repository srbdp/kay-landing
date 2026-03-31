export type LeadSource = "outbound" | "linkedin" | "inbound";

export type PipelineStage =
  | "new"
  | "contacted"
  | "replied"
  | "meeting_booked"
  | "proposal_sent"
  | "won"
  | "lost";

export const STAGE_ORDER: PipelineStage[] = [
  "new",
  "contacted",
  "replied",
  "meeting_booked",
  "proposal_sent",
  "won",
  "lost",
];

export interface Lead {
  id: string;
  company: string;
  contactName: string;
  email: string;
  title?: string;
  source: LeadSource;
  stage: PipelineStage;
  notes: string;
  lastContactDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadStore {
  leads: Lead[];
  lastImportAt?: string;
}
