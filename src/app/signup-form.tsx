"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics";

const FORMSUBMIT_EMAIL = process.env.NEXT_PUBLIC_FORMSUBMIT_EMAIL;
const DRIP_WEBHOOK_URL = "https://kay-nurture-drip.fly.dev/webhook";

export function SignupForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");

    if (!FORMSUBMIT_EMAIL) {
      setStatus("error");
      setMessage("Sign-up service is not configured.");
      return;
    }

    try {
      const res = await fetch(`https://formsubmit.co/ajax/${FORMSUBMIT_EMAIL}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          _subject: "New waitlist signup — Kay landing page",
          _autoresponse: [
            "hey --",
            "",
            "you're probably drowning in AI vendor emails right now so i'll be quick.",
            "",
            "most AI support tools handle Level 1 -- password resets, order status, FAQ stuff. every vendor does that. it's not interesting anymore.",
            "",
            "Level 2 is the problem. conversations that need product knowledge, context, actual judgment. that's where your team is stuck, and where most AI taps out.",
            "",
            "Kay resolves 40% of Level 2 conversations. plugs into whatever helpdesk you're already running -- Zendesk, Freshdesk, Intercom, Salesforce. no migration. live in days.",
            "",
            "if you want to see the math for your ticket volume, the ROI calculator is here:",
            "",
            "https://srbdp.github.io/kay-landing/roi?utm_source=email&utm_medium=autoresponder&utm_campaign=nurture&utm_content=email1-welcome",
            "",
            "-- brandon",
          ].join("\n"),
        }),
      });

      const data = await res.json();

      if (!res.ok || data.success === "false") {
        setStatus("error");
        setMessage(data.message || "Something went wrong.");
        return;
      }

      setStatus("success");
      setMessage("You're in! We'll be in touch.");
      setEmail("");
      trackEvent("Waitlist Signup", { source: "homepage" });

      // Register lead in drip sequence for automated follow-up emails
      fetch(DRIP_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }).catch(() => {});
    } catch {
      setStatus("error");
      setMessage("Unable to reach sign-up service. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
      <input
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (status !== "idle" && status !== "loading") setStatus("idle");
        }}
        className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
        disabled={status === "loading"}
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
      >
        {status === "loading" ? "Joining..." : "Join the Waitlist"}
      </button>
      {(status === "success" || status === "error") && (
        <p
          className={`absolute mt-14 text-sm sm:mt-16 ${status === "success" ? "text-indigo-600" : "text-red-500"}`}
        >
          {message}
        </p>
      )}
    </form>
  );
}
