import { StatsCards } from "~/components/dashboard/stats-cards";
import { RecentlyPlayed } from "~/components/dashboard/recently-played";
import { RecentSummaries } from "~/components/dashboard/recent-summaries";
import { Link } from "react-router";
import { useQuery } from "convex/react";
import { useAuth } from "@clerk/react-router";
import { api } from "../../../convex/_generated/api";
import type { Route } from "./+types/index";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Dashboard | PodClip" },
    { name: "description", content: "View your podcast listening activity, recent summaries, and usage statistics." },
    { name: "robots", content: "noindex, nofollow" }, // Private dashboard
  ];
}

export default function Page() {
  const { isSignedIn } = useAuth();
  
  const userQuota = useQuery(
    api.users.getUserQuota,
    isSignedIn ? {} : "skip"
  );
  const subscriptionStatus = useQuery(
    api.subscriptions.checkUserSubscriptionStatus,
    isSignedIn ? {} : "skip"
  );
  
  // Show upgrade prompt for free users who are close to or at their limit
  const showUpgradePrompt = userQuota && !subscriptionStatus?.hasActiveSubscription && 
    (userQuota.summaries.limit === 5) && (userQuota.summaries.remaining <= 1 || !userQuota.summaries.canGenerate);
  
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-6 py-4">
          {/* Upgrade Prompt for Free Users */}
          {showUpgradePrompt && (
            <div className="px-4 lg:px-6">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {userQuota.summaries.canGenerate ? "Almost there!" : "Upgrade to continue"}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {userQuota.summaries.canGenerate 
                          ? `You have ${userQuota.summaries.remaining} summary remaining. Upgrade for unlimited access.`
                          : "You've used all your free summaries. Upgrade to generate unlimited summaries."}
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/pricing"
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Upgrade
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="px-4 lg:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm sm:text-base text-gray-600">Your podcast listening and summary activity</p>
              </div>
              <div className="flex gap-3">
                <Link
                  to="/dashboard/new-summary"
                  className="inline-flex items-center px-3 sm:px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="w-4 h-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden sm:inline">New Summary</span>
                  <span className="sm:hidden">New</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="px-4 lg:px-6">
            <StatsCards />
          </div>

          {/* Main Content Grid */}
          <div className="px-4 lg:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecentlyPlayed />
              <RecentSummaries />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="px-4 lg:px-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <Link
                  to="/dashboard/new-summary"
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="p-2 bg-blue-50 rounded-lg mr-3">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Generate Summary</p>
                    <p className="text-sm text-gray-500">Create AI summary</p>
                  </div>
                </Link>

                <Link
                  to="/dashboard/all-summaries"
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="p-2 bg-green-50 rounded-lg mr-3">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">View Summaries</p>
                    <p className="text-sm text-gray-500">Browse all summaries</p>
                  </div>
                </Link>

                <Link
                  to="/dashboard/settings"
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="p-2 bg-purple-50 rounded-lg mr-3">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Settings</p>
                    <p className="text-sm text-gray-500">Manage preferences</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
