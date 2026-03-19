import { NextResponse } from "next/server";
import { Resend } from "resend";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export async function POST(request: Request) {
  const body = await request.json();
  const email = body.email?.trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Invalid email address" },
      { status: 400 },
    );
  }

  const resend = getResend();
  const audienceId = process.env.RESEND_AUDIENCE_ID;

  if (!resend || !audienceId) {
    console.error("Missing RESEND_API_KEY or RESEND_AUDIENCE_ID env vars");
    return NextResponse.json(
      { error: "Email service not configured" },
      { status: 500 },
    );
  }

  try {
    // Add contact to audience (idempotent — Resend deduplicates by email)
    await resend.contacts.create({
      email,
      audienceId,
      unsubscribed: false,
    });

    // Send welcome email
    const fromAddress = process.env.RESEND_FROM_EMAIL || "Kay <onboarding@resend.dev>";
    await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: "Welcome to the Kay waitlist!",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #4f46e5;">You're on the list!</h2>
          <p>Thanks for joining the Kay waitlist. We're building the AI employee for customer support — $1 per resolution, plugs into your existing helpdesk.</p>
          <p>We'll reach out as soon as early access opens. In the meantime, reply to this email if you have questions — a real human reads every reply.</p>
          <p style="color: #9ca3af; font-size: 14px; margin-top: 32px;">&mdash; The Kay team</p>
        </div>
      `,
    });

    return NextResponse.json({ message: "You're in! Check your inbox." });
  } catch (err) {
    console.error("Resend API error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
