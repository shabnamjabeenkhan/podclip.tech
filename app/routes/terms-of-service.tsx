import { Link } from "react-router";
import type { Route } from "./+types/terms-of-service";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Terms of Service - PodClip" },
    { name: "description", content: "Terms of Service for PodClip - AI-Powered Podcast Summaries" },
  ];
}

export default function TermsOfService() {
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
          <h1 className="text-4xl font-bold text-foreground mb-8">Terms of Service</h1>
          
          <p className="text-muted-foreground mb-8">
            <strong>Effective Date:</strong> January 2025
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using Podclip ("Service"), you agree to these Terms of Service. If you do not agree, do not use the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">User Accounts</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>You must provide accurate information and keep your account secure.</li>
              <li>You are responsible for all activity under your account.</li>
              <li>You must be at least 13 years old to use the Service.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">User Rights and Responsibilities</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>You may use Podclip for personal, non-commercial purposes only.</li>
              <li>You may not resell, redistribute, or sublicense any content or features.</li>
              <li>You are responsible for your conduct and any content you submit.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Acceptable Use Policy</h2>
            <p className="text-muted-foreground mb-4">You agree <strong>not</strong> to:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Violate any laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Use the Service for spamming, harassment, or abuse</li>
              <li>Reverse engineer or copy the Service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Intellectual Property</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>All content, trademarks, and software are owned by Podclip or its licensors.</li>
              <li>You may not use our branding or content without permission.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Payments and Subscriptions</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Access to the Service requires a paid subscription or one-time payment via Polar.sh.</li>
              <li>All payments are subject to our <Link to="/refund-policy" className="text-blue-600 hover:text-blue-700">Refund Policy</Link>.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Limitation of Liability</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>The Service is provided "as is" without warranties.</li>
              <li>Podclip is not liable for indirect, incidental, or consequential damages.</li>
              <li>Our total liability is limited to the amount you paid for the Service.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Account Termination</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>We may suspend or terminate your account for violation of these Terms or applicable laws.</li>
              <li>You may terminate your account at any time by contacting us.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Dispute Resolution</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Any disputes will be resolved under the laws of your country of residence.</li>
              <li>Please contact us first to resolve any issues informally.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these Terms from time to time. Continued use of the Service means you accept the new Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions, contact{" "}
              <a href="mailto:admin@podclip.tech" className="text-blue-600 hover:text-blue-700">
                admin@podclip.tech
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}