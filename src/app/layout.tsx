import type { Metadata } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || "";
const siteUrl = "https://srbdp.github.io/kay-landing";

export const metadata: Metadata = {
  title: "Kay - The AI Employee for Customer Support",
  description:
    "Kay resolves support tickets end-to-end. Plugs into Zendesk, costs $1 per resolution. Zero tickets, zero cost. Join the waitlist.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "Kay - The AI Employee for Customer Support",
    description:
      "Kay resolves support tickets end-to-end. Plugs into Zendesk, costs $1 per resolution. Zero tickets, zero cost.",
    url: siteUrl,
    siteName: "Kay",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "Kay - The AI Employee for Customer Support",
    description:
      "Kay resolves support tickets end-to-end. Plugs into Zendesk, costs $1 per resolution. Zero tickets, zero cost.",
  },
  alternates: {
    canonical: siteUrl,
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Kay",
  url: siteUrl,
  description:
    "Kay is an AI employee for customer support that resolves tickets end-to-end.",
};

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Kay",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "AI-powered customer support agent that resolves Level 2 tickets autonomously. Integrates with Zendesk, Freshdesk, Intercom, and Salesforce.",
  offers: {
    "@type": "Offer",
    price: "1.00",
    priceCurrency: "USD",
    description: "Per resolution pricing — zero tickets, zero cost",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What does Kay do?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Kay is an AI employee that resolves customer support tickets end-to-end — not just triage, but full resolution including Level 2 conversations that require product knowledge and judgment.",
      },
    },
    {
      "@type": "Question",
      name: "How much does Kay cost?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Kay costs $1 per resolution. Zero tickets resolved means zero cost. No contracts, cancel anytime.",
      },
    },
    {
      "@type": "Question",
      name: "What helpdesks does Kay integrate with?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Kay integrates with Zendesk, Freshdesk, Intercom, and Salesforce. It plugs into your existing helpdesk in minutes with no migration required.",
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      </head>
      <body className={inter.className}>
        {children}
        {plausibleDomain && (
          <Script
            defer
            data-domain={plausibleDomain}
            src="https://plausible.io/js/script.js"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
