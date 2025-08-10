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
  const [forceUpgrading, setForceUpgrading] = useState(false);
  const fixUserPlan = useMutation(api.users.fixUserPlan);
  const forceUpgradeToLifetime = useMutation(api.users.forceUpgradeToLifetime);

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

  const handleForceUpgrade = async () => {
    setForceUpgrading(true);
    try {
      const result = await forceUpgradeToLifetime();
      if (result.success) {
        alert(`Success! ${result.message} You now have ${result.quota} summaries per month. Please refresh the page.`);
        window.location.reload();
      } else {
        alert("Failed to upgrade to lifetime plan.");
      }
    } catch (error) {
      console.error("Failed to force upgrade:", error);
      alert("Failed to upgrade to lifetime plan. Please try again.");
    } finally {
      setForceUpgrading(false);
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
              <CardTitle className="flex items-center gap-2">
                Subscription Status
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                  Lifetime Plan
                </Badge>
              </CardTitle>
              <CardDescription>
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
                    {userQuota.summaries.used}/{userQuota.summaries.limit} summaries used
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
              <CardTitle className="flex items-center gap-2">
                Subscription Status
                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                  Free Plan
                </Badge>
              </CardTitle>
              <CardDescription>
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
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Plan</p>
                  <p className="text-sm text-muted-foreground">Free Plan</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Usage</p>
                  <p className="text-sm text-muted-foreground">
                    {userQuota.summaries.used}/{userQuota.summaries.limit === -1 ? '∞' : userQuota.summaries.limit} summaries used
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800 font-medium mb-1">Free Plan Includes:</p>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• {userQuota?.plan === 'free' ? 5 : (userQuota?.summaries?.limit || 5)} AI-generated summaries per month</li>
              <li>• {userQuota?.plan === 'free' ? 50 : (userQuota?.searches?.limit || 50)} podcast searches per month</li>
              <li>• Key takeaways extraction</li>
              <li>• Basic export features</li>
            </ul>
          </div>
          
          <div className="flex flex-col gap-2">
            {hasSubscriptionButFreePlan ? (
              <>
                <Button 
                  onClick={handleFixPlan}
                  disabled={fixingPlan}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {fixingPlan ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Fixing Plan...
                    </>
                  ) : (
                    "Activate My Paid Plan"
                  )}
                </Button>
                <Button 
                  onClick={handleForceUpgrade}
                  disabled={forceUpgrading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {forceUpgrading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Upgrading...
                    </>
                  ) : (
                    "Force Upgrade to Lifetime"
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button asChild className="w-full">
                  <a href="/pricing">Upgrade to Pro</a>
                </Button>
                <Button 
                  onClick={handleForceUpgrade}
                  disabled={forceUpgrading}
                  variant="outline"
                  className="w-full"
                >
                  {forceUpgrading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Upgrading...
                    </>
                  ) : (
                    "Force Upgrade to Lifetime (if you paid)"
                  )}
                </Button>
              </>
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
        return "bg-red-100 text-red-800 border-red-200";
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Subscription Status
              <Badge
                variant="outline"
                className={getStatusColor(subscription.status || "unknown")}
              >
                {subscription.status || "unknown"}
              </Badge>
            </CardTitle>
            <CardDescription>
              Manage your subscription and billing
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center gap-3">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Amount</p>
              <p className="text-sm text-muted-foreground">
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
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Next Billing</p>
              <p className="text-sm text-muted-foreground">
                {subscription.currentPeriodEnd
                  ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                  : "N/A"}
              </p>
            </div>
          </div>
        </div>
        {subscription.cancelAtPeriodEnd && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              Your subscription will be canceled at the end of the current
              billing period.
            </p>
          </div>
        )}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleManageSubscription}
            disabled={loadingDashboard || !subscription.customerId}
            className="flex-1"
          >
            {loadingDashboard ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <ExternalLink className="mr-2 h-4 w-4" />
                Manage Subscription
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
