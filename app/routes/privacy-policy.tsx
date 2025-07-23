import { Link } from "react-router";
import type { Route } from "./+types/privacy-policy";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Privacy Policy - PodClip" },
    { name: "description", content: "Privacy Policy for PodClip - AI-Powered Podcast Summaries" },
  ];
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link 
            to="/" 
            className="text-blue-600 hover:text-blue-700 text-sm font-medium inline-flex items-center gap-2"
          >
            ← Back to Home
          </Link>
        </div>

        <div className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold text-foreground mb-8">Privacy Policy</h1>
          
          <p className="text-muted-foreground mb-8">
            <strong>Effective Date:</strong> January 2025
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Podclip ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and protect your information when you use our website and services at{" "}
              <a href="https://podclip.tech" className="text-blue-600 hover:text-blue-700">https://podclip.tech</a> ("Service").
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Information We Collect</h2>
            
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-foreground mb-3">Personal Data:</h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Name</li>
                <li>Email address</li>
                <li>Payment information (processed securely via Polar.sh)</li>
              </ul>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-semibold text-foreground mb-3">Non-Personal Data:</h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Web cookies</li>
                <li>Analytics data (usage, device, browser info)</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>To provide and improve our Service</li>
              <li>To process payments and manage subscriptions</li>
              <li>To communicate with you (transactional emails via Resend)</li>
              <li>To ensure account security and authentication (via Clerk)</li>
              <li>For analytics and product improvement</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Cookies and Tracking Technologies</h2>
            <p className="text-muted-foreground mb-4">We use cookies and similar technologies to:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Maintain your session and preferences</li>
              <li>Analyze usage and improve our Service</li>
            </ul>
            <p className="text-muted-foreground mt-4">You can control cookies through your browser settings.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Data Storage and Protection</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>All personal data is stored securely using industry-standard encryption and access controls.</li>
              <li>Payment data is processed by Polar.sh and is not stored on our servers.</li>
              <li>We use Vercel, Convex, Clerk, and other trusted providers to ensure data security.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Data Sharing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do <strong>not</strong> share your personal data with third parties.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">User Rights</h2>
            <p className="text-muted-foreground mb-4">Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Access, update, or delete your personal data</li>
              <li>Object to or restrict certain processing</li>
              <li>Request data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              To exercise your rights, contact us at{" "}
              <a href="mailto:admin@podclip.tech" className="text-blue-600 hover:text-blue-700">
                admin@podclip.tech
              </a>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our Service is not intended for children under 13. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, contact us and we will delete it.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">International Users & Legal Compliance</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>We comply with GDPR (EU/EEA users) and CCPA (California users) as applicable.</li>
              <li>Data may be processed and stored in countries outside your own.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Policy Updates</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. Changes will be posted on this page with a new effective date. Your continued use of the Service constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions or requests regarding this Privacy Policy, contact us at{" "}
              <a href="mailto:admin@podclip.tech" className="text-blue-600 hover:text-blue-700">
                admin@podclip.tech
              </a>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              This policy is governed by the laws of your country of residence.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}