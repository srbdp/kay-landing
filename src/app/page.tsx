import { SignupForm } from "./signup-form";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <div className="mb-6 inline-flex items-center rounded-full border border-green-200 bg-green-50 px-4 py-1.5 text-sm font-medium text-green-700">
          Now in early development
        </div>

        <h1 className="max-w-3xl text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Grow smarter with <span className="text-green-600">Canopy</span>
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-relaxed text-gray-600">
          Canopy helps teams make better decisions, faster. We&apos;re building the tools you need
          to cut through the noise and focus on what matters.
        </p>

        <div className="relative mt-10">
          <SignupForm />
        </div>

        <p className="mt-16 text-sm text-gray-400">
          No spam. Unsubscribe anytime. We&apos;ll only reach out when it matters.
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-6 text-center text-sm text-gray-400">
        &copy; {new Date().getFullYear()} Canopy. All rights reserved.
      </footer>
    </main>
  );
}
