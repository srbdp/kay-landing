import Link from "next/link";
import { SignupForm } from "./signup-form";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <div className="mb-6 inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700">
          Early access &mdash; now accepting waitlist
        </div>

        <h1 className="max-w-3xl text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          The AI employee for{" "}
          <span className="text-indigo-600">customer support</span>
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-relaxed text-gray-600">
          Kay resolves support tickets end-to-end so your team can focus on what
          matters. Plugs into Zendesk, costs $1 per resolution. Zero tickets,
          zero cost.
        </p>

        <ul className="mt-8 flex flex-col gap-2 text-left text-sm text-gray-500">
          <li className="flex items-center gap-2">
            <span className="text-indigo-600">&#10003;</span> Resolves tickets
            autonomously &mdash; not just triage
          </li>
          <li className="flex items-center gap-2">
            <span className="text-indigo-600">&#10003;</span> Plugs into your
            existing helpdesk in minutes
          </li>
          <li className="flex items-center gap-2">
            <span className="text-indigo-600">&#10003;</span> Pay per resolution
            &mdash; no contracts, cancel anytime
          </li>
        </ul>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/book"
            className="rounded-lg bg-indigo-600 px-8 py-3 font-medium text-white transition hover:bg-indigo-700"
          >
            Book a Demo
          </Link>
          <span className="text-sm text-gray-400">or</span>
          <SignupForm />
        </div>

        <p className="mt-16 text-sm text-gray-400">
          No spam. Unsubscribe anytime. We&apos;ll only reach out when it
          matters.
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-6 text-center text-sm text-gray-400">
        &copy; {new Date().getFullYear()} Kay. All rights reserved.
      </footer>
    </main>
  );
}
