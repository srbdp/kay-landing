import nodemailer from "nodemailer";

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailProvider {
  name: string;
  send(to: string, subject: string, body: string): Promise<SendResult>;
}

export function createProvider(): EmailProvider {
  const provider = (process.env.OUTBOUND_PROVIDER || "resend").toLowerCase();
  const apiKey = process.env.OUTBOUND_API_KEY || "";
  const fromEmail = process.env.OUTBOUND_FROM_EMAIL || "brandon@kay.ai";
  const fromName = process.env.OUTBOUND_FROM_NAME || "Brandon";

  switch (provider) {
    case "resend":
      return createResendProvider(apiKey, fromEmail, fromName);
    case "sendgrid":
      return createSendGridProvider(apiKey, fromEmail, fromName);
    case "smtp":
      return createSmtpProvider(fromEmail, fromName);
    default:
      throw new Error(`Unknown provider: ${provider}. Use resend, sendgrid, or smtp.`);
  }
}

function createResendProvider(apiKey: string, fromEmail: string, fromName: string): EmailProvider {
  if (!apiKey) throw new Error("OUTBOUND_API_KEY required for Resend provider");

  return {
    name: "resend",
    async send(to, subject, body) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(apiKey);
        const { data, error } = await resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to,
          subject,
          text: body,
        });
        if (error) {
          return { success: false, error: error.message };
        }
        return { success: true, messageId: data?.id };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  };
}

function createSendGridProvider(apiKey: string, fromEmail: string, fromName: string): EmailProvider {
  if (!apiKey) throw new Error("OUTBOUND_API_KEY required for SendGrid provider");

  return {
    name: "sendgrid",
    async send(to, subject, body) {
      try {
        const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: fromEmail, name: fromName },
            subject,
            content: [{ type: "text/plain", value: body }],
          }),
        });
        if (!res.ok) {
          const text = await res.text();
          return { success: false, error: `SendGrid ${res.status}: ${text}` };
        }
        const messageId = res.headers.get("x-message-id") || undefined;
        return { success: true, messageId };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  };
}

function createSmtpProvider(fromEmail: string, fromName: string): EmailProvider {
  const host = process.env.SMTP_HOST || "localhost";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  const secure = process.env.SMTP_SECURE === "true";

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
  });

  return {
    name: "smtp",
    async send(to, subject, body) {
      try {
        const info = await transporter.sendMail({
          from: `"${fromName}" <${fromEmail}>`,
          to,
          subject,
          text: body,
        });
        return { success: true, messageId: info.messageId };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  };
}
