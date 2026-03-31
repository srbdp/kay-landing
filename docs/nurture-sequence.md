# Kay Nurture Sequence

Approved copy from CAN-25 (Option A, attributed SaaStr version). CEO approved March 25.

---

## UTM Tracking Convention

All outbound links to the landing page or ROI calculator must include UTM parameters so Plausible Analytics can attribute traffic to the correct source.

**Base URLs:**
- Landing page: `https://srbdp.github.io/kay-landing/`
- ROI calculator: `https://srbdp.github.io/kay-landing/roi`

**UTM parameters:**

| Parameter      | Value                                                                 |
|----------------|-----------------------------------------------------------------------|
| `utm_source`   | Channel: `linkedin`, `email`, `twitter`                               |
| `utm_medium`   | Distribution type: `organic`, `autoresponder`, `manual-email`         |
| `utm_campaign` | Time period: `week1`, `week2`, `week3`, etc.                          |
| `utm_content`  | Specific asset: `post3-csat`, `post4-nightshift`, `email1-welcome`    |

**Examples:**
```
https://srbdp.github.io/kay-landing/roi?utm_source=linkedin&utm_medium=organic&utm_campaign=week2&utm_content=post3-csat
https://srbdp.github.io/kay-landing/?utm_source=email&utm_medium=autoresponder&utm_campaign=nurture&utm_content=email1-welcome
```

**Rules:**
- Always lowercase, no spaces (use hyphens)
- `utm_content` format for LinkedIn: `post{N}-{short-topic}`
- `utm_content` format for email: `email{N}-{short-topic}`
- New weeks increment `utm_campaign` (week4, week5, etc.)

---

## Email 1: Welcome (sent immediately on signup)

**Delivery:** Automatic via Formsubmit `_autoresponse` on both landing page and ROI calculator forms.

**Subject:** here's what most support teams get wrong about AI

> hey --
>
> you're probably drowning in AI vendor emails right now so i'll be quick.
>
> most AI support tools handle Level 1 -- password resets, order status, FAQ stuff. every vendor does that. it's not interesting anymore.
>
> Level 2 is the problem. conversations that need product knowledge, context, actual judgment. that's where your team is stuck, and where most AI taps out.
>
> Kay resolves 40% of Level 2 conversations. plugs into whatever helpdesk you're already running -- Zendesk, Freshdesk, Intercom, Salesforce. no migration. live in days.
>
> if you want to see the math for your ticket volume, the ROI calculator is here:
>
> https://srbdp.github.io/kay-landing/roi?utm_source=email&utm_medium=autoresponder&utm_campaign=nurture&utm_content=email1-welcome
>
> -- brandon

---

## Email 2: Value Proof (send Day 3 after signup)

**Delivery:** Automatic via nurture drip service (`kay-nurture-drip.fly.dev`). Sent 3 days after signup.

**Subject:** "we tried AI support and it didn't work"

> i hear this from support leaders constantly.
>
> they turned on their platform's built-in AI. resolution rates were bad. customers got more frustrated, not less. the team wrote off AI entirely.
>
> the problem isn't AI. the problem is a chatbot bolted onto a ticketing system that was designed for humans clicking buttons ten years ago. it doesn't know your product, your policies, or how your team actually handles things.
>
> Kay is a different architecture. it trains on your help center, your wikis, your actual ticket history. it picks up how your team talks.
>
> SaaStr themselves went from 20+ support staff to 3 humans + AI. revenue flipped from -19% to +47% YoY.
>
> within 90 days, Kay handles 80%+ of repetitive tickets. your people go back to the stuff that actually needs a human.
>
> reply if you want to see what the numbers look like for your setup -- or grab a time here: [Demo booking link]
>
> -- brandon

---

## Email 3: Urgency / Scarcity (send Day 7 after signup)

**Delivery:** Automatic via nurture drip service (`kay-nurture-drip.fly.dev`). Sent 7 days after signup.

**Subject:** 5 pilot spots left for Q2

> quick one --
>
> we run a hands-on pilot for support teams that want to prove AI ROI in 90 days. not self-serve. we do the onboarding with you, get you live in 1-3 days, plug into your existing helpdesk.
>
> there's a 90-day performance guarantee. $1 per ticket resolved -- not per seat.
>
> we cap it each quarter because the onboarding is genuinely hands-on. 5 spots left for Q2.
>
> teams that go through the pilot typically see 80%+ of repetitive tickets handled automatically within 90 days. and your existing helpdesk stays your system of record the whole time.
>
> ticket volumes aren't going to wait while you evaluate. grab 15 minutes and we'll tell you if Kay's a fit: [Booking link]
>
> -- brandon

---

## Automated Drip Service

Emails 2 and 3 are sent automatically by the `kay-nurture-drip` service on Fly.io.

### How it works

1. When a lead signs up on the landing page or ROI calculator, the form POSTs to both Formsubmit (Email 1 autoresponse) and the drip webhook (`https://kay-nurture-drip.fly.dev/webhook`).
2. The drip service stores the lead in a SQLite database with the signup timestamp.
3. An hourly cron job checks for leads needing Email 2 (3+ days since signup) or Email 3 (7+ days, after Email 2 sent).
4. Emails are sent via Resend (if `RESEND_API_KEY` is configured) or Formsubmit fallback.

### Admin endpoints

- `GET /health` — service health check
- `GET /leads` — list all leads and their email status
- `POST /check` — manually trigger the drip check
- `POST /webhook` — register a new lead (body: `{ "email": "..." }`)

### Upgrading to Resend

To send emails with proper from-address and custom subjects:

1. Create a free Resend account at resend.com
2. Generate an API key
3. Set it on Fly.io: `fly secrets set RESEND_API_KEY=re_xxx -a kay-nurture-drip`
4. Optionally verify a domain and set: `fly secrets set FROM_EMAIL="Brandon <brandon@yourdomain.com>" -a kay-nurture-drip`

---

## LinkedIn First-Comment Templates

First comments are posted manually by Brandon immediately after Buffer publishes each CTA post.

### Week 2 (Mar 31 - Apr 4)

**Post 3 — Wed 4/2 "The CSAT Paradox" → ROI calculator:**
```
here's the calculator -- takes about 2 minutes. plug in your ticket volume and response times and see what the numbers look like for your team. https://srbdp.github.io/kay-landing/roi?utm_source=linkedin&utm_medium=organic&utm_campaign=week2&utm_content=post3-csat
```

**Post 4 — Thu 4/3 "Three Days" → Landing page:**
```
this is what we built Kayako for. plugs into your existing helpdesk, no migration. most teams go live in days. https://srbdp.github.io/kay-landing/?utm_source=linkedin&utm_medium=organic&utm_campaign=week2&utm_content=post4-threedays
```

### Week 3 (Apr 7 - Apr 11)

**Post 3 — Wed 4/9 "When Customers Prefer AI" → ROI calculator:**
```
here's the calculator: https://srbdp.github.io/kay-landing/roi?utm_source=linkedin&utm_medium=organic&utm_campaign=week3&utm_content=post3-split -- plug in your ticket volume by category and see where AI actually helps vs where it hurts.
```

**Post 4 — Thu 4/10 "The Night Shift Problem" → Landing page:**
```
this is what we built Kayako for. plugs into your existing helpdesk, covers nights and weekends, no migration required. https://srbdp.github.io/kay-landing/?utm_source=linkedin&utm_medium=organic&utm_campaign=week3&utm_content=post4-nightshift
```

---

## Future: Full ESP Migration

When volume exceeds Resend free tier (100 emails/day), consider migrating to a full ESP:

- **Kit (ConvertKit) free tier**: 10,000 subscribers. Visual automation builder.
- **Loops**: Built for SaaS. Simple drip sequences. Free up to 1,000 contacts.
- **Mailchimp free tier**: 500 contacts, 1,000 emails/month.

The current architecture (Fly.io + SQLite + Resend) handles low-to-medium volume reliably.
