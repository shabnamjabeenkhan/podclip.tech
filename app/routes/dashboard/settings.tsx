"use client";
import SubscriptionStatus from "~/components/subscription-status";
import { NotionConnection } from "~/components/dashboard/notion-connection";

export default function Page() {
  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="@container/main flex flex-1 flex-col gap-2 overflow-auto">
        <div className="flex flex-col gap-3 sm:gap-4 py-3 sm:py-4 md:gap-6 md:py-6 pb-16 md:pb-20">
          <div className="px-3 sm:px-4 lg:px-6 max-w-4xl mx-auto w-full">
            <div className="space-y-4 sm:space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Settings</h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">Manage your account and integrations</p>
              </div>

              <SubscriptionStatus />

              <NotionConnection />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
