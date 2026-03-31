import { Target } from "./targets";

export interface EmailTemplate {
  id: "email1" | "email2" | "email3";
  subject: string;
  body: string;
  dayOffset: number;
}

const CALENDLY_URL = "[Calendly link]";
const ROI_URL =
  "https://srbdp.github.io/kay-landing/roi?utm_source=email&utm_medium=cold_outbound&utm_campaign=abm";

export const TEMPLATES: EmailTemplate[] = [
  {
    id: "email1",
    subject: "[Company]'s support team is about to hit a wall",
    body: `[First Name] --

I've been watching [Company] grow. [Personalization] That's great until your support queue catches up.

Most teams at your stage start drowning around 5,000 tickets a month. You hire more agents, response times still slip, CSAT drops, and the board starts asking why support costs are scaling faster than revenue.

We built Kay for exactly this. AI agent that plugs into [Current Helpdesk], no migration. Live in 1-3 days. Handles 80%+ of repetitive tickets within 90 days. Actually resolves them, not just deflects.

Worth 15 minutes to see if the math works for [Company]?

${CALENDLY_URL}

-- brandon`,
    dayOffset: 0,
  },
  {
    id: "email2",
    subject: "what $1 per resolved ticket looks like",
    body: `[First Name] --

Quick follow-up with one number: Kay resolves tickets for $1 each.

No seat licenses. No platform fees. You only pay when AI actually closes the conversation.

Most teams get to 80% automation within the first 90 days. Your existing helpdesk stays your system of record the whole time.

If you're curious what that looks like at [Company]'s volume, takes 30 seconds:

${ROI_URL}

-- brandon`,
    dayOffset: 3,
  },
  {
    id: "email3",
    subject: "closing the loop",
    body: `[First Name] --

I'll keep this short. If scaling support isn't on your radar right now, no worries, I'll stop emailing.

But if [Company] is heading into a quarter where ticket volume is going to outpace hiring -- 1-3 day deployment, 90-day performance guarantee. Happy to show you.

Either way, appreciate your time.

-- brandon`,
    dayOffset: 7,
  },
];

export function mergeTemplate(template: EmailTemplate, target: Target): { subject: string; body: string } {
  const replacements: Record<string, string> = {
    "[First Name]": target.firstName || "there",
    "[Company]": target.company,
    "[Personalization]": target.personalization || `Series-stage, ${target.employees} employees, growing fast.`,
    "[Current Helpdesk]": target.currentHelpdesk || "your current helpdesk",
  };

  let subject = template.subject;
  let body = template.body;

  for (const [placeholder, value] of Object.entries(replacements)) {
    subject = subject.replaceAll(placeholder, value);
    body = body.replaceAll(placeholder, value);
  }

  return { subject, body };
}
