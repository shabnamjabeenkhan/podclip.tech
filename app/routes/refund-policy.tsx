import { Link } from "react-router";
import type { Route } from "./+types/refund-policy";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Refund Policy - PodClip" },
    { name: "description", content: "Refund Policy for PodClip - AI-Powered Podcast Summaries" },
  ];
}

export default function RefundPolicy() {
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
          <h1 className="text-4xl font-bold text-foreground mb-8">Refund Policy</h1>
          
          <p className="text-muted-foreground mb-8">
            <strong>Effective Date:</strong> January 2025
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">No Refunds</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              All purchases of subscriptions or one-time payments for Podclip are <strong>final</strong>. We do <strong>not</strong> offer refunds for any reason, including but not limited to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Change of mind</li>
              <li>Accidental purchase</li>
              <li>Dissatisfaction with the Service</li>
              <li>Service discontinuation or website shutdown</li>
              <li>Technical issues or downtime</li>
              <li>Changes to features or functionality</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Eligibility</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>No refunds are provided for any subscription or one-time payment.</li>
              <li>Please review your selection carefully before purchasing.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">How to Request</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                If you believe you have been charged in error, contact us at{" "}
                <a href="mailto:admin@podclip.tech" className="text-blue-600 hover:text-blue-700">
                  admin@podclip.tech
                </a>.
              </li>
              <li>We will review requests only in cases of proven billing errors.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Exceptions</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Refunds may be issued solely at our discretion in the case of duplicate charges or technical errors.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Processing Time</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>If a refund is approved (exceptional cases only), it will be processed within 10 business days.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Service Discontinuation</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong>Important:</strong> In the event that Podclip ceases operations, shuts down, or discontinues the service for any reason:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>No refunds will be provided for any subscription fees or payments already made</li>
              <li>Users will not be entitled to compensation for remaining subscription time</li>
              <li>We will make reasonable efforts to provide advance notice when possible, but are not obligated to do so</li>
              <li>All user data and content may be permanently deleted without recovery options</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              By purchasing our services, you acknowledge and accept this risk inherent to all digital services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about this policy, contact{" "}
              <a href="mailto:admin@podclip.tech" className="text-blue-600 hover:text-blue-700">
                admin@podclip.tech
              </a>.
            </p>
          </section>

          <div className="mt-12 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">Important Notice</h3>
            <p className="text-yellow-700 leading-relaxed">
              Please ensure you understand our service features and limitations before making a purchase. 
              We recommend trying our free features first to determine if our service meets your needs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}