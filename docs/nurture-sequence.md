# Kay Nurture Email Sequence

Approved copy from CAN-25 (Option A, attributed SaaStr version). CEO approved March 25.

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
> https://srbdp.github.io/kay-landing/roi
>
> -- brandon

---

## Email 2: Value Proof (send Day 3 after signup)

**Delivery:** Manual from Gmail. See process below.

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

**Delivery:** Manual from Gmail. See process below.

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

## Manual Send Process (Emails 2 and 3)

Until we set up a proper ESP with automation:

1. **When a new signup comes in**, Formsubmit forwards the notification to brandon.pizzacalla@trilogy.com. Note the signup date and email address.
2. **Day 3:** Send Email 2 from Gmail using the template above. Subject: `"we tried AI support and it didn't work"`
3. **Day 7:** Send Email 3 from Gmail using the template above. Subject: `5 pilot spots left for Q2`
4. Replace `[Demo booking link]` and `[Booking link]` with the actual Calendly/booking URL once available.

### Tracking

Keep a simple spreadsheet or note with columns: `Email | Signup Date | Email 2 Sent | Email 3 Sent`

---

## Next Step: ESP Automation

When volume justifies it, migrate to a proper ESP for full automation:

- **Mailchimp free tier**: 500 contacts, 1,000 emails/month. Has Customer Journey builder for drip sequences. Replace Formsubmit with Mailchimp embedded form or API.
- **Kit (ConvertKit) free tier**: 10,000 subscribers. Visual automation builder. More generous free tier.
- **Loops**: Built for SaaS. Simple drip sequences. Free up to 1,000 contacts.

Recommendation: Kit (ConvertKit) -- most generous free tier, simple automation, good for low-volume SaaS.
