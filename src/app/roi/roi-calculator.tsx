"use client";

import { useState, useMemo } from "react";
import { trackEvent } from "@/lib/analytics";

const FORMSUBMIT_EMAIL = process.env.NEXT_PUBLIC_FORMSUBMIT_EMAIL;

interface Inputs {
  monthlyTickets: number;
  ticketsPerAgent: number;
  numAgents: number;
  agentCost: number;
  currentAiRate: number;
}

interface Results {
  currentCostPerTicket: number;
  projectedCostPerTicket: number;
  monthlySavings: number;
  annualSavings: number;
  agentsFreed: number;
  paybackMonths: number;
}

const ONBOARDING_COST = 15_000;
const KAY_COST_PER_RESOLUTION = 1;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDecimal(value: number, digits = 2) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function SliderInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
  format,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-sm font-semibold text-indigo-600">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-indigo-600"
      />
      <div className="flex justify-between text-xs text-gray-400">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

function ResultCard({
  label,
  value,
  highlight,
  blurred,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  blurred?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${highlight ? "border-indigo-200 bg-indigo-50" : "border-gray-200 bg-white"}`}
    >
      <p className="text-sm text-gray-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold ${highlight ? "text-indigo-600" : "text-gray-900"} ${blurred ? "select-none blur-md" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function calculateROI(inputs: Inputs): Results {
  const { monthlyTickets, numAgents, agentCost, currentAiRate } = inputs;

  const totalAgentCost = numAgents * agentCost;
  const humanTickets = monthlyTickets * (1 - currentAiRate / 100);
  const currentCostPerTicket = humanTickets > 0 ? totalAgentCost / humanTickets : 0;

  // With Kay: assume 70% AI resolution rate (conservative)
  const kayResolutionRate = Math.max(70, currentAiRate);
  const kayResolvedTickets = monthlyTickets * (kayResolutionRate / 100);
  const remainingHumanTickets = monthlyTickets - kayResolvedTickets;

  const kayCost = kayResolvedTickets * KAY_COST_PER_RESOLUTION;
  const agentsNeededForRemaining =
    remainingHumanTickets > 0 ? Math.ceil(remainingHumanTickets / (monthlyTickets / numAgents || 1)) : 0;
  const remainingAgentCost = agentsNeededForRemaining * agentCost;
  const totalKayCost = kayCost + remainingAgentCost;

  const projectedCostPerTicket = monthlyTickets > 0 ? totalKayCost / monthlyTickets : 0;
  const monthlySavings = totalAgentCost - totalKayCost;
  const annualSavings = monthlySavings * 12;
  const agentsFreed = Math.max(0, numAgents - agentsNeededForRemaining);
  const paybackMonths = monthlySavings > 0 ? ONBOARDING_COST / monthlySavings : Infinity;

  return {
    currentCostPerTicket,
    projectedCostPerTicket,
    monthlySavings: Math.max(0, monthlySavings),
    annualSavings: Math.max(0, annualSavings),
    agentsFreed,
    paybackMonths,
  };
}

export function ROICalculator() {
  const [inputs, setInputs] = useState<Inputs>({
    monthlyTickets: 5000,
    ticketsPerAgent: 500,
    numAgents: 10,
    agentCost: 4500,
    currentAiRate: 10,
  });

  const [email, setEmail] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [submitMessage, setSubmitMessage] = useState("");

  const results = useMemo(() => calculateROI(inputs), [inputs]);

  function update<K extends keyof Inputs>(key: K, value: Inputs[K]) {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setSubmitStatus("loading");

    if (!FORMSUBMIT_EMAIL) {
      setSubmitStatus("error");
      setSubmitMessage("Sign-up service is not configured.");
      return;
    }

    try {
      const res = await fetch(`https://formsubmit.co/ajax/${FORMSUBMIT_EMAIL}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          _subject: "New waitlist signup — Kay ROI calculator",
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
        setSubmitStatus("error");
        setSubmitMessage(data.message || "Something went wrong.");
        return;
      }

      setSubmitStatus("success");
      setSubmitMessage("Report unlocked!");
      setUnlocked(true);
      trackEvent("Waitlist Signup", { source: "roi-calculator" });
    } catch {
      setSubmitStatus("error");
      setSubmitMessage("Unable to reach sign-up service. Please try again.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Inputs */}
        <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Your support team today</h2>

          <SliderInput
            label="Monthly ticket volume"
            value={inputs.monthlyTickets}
            onChange={(v) => update("monthlyTickets", v)}
            min={500}
            max={100000}
            step={500}
            format={(v) => v.toLocaleString()}
          />

          <SliderInput
            label="Number of support agents"
            value={inputs.numAgents}
            onChange={(v) => update("numAgents", v)}
            min={1}
            max={200}
            step={1}
            format={(v) => v.toString()}
          />

          <SliderInput
            label="Avg. tickets per agent / month"
            value={inputs.ticketsPerAgent}
            onChange={(v) => update("ticketsPerAgent", v)}
            min={100}
            max={2000}
            step={50}
            format={(v) => v.toLocaleString()}
          />

          <SliderInput
            label="Avg. agent fully-loaded cost / month"
            value={inputs.agentCost}
            onChange={(v) => update("agentCost", v)}
            min={2000}
            max={12000}
            step={250}
            format={formatCurrency}
          />

          <SliderInput
            label="Current AI resolution rate"
            value={inputs.currentAiRate}
            onChange={(v) => update("currentAiRate", v)}
            min={0}
            max={60}
            step={5}
            format={(v) => `${v}%`}
          />
        </div>

        {/* Results */}
        <div className="space-y-6">
          {/* Always visible: current cost per ticket + projected */}
          <div className="grid grid-cols-2 gap-4">
            <ResultCard
              label="Current cost / ticket"
              value={formatCurrency(results.currentCostPerTicket)}
            />
            <ResultCard
              label="With Kay / ticket"
              value={formatCurrency(results.projectedCostPerTicket)}
              highlight
            />
          </div>

          {/* Gated results */}
          <div className="grid grid-cols-2 gap-4">
            <ResultCard
              label="Monthly savings"
              value={formatCurrency(results.monthlySavings)}
              highlight
              blurred={!unlocked}
            />
            <ResultCard
              label="Annual savings"
              value={formatCurrency(results.annualSavings)}
              highlight
              blurred={!unlocked}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ResultCard
              label="Agents freed up"
              value={results.agentsFreed.toString()}
              blurred={!unlocked}
            />
            <ResultCard
              label="Payback period"
              value={
                results.paybackMonths === Infinity
                  ? "N/A"
                  : `${formatDecimal(results.paybackMonths, 1)} months`
              }
              blurred={!unlocked}
            />
          </div>

          {/* Email gate */}
          {!unlocked && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6">
              <p className="mb-4 text-sm font-medium text-gray-700">
                Enter your email to unlock the full savings report
              </p>
              <form onSubmit={handleUnlock} className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (submitStatus !== "idle" && submitStatus !== "loading") setSubmitStatus("idle");
                  }}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
                  disabled={submitStatus === "loading"}
                />
                <button
                  type="submit"
                  disabled={submitStatus === "loading"}
                  className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
                >
                  {submitStatus === "loading" ? "Unlocking..." : "Unlock Full Report"}
                </button>
              </form>
              {submitStatus === "error" && <p className="mt-2 text-sm text-red-500">{submitMessage}</p>}
            </div>
          )}

          {unlocked && (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-center text-sm text-green-700">
              Full report unlocked! We&apos;ll be in touch.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
