import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-4xl font-bold text-gray-900">404</h1>
      <p className="mt-4 text-lg text-gray-600">Page not found.</p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white transition hover:bg-indigo-700"
      >
        Back to Home
      </Link>
    </main>
  );
}
