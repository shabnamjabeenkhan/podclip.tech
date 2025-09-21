import { StatsCards } from "~/components/dashboard/stats-cards";
import { RecentSummaries } from "~/components/dashboard/recent-summaries";
import { useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { useAuth } from "@clerk/react-router";
import { api } from "../../../convex/_generated/api";
import type { Route } from "./+types/index";
import { Button } from "~/components/ui/button";
import { Banner } from "~/components/ui/banner";
import { HoverButton } from "~/components/ui/hover-button";
import { QuickLinksCard } from "~/components/ui/card-2";
import { useState, useCallback } from "react";
import { Rocket, Plus, FileText, Settings } from "lucide-react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Dashboard | PodClip" },
    { name: "description", content: "View your podcast listening activity, recent summaries, and usage statistics." },
    { name: "robots", content: "noindex, nofollow" }, // Private dashboard
  ];
}

export default function Page() {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
  
  const handleNewSummaryClick = useCallback(() => {
    navigate("/dashboard/new-summary");
  }, [navigate]);

  const handleUpgradeClick = useCallback(() => {
    navigate("/pricing");
  }, [navigate]);
  
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
  
  // Show general upgrade banner for all free users
  const showUpgradeBanner = userQuota && !subscriptionStatus?.hasActiveSubscription && 
    (userQuota.summaries.limit === 5) && !showUpgradePrompt;
  
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-6 py-4">
          {/* Upgrade Prompt for Free Users */}
          {showUpgradePrompt && (
            <div className="px-4 lg:px-6">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                          : "You've used all your free summaries. Upgrade to generate summaries."}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleUpgradeClick}
                    className="px-4 py-2 text-sm font-medium"
                  >
                    Upgrade
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* General Upgrade Banner for Free Users */}
          {showUpgradeBanner && (
            <div className="px-4 lg:px-6">
              <Banner
                variant="muted"
                className="bg-sidebar text-sidebar-foreground"
                layout="complex"
                icon={
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 max-md:mt-0.5"
                    aria-hidden="true"
                  >
                    <Rocket className="opacity-80" size={16} strokeWidth={2} />
                  </div>
                }
                action={
                  <div className="flex flex-col gap-2 max-md:flex-wrap">
                    <Button
                      size="sm"
                      className="text-sm bg-white text-black hover:bg-white/90"
                      onClick={handleUpgradeClick}
                    >
                      Upgrade Now
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">Starting at $12.99/mo</p>
                  </div>
                }
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Unlock Your Full Potential</p>
                  <p className="text-sm text-muted-foreground">
                    You've used {userQuota.summaries.used} of {userQuota.summaries.limit} free summaries. Upgrade for more AI-powered insights!
                  </p>
                </div>
              </Banner>
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
                <HoverButton
                  onClick={handleNewSummaryClick}
                  className="inline-flex items-center text-sm font-medium px-4 py-2 sm:px-8 sm:py-3"
                >
                  <svg className="w-4 h-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="ml-2">Browse Podcasts</span>
                </HoverButton>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="px-4 lg:px-6">
            <StatsCards />
          </div>

          {/* Main Content */}
          <div className="px-4 lg:px-6">
            <RecentSummaries />
          </div>

          {/* Quick Actions */}
          <div className="px-4 lg:px-6">
            <QuickLinksCard
              title="Quick Actions"
              className="bg-[#26282B] border-gray-600 text-white max-w-none"
              actions={[
                {
                  icon: <Plus className="h-full w-full" />,
                  label: "Generate Summary",
                  onClick: () => navigate("/dashboard/new-summary"),
                },
                {
                  icon: <FileText className="h-full w-full" />,
                  label: "View Summaries",
                  onClick: () => navigate("/dashboard/all-summaries"),
                },
                {
                  icon: <Settings className="h-full w-full" />,
                  label: "Settings",
                  onClick: () => navigate("/dashboard/settings"),
                },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
