"use client";
import { useAuth } from "@clerk/react-router";
import { useAction, useMutation, useQuery } from "convex/react";
import { Check, Loader2 } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import type { Route } from "./+types/pricing";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Pricing Plans | PodClip" },
    { name: "description", content: "Choose the perfect plan for your podcast listening needs. Get unlimited AI-generated summaries and key takeaways." },
    { name: "keywords", content: "podcast pricing, subscription plans, unlimited summaries, premium features" },
  ];
}

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { api } from "../../convex/_generated/api";
import { isFeatureEnabled, config } from "../../config";

export default function IntegratedPricing() {
  // Early return if payments are not enabled
  if (!isFeatureEnabled('payments') || !config.ui.showPricing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold">Pricing Not Available</h2>
          <p className="text-muted-foreground">
            Pricing functionality is currently disabled.
          </p>
        </div>
      </div>
    );
  }

  // Early return if convex is not enabled (needed for subscription management)
  if (!isFeatureEnabled('convex')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold">Service Unavailable</h2>
          <p className="text-muted-foreground">
            Pricing functionality requires backend services.
          </p>
        </div>
      </div>
    );
  }

  const { isSignedIn, userId } = useAuth();

  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);
  const [plans, setPlans] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const getPlans = useAction(api.subscriptions.getAvailablePlans);
  const subscriptionStatus = useQuery(
    api.subscriptions.checkUserSubscriptionStatus,
    {
      userId: isSignedIn ? userId : undefined,
    }
  );
  const userSubscription = useQuery(api.subscriptions.fetchUserSubscription);
  const userQuota = useQuery(api.users.getUserQuota, isSignedIn ? {} : "skip");
  const createCheckout = useAction(api.subscriptions.createCheckoutSession);
  const createPortalUrl = useAction(api.subscriptions.createCustomerPortalUrl);
  const upsertUser = useMutation(api.users.upsertUser);

  // Sync user when signed in
  React.useEffect(() => {
    if (isSignedIn) {
      upsertUser().catch(console.error);
    }
  }, [isSignedIn, upsertUser]);

  // Load plans on component mount
  React.useEffect(() => {
    const loadPlans = async () => {
      try {
        const result = await getPlans();
        setPlans(result);
      } catch (error) {
        console.error("Failed to load plans:", error);
        setError("Failed to load pricing plans. Please try again.");
      }
    };
    loadPlans();
  }, [getPlans]);

  const handleSubscribe = async (priceId: string) => {
    if (!isSignedIn) {
      // Redirect to sign up
      window.location.href = "/sign-up";
      return;
    }

    setLoadingPriceId(priceId);
    setError(null);

    try {
      // Ensure user exists in database before action
      await upsertUser();

      // If user has active subscription, try to redirect to customer portal for plan changes
      if (
        userSubscription?.status === "active" &&
        userSubscription?.customerId
      ) {
        try {
          const portalResult = await createPortalUrl({
            customerId: userSubscription.customerId,
          });
          window.open(portalResult.url, "_blank");
          setLoadingPriceId(null);
          return;
        } catch (portalError) {
          console.warn("Failed to open customer portal, falling back to checkout:", portalError);
          // Continue to checkout flow as fallback
        }
      }

      // Create new checkout for first-time subscription or as fallback
      const checkoutUrl = await createCheckout({ priceId });

      window.location.href = checkoutUrl;
    } catch (error) {
      console.error("Failed to process subscription action:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to process request. Please try again.";
      setError(errorMessage);
      setLoadingPriceId(null);
    }
  };

  if (!plans) {
    return (
      <section className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading plans...</span>
        </div>
        {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
      </section>
    );
  }

  return (
    <section className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Simple, transparent pricing
        </h1>
        <p className="text-xl text-muted-foreground mb-6">
          Choose the plan that fits your podcast listening needs
        </p>
        <div className="max-w-3xl mx-auto bg-blue-50 border border-blue-200 rounded-lg p-6 text-left">
          <h3 className="font-semibold text-blue-900 mb-3">📋 How it works:</h3>
          <ul className="text-blue-800 space-y-2 text-sm">
            <li><strong>Generate summaries</strong> by searching and clicking on podcast episodes</li>
            <li><strong>Monthly quotas reset automatically</strong> at the start of each month</li>
            <li><strong>When you reach your limit</strong>, you can't generate new summaries until your quota resets</li>
            <li><strong>Need more summaries?</strong> Upgrade to a higher plan anytime</li>
          </ul>
        </div>
        {isSignedIn && !subscriptionStatus?.hasActiveSubscription && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-md mx-auto">
            <p className="text-blue-800 font-medium">📋 Complete your setup</p>
            <p className="text-blue-700 text-sm mt-1">
              You're signed in! Choose a plan below to access your dashboard and
              start using all features.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-6xl w-full px-4">
        {plans.items
          .sort((a: any, b: any) => {
            const priceComparison = a.prices[0].amount - b.prices[0].amount;
            return priceComparison !== 0
              ? priceComparison
              : a.name.localeCompare(b.name);
          })
          .map((plan: any, index: number) => {
            const isPopular =
              plans.items.length === 2
                ? index === 1
                : index === Math.floor(plans.items.length / 2); // Mark middle/higher priced plan as popular
            const price = plan.prices[0]; // Use first price for display
            // More robust current plan detection - use both plan name and amount matching
            const isCurrentPlan = (() => {
              if (!userSubscription?.status || userSubscription.status !== "active") return false;
              if (!userQuota?.plan || userQuota.plan === 'free') return false;
              
              // Primary method: plan name matching
              const planName = plan.name.toLowerCase();
              const userPlan = userQuota.plan.toLowerCase();
              
              if ((planName.includes('basic') && userPlan === 'basic') ||
                  (planName.includes('pro') && userPlan === 'pro') ||
                  (planName.includes('premium') && userPlan === 'premium')) {
                return true;
              }
              
              // Fallback method: amount matching for edge cases
              if (userSubscription.amount === price.amount) {
                return true;
              }
              
              // Legacy plans
              if (userPlan === "monthly" && userSubscription.amount === price.amount) {
                return true;
              }
              
              return false;
            })();

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col h-full ${
                  isPopular ? "border-primary shadow-lg" : ""
                } ${isCurrentPlan ? "border-green-500 bg-green-50/50" : ""}`}
              >
                {isPopular && !isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Current Plan
                    </span>
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">
                      ${(price.amount / 100).toFixed(0)}
                    </span>
                    <span className="text-muted-foreground">
                      /{price.interval || "month"}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="flex-grow space-y-4">
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>{(() => {
                      if (!plan.isRecurring) return "70 summaries per month";
                      if (price.amount <= 999) return "35 summaries per month"; // Basic plan $9.99
                      if (price.amount <= 1499) return "60 summaries per month"; // Pro plan $14.99
                      if (price.amount <= 4999) return "300 summaries per month"; // Premium plan $49.99
                      return "Unlimited summaries"; // Higher tier plans
                    })()}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>{(() => {
                      if (!plan.isRecurring) return "150 searches per month";
                      if (price.amount <= 999) return "150 searches per month"; // Basic plan $9.99
                      if (price.amount <= 1499) return "200 searches per month"; // Pro plan $14.99
                      if (price.amount <= 4999) return "350 searches per month"; // Premium plan $49.99
                      return "Unlimited searches"; // Higher tier plans
                    })()}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>Chat with your podcast library</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>AI-generated summaries</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>Cancel anytime</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>Monthly quota resets automatically</span>
                  </div>
                </CardContent>

                <CardFooter>
                  <Button
                    className="w-full"
                    onClick={() => handleSubscribe(price.id)}
                    loading={loadingPriceId === price.id}
                    variant={isCurrentPlan ? "secondary" : "default"}
                  >
                    {isCurrentPlan ? (
                      "✓ Current Plan"
                    ) : userSubscription?.status === "active" ? (
                      (() => {
                        const currentAmount = userSubscription.amount || 0;
                        const newAmount = price.amount;

                        if (newAmount > currentAmount) {
                          return `Upgrade (+$${(
                            (newAmount - currentAmount) /
                            100
                          ).toFixed(0)}/mo)`;
                        } else if (newAmount < currentAmount) {
                          return `Downgrade (-$${(
                            (currentAmount - newAmount) /
                            100
                          ).toFixed(0)}/mo)`;
                        } else {
                          return "Manage Plan";
                        }
                      })()
                    ) : (
                      "Get Started"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
      </div>

      <div className="mt-12 text-center max-w-4xl mx-auto">
        <div className="bg-gray-50 border rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6">Summary Quotas & Usage Policy</h2>
          
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">Basic Plan</h3>
              <p className="text-sm text-gray-600">$9.99/month</p>
              <p className="font-medium text-blue-600">35 summaries/month</p>
              <p className="font-medium text-blue-600">150 searches/month</p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🚀</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">Pro Plan</h3>
              <p className="text-sm text-gray-600">$14.99/month</p>
              <p className="font-medium text-purple-600">60 summaries/month</p>
              <p className="font-medium text-purple-600">200 searches/month</p>
            </div>
            
            <div className="text-center">
              <div className="bg-amber-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💎</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">Premium Plan</h3>
              <p className="text-sm text-gray-600">$49.99/month</p>
              <p className="font-medium text-amber-600">300 summaries/month</p>
              <p className="font-medium text-amber-600">350 searches/month</p>
            </div>
          </div>

          <div className="text-left space-y-4 text-sm text-gray-700 max-w-2xl mx-auto">
            <div className="flex items-start gap-3">
              <span className="text-green-500 mt-1">✅</span>
              <div>
                <strong>Generate summaries</strong> by searching for and clicking on podcast episodes
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-500 mt-1">🔄</span>
              <div>
                <strong>Quotas reset automatically</strong> at the start of each month for all plans
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-red-500 mt-1">🚫</span>
              <div>
                <strong>When you reach your limit</strong>, you cannot search for or generate new summaries until your quota resets next month
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-500 mt-1">⬆️</span>
              <div>
                <strong>Need more summaries?</strong> Upgrade to a higher plan anytime to increase your monthly quota
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 border rounded-lg p-6 mb-6 text-left">
          <h3 className="font-semibold text-lg mb-4 text-center">Terms & Conditions</h3>
          <div className="text-sm text-gray-600 space-y-3 max-w-3xl mx-auto">
            <p>
              <strong>Pricing Policy:</strong> Plan prices are subject to change at any time. We reserve the right to modify, increase, or decrease pricing for any subscription plan with 30 days' notice to existing subscribers.
            </p>
            <p>
              <strong>Price Increases:</strong> Subscription prices may increase due to enhanced features, improved service quality, operational costs, or market conditions. Current subscribers will be notified via email before any price changes take effect.
            </p>
            <p>
              <strong>Billing:</strong> All subscriptions are billed monthly in advance. Price changes will apply to your next billing cycle after the notice period. You may cancel your subscription at any time before the price increase takes effect.
            </p>
            <p>
              <strong>Fair Use:</strong> All plans include specified quotas. Excessive usage beyond normal parameters may result in account limitations or additional charges.
            </p>
          </div>
        </div>
        
        <p className="text-muted-foreground">
          Need a custom plan?{" "}
          <span className="text-primary cursor-pointer hover:underline">
            Contact us
          </span>
        </p>
        {error && (
          <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-center">{error}</p>
          </div>
        )}

        {userSubscription &&
          !plans?.items.some(
            (plan: any) => plan.prices[0].id === userSubscription.polarPriceId
          ) && (
            <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-md max-w-md mx-auto">
              <p className="text-amber-800 text-center text-sm">
                You have an active subscription that's not shown above. Contact
                support for assistance.
              </p>
            </div>
          )}
      </div>
    </section>
  );
}
