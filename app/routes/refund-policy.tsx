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
            <h2 className="text-2xl font-semibold text-foreground mb-4">General No-Refund Policy</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              All purchases of subscriptions or one-time payments for Podclip are <strong>final</strong>. We do <strong>not</strong> offer refunds for any reason, including but not limited to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Change of mind</li>
              <li>Accidental purchase</li>
              <li>Dissatisfaction with the Service</li>
              <li>Technical issues or downtime</li>
              <li>Changes to features or functionality</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              <strong>Exception:</strong> Limited refunds may be available in the case of permanent service discontinuation (see Service Discontinuation section below).
            </p>
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
            
            <div className="space-y-6 text-muted-foreground">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-3">Service Availability & Continuation</h3>
                <p className="leading-relaxed mb-4">
                  While we aim to operate our service indefinitely, we rely on third-party APIs and services to function (including the Listen Notes API). If these become unavailable, unaffordable, or otherwise unsustainable to continue, we reserve the right to discontinue the service at any time.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-foreground mb-3">Refunds on Discontinuation</h3>
                <p className="leading-relaxed mb-4">
                  <strong>Limited Refund Policy:</strong> In the event the service is permanently closed, we will provide refunds only for prepaid subscription periods that have not yet begun. We do not offer prorated refunds for the unused portion of the current billing cycle.
                </p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-blue-900 mb-2">Examples:</h4>
                  <ul className="list-disc pl-5 space-y-1 text-blue-800 text-sm">
                    <li>If you paid for a 12-month subscription and the service closes after 3 months, you may receive a refund for the remaining 9 months</li>
                    <li>If you paid for the current month and the service closes mid-month, no refund will be provided for that partial month</li>
                    <li>One-time lifetime purchases are not eligible for refunds upon service closure</li>
                  </ul>
                </div>

                <ul className="list-disc pl-6 space-y-2">
                  <li>We will make reasonable efforts to provide advance notice when possible, but are not obligated to do so</li>
                  <li>All user data and content may be permanently deleted without recovery options</li>
                  <li>Refunds will be processed within 30 business days of service closure announcement</li>
                </ul>
                
                <p className="leading-relaxed mt-4">
                  By subscribing, you acknowledge and accept that service interruption or closure due to third-party provider costs or unavailability is a possible risk inherent to all digital services.
                </p>
              </div>
            </div>
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