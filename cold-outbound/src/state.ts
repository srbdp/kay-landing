import fs from "fs";
import path from "path";

export interface SendRecord {
  email: string;
  company: string;
  templateId: string;
  sentAt: string;
  messageId?: string;
  status: "sent" | "failed";
  error?: string;
}

export interface CampaignState {
  startedAt: string;
  sends: SendRecord[];
}

const DEFAULT_STATE: CampaignState = {
  startedAt: new Date().toISOString(),
  sends: [],
};

export class StateTracker {
  private filePath: string;
  private state: CampaignState;

  constructor(filePath?: string) {
    this.filePath = filePath || path.join(process.cwd(), "data", "send-state.json");
    this.state = this.load();
  }

  private load(): CampaignState {
    try {
      const raw = fs.readFileSync(this.filePath, "utf-8");
      return JSON.parse(raw);
    } catch {
      return { ...DEFAULT_STATE, startedAt: new Date().toISOString() };
    }
  }

  save(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2));
  }

  record(entry: SendRecord): void {
    this.state.sends.push(entry);
    this.save();
  }

  getLastSend(email: string, templateId: string): SendRecord | undefined {
    return [...this.state.sends]
      .reverse()
      .find((s) => s.email === email && s.templateId === templateId && s.status === "sent");
  }

  hasBeenSent(email: string, templateId: string): boolean {
    return this.state.sends.some(
      (s) => s.email === email && s.templateId === templateId && s.status === "sent"
    );
  }

  getFirstSendDate(email: string): Date | null {
    const first = this.state.sends.find(
      (s) => s.email === email && s.templateId === "email1" && s.status === "sent"
    );
    return first ? new Date(first.sentAt) : null;
  }

  getSendsToday(): number {
    const today = new Date().toISOString().split("T")[0];
    return this.state.sends.filter(
      (s) => s.status === "sent" && s.sentAt.startsWith(today)
    ).length;
  }

  getAllSends(): SendRecord[] {
    return this.state.sends;
  }
}
