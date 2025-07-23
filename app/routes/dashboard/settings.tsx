"use client";
import SubscriptionStatus from "~/components/subscription-status";
import { NotionConnection } from "~/components/dashboard/notion-connection";

export default function Page() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="px-4 lg:px-6">
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-600">Manage your account and integrations</p>
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
