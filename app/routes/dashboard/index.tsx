"use client";
import { ChartAreaInteractive } from "~/components/dashboard/chart-area-interactive";
import { SectionCards } from "~/components/dashboard/section-cards";
import { TestEmailForm } from "~/components/dashboard/test-email-form";
import { isFeatureEnabled, isServiceEnabled } from "../../../config";

export default function Page() {
  const emailEnabled = isFeatureEnabled('email') && isServiceEnabled('resend');

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <SectionCards />
          <div className="px-4 lg:px-6">
            <ChartAreaInteractive />
          </div>
          {emailEnabled && (
            <div className="px-4 lg:px-6">
              <TestEmailForm />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
