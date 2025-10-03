"use client";
import { useQuery, useAction, useMutation } from "convex/react";
import { useAuth } from "@clerk/react-router";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Calendar, CreditCard, ExternalLink, Loader2, User, Zap } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { isFeatureEnabled, config } from "../../config";

export default function SubscriptionStatus() {
  // Early return if payments are not enabled
  if (!isFeatureEnabled('payments') || !config.ui.showPricing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription Status</CardTitle>
          <CardDescription>
            Subscription functionality is currently disabled.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Early return if convex is not enabled (needed for subscription data)
  if (!isFeatureEnabled('convex')) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription Status</CardTitle>
          <CardDescription>
            Subscription data requires backend services.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { isSignedIn, userId } = useAuth();
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [fixingPlan, setFixingPlan] = useState(false);
  const fixUserPlan = useMutation(api.users.fixUserPlan);

  const subscription = useQuery(
    api.subscriptions.fetchUserSubscription,
    isSignedIn ? {} : "skip"
  );
  const subscriptionStatus = useQuery(
    api.subscriptions.checkUserSubscriptionStatus,
    isSignedIn && userId ? { userId } : "skip"
  );
  const userQuota = useQuery(
    api.users.getUserQuota,
    isSignedIn ? {} : "skip"
  );
  const createPortalUrl = useAction(api.subscriptions.createCustomerPortalUrl);

  const handleManageSubscription = async () => {
    if (!subscription?.customerId) return;

    setLoadingDashboard(true);
    try {
      const result = await createPortalUrl({
        customerId: subscription.customerId,
      });
      window.open(result.url, "_blank");
    } catch (error) {
      console.error("Failed to open customer portal:", error);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const handleFixPlan = async () => {
    setFixingPlan(true);
    try {
      const result = await fixUserPlan();
      if (result.success) {
        alert(`Success! ${result.message}. Please refresh the page.`);
        window.location.reload();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error("Failed to fix plan:", error);
      alert("Failed to fix plan. Please try again.");
    } finally {
      setFixingPlan(false);
    }
  };

  if (!isSignedIn) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription Status</CardTitle>
          <CardDescription>
            Please sign in to view your subscription details
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Show loading only when subscription is undefined (still loading)
  // If subscription is null, it means user has no subscription (free user)
  if (subscription === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription Status</CardTitle>
          <CardDescription>
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading subscription details...
            </div>
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Check if user has lifetime plan based on quota data
  const isLifetimePlan = userQuota?.plan === "lifetime";
  const isFreePlan = userQuota?.plan === "free";

  if (isLifetimePlan) {
    // Show lifetime plan status
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-base sm:text-lg">Subscription Status</span>
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 w-fit">
                  Lifetime Plan
                </Badge>
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                You have lifetime access with premium features
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {userQuota && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Plan</p>
                  <p className="text-sm text-muted-foreground">Lifetime Plan</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Usage</p>
                  <p className="text-sm text-muted-foreground">
                    {userQuota.summaries?.used || 0}/{userQuota.summaries?.limit || 0} summaries used
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800 font-medium mb-1">Lifetime Plan Includes:</p>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• {userQuota?.summaries?.limit || 70} AI-generated summaries per month</li>
              <li>• {userQuota?.searches?.limit || 150} podcast searches per month</li>
              <li>• Key takeaways extraction</li>
              <li>• Premium export features</li>
              <li>• Priority support</li>
              <li>• No recurring payments</li>
            </ul>
          </div>

        </CardContent>
      </Card>
    );
  }

  if (!subscriptionStatus?.hasActiveSubscription && isFreePlan) {
    // Check if there's a subscription record but user is still on free plan
    const hasSubscriptionButFreePlan = subscription && subscription.status === "active" && userQuota?.plan === "free";
    
    // Show free plan status with quota information
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-base sm:text-lg">Subscription Status</span>
                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 w-fit">
                  Free Plan
                </Badge>
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                {hasSubscriptionButFreePlan
                  ? "Your payment was processed but your plan needs to be updated"
                  : "You're using the free plan with limited features"
                }
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {userQuota && (
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm font-medium">Plan</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Free Plan</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Zap className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm font-medium">Usage</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {userQuota.summaries?.used || 0}/{userQuota.summaries?.limit === -1 ? '∞' : userQuota.summaries?.limit || 0} summaries used
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800 font-medium mb-1">Free Plan Includes:</p>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• {userQuota?.plan === 'free' ? 1 : (userQuota?.summaries?.limit || 1)} AI-generated summaries per month</li>
              <li>• {userQuota?.plan === 'free' ? 3 : (userQuota?.searches?.limit || 3)} podcast searches per month</li>
              <li>• Key takeaways extraction</li>
              <li>• Basic export features</li>
            </ul>
          </div>
          
          <div className="flex flex-col gap-2">
            {hasSubscriptionButFreePlan ? (
              <Button 
                onClick={handleFixPlan}
                loading={fixingPlan}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Activate My Paid Plan
              </Button>
            ) : (
              <Button asChild className="w-full">
                <a href="/pricing">Upgrade to Pro</a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "canceled":
      case "cancelled":
        return "bg-amber-100 text-amber-800 border-amber-200"; // Changed to amber for grace period
      case "past_due":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // At this point, subscription exists and is not null
  if (!subscription) {
    return null; // This shouldn't happen, but satisfies TypeScript
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-base sm:text-lg lg:text-xl">Subscription Status</span>
              <Badge
                variant="outline"
                className={`${getStatusColor(subscription.status || "unknown")} w-fit text-xs sm:text-sm`}
              >
                {subscription.status || "unknown"}
              </Badge>
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Manage your subscription and billing
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        <div className="grid gap-3 sm:gap-4 lg:gap-6 sm:grid-cols-2">
          <div className="flex items-center gap-3">
            <CreditCard className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-medium">Amount</p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                $
                {subscription.amount
                  ? (subscription.amount / 100).toFixed(2)
                  : "0.00"}{" "}
                {subscription.currency
                  ? subscription.currency.toUpperCase()
                  : "USD"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-medium">Next Billing</p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {subscription.currentPeriodEnd
                  ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                  : "N/A"}
              </p>
            </div>
          </div>
        </div>
        {subscription.cancelAtPeriodEnd && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-amber-200 rounded-full flex items-center justify-center">
                <span className="text-amber-700 text-sm">⚠️</span>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-amber-800 mb-1">Subscription Cancelled</h4>
                <p className="text-sm text-amber-700 mb-2">
                  You still have full access to all premium features until your current billing period ends.
                </p>
                <p className="text-sm font-medium text-amber-800">
                  Access ends: {subscription.currentPeriodEnd 
                    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric', 
                        month: 'long',
                        day: 'numeric'
                      })
                    : "Date not available"}
                </p>
                <p className="text-xs text-amber-600 mt-2">
                  After this date, you'll be automatically moved to the free plan with limited features.
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleManageSubscription}
            loading={loadingDashboard}
            disabled={!subscription.customerId}
            className="w-full sm:flex-1 bg-gray-900 hover:bg-gray-800 text-white border-gray-900 text-sm sm:text-base"
          >
            <ExternalLink className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            Manage Subscription
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
