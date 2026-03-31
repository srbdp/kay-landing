import type { Metadata } from "next";
import Link from "next/link";
import { ROICalculator } from "./roi-calculator";

export const metadata: Metadata = {
  title: "ROI Calculator - Kay",
  description:
    "See how much you could save with Kay's AI-powered customer support. Calculate your cost per ticket, monthly savings, and payback period.",
  openGraph: {
    title: "ROI Calculator - Kay",
    description:
      "See how much you could save with Kay's AI-powered customer support. Calculate your cost per ticket, monthly savings, and payback period.",
    url: "https://srbdp.github.io/kay-landing/roi",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "ROI Calculator - Kay",
    description:
      "See how much you could save with Kay's AI-powered customer support.",
  },
  alternates: {
    canonical: "https://srbdp.github.io/kay-landing/roi",
  },
};

export default function ROIPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b border-gray-100 px-6 py-4">
        <Link href="/" className="text-lg font-semibold text-gray-900 hover:text-indigo-600 transition">
          Kay
        </Link>
      </header>

      <section className="flex flex-1 flex-col items-center px-6 py-16">
        <div className="mb-4 inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700">
          ROI Calculator
        </div>

        <h1 className="mb-3 max-w-2xl text-center text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          How much could you save with{" "}
          <span className="text-indigo-600">Kay</span>?
        </h1>

        <p className="mb-12 max-w-xl text-center text-lg text-gray-600">
          Adjust the sliders to match your support team. See your projected
          savings at $1 per resolution.
        </p>

        <ROICalculator />
      </section>

      <footer className="border-t border-gray-100 px-6 py-6 text-center text-sm text-gray-400">
        &copy; {new Date().getFullYear()} Kay. All rights reserved.
      </footer>
    </main>
  );
}
