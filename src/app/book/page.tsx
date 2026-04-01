import type { Metadata } from "next";
import Link from "next/link";
import { BookingWidget } from "./booking-widget";

export const metadata: Metadata = {
  title: "Book a Demo - Kay",
  description:
    "Schedule a 30-minute demo call to see how Kay resolves Level 2 support tickets autonomously. Pick a time that works for you.",
  openGraph: {
    title: "Book a Demo - Kay",
    description:
      "Schedule a 30-minute demo call to see how Kay resolves Level 2 support tickets autonomously.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Book a Demo - Kay",
    description:
      "Schedule a 30-minute demo call to see how Kay resolves Level 2 support tickets autonomously.",
  },
};

export default function BookPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b border-gray-100 px-6 py-4">
        <Link
          href="/"
          className="text-lg font-semibold text-gray-900 transition hover:text-indigo-600"
        >
          Kay
        </Link>
      </header>

      <section className="flex flex-1 flex-col items-center px-6 py-16">
        <div className="mb-4 inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700">
          Book a Demo
        </div>

        <h1 className="mb-3 max-w-2xl text-center text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          See <span className="text-indigo-600">Kay</span> in action
        </h1>

        <p className="mb-12 max-w-xl text-center text-lg text-gray-600">
          Pick a 30-minute slot and we&apos;ll walk you through how Kay resolves
          Level 2 tickets end-to-end.
        </p>

        <BookingWidget />
      </section>

      <footer className="border-t border-gray-100 px-6 py-6 text-center text-sm text-gray-400">
        &copy; {new Date().getFullYear()} Kay. All rights reserved.
      </footer>
    </main>
  );
}
