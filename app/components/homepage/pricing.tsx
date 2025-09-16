"use client";
import { useAuth } from "@clerk/react-router";
import { useAction, useMutation, useQuery } from "convex/react";
import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { api } from "../../../convex/_generated/api";
import { isFeatureEnabled, config } from "../../../config";

export default function Pricing({ loaderData }: { loaderData: any }) {
  // Early return if payments are not enabled
  if (!isFeatureEnabled('payments') || !config.ui.showPricing) {
    return null;
  }

  const { isSignedIn } = useAuth();
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const userSubscription = useQuery(api.subscriptions.fetchUserSubscription);
  const subscriptionStatus = useQuery(api.subscriptions.checkUserSubscriptionStatus, isSignedIn ? {} : "skip");
  const userQuota = useQuery(api.users.getUserQuota, isSignedIn ? {} : "skip");
  const createCheckout = useAction(api.subscriptions.createCheckoutSession);
  const createPortalUrl = useAction(api.subscriptions.createCustomerPortalUrl);
  const upsertUser = useMutation(api.users.upsertUser);

  const handleSubscribe = async (priceId: string) => {
    if (!isSignedIn) {
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

  return (
    <section id="pricing" className="relative w-full py-16 sm:py-20 md:py-24 lg:py-32">
      {/* Background Effects - removed */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6 text-center">
          <h1 className="text-center text-2xl sm:text-3xl md:text-4xl font-semibold lg:text-5xl">
            Pricing that Scales with You
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground px-4 sm:px-0">
            Choose the plan that fits your needs. All plans include full access
            to our platform.
          </p>
        </div>

        {!loaderData?.plans ? (
          <div className="mt-6 sm:mt-8 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm sm:text-base">Loading plans...</span>
            </div>
            {error && <p className="text-red-500 mt-4 text-center text-sm sm:text-base">{error}</p>}
          </div>
        ) : (
          <div className="mt-8 sm:mt-12 md:mt-16 lg:mt-20 grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
            {loaderData.plans.items
              .sort((a: any, b: any) => {
                const priceComparison = a.prices[0].amount - b.prices[0].amount;
                return priceComparison !== 0
                  ? priceComparison
                  : a.name.localeCompare(b.name);
              })
              .map((plan: any, index: number) => {
                const isPopular =
                  loaderData.plans.items.length === 2
                    ? index === 1
                    : index === Math.floor(loaderData.plans.items.length / 2); // Mark middle/higher priced plan as popular
                const price = plan.prices[0];
                // Check if this plan matches the user's current plan
                const isCurrentPlan = (() => {
                  if (!userQuota?.plan || userQuota.plan === 'free') return false;
                  
                  // Direct plan name matching for Basic, Pro, Premium
                  const planName = plan.name.toLowerCase();
                  const userPlan = userQuota.plan.toLowerCase();
                  
                  if ((planName.includes('basic') && userPlan === 'basic') ||
                      (planName.includes('pro') && userPlan === 'pro') ||
                      (planName.includes('premium') && userPlan === 'premium')) {
                    return userSubscription?.status === "active";
                  }
                  
                  // For lifetime users (one-time payments)
                  if (userPlan === "lifetime" && !plan.isRecurring) {
                    return price.amount >= 3900; // Assuming lifetime plans are $39+ (in cents)
                  }
                  
                  // Legacy matching by amount for monthly plans
                  if (userPlan === "monthly" && userSubscription?.status === "active") {
                    return userSubscription.amount === price.amount;
                  }
                  
                  return false;
                })();

                return (
                  <Card
                    key={plan.id}
                    className={`relative flex flex-col h-full bg-slate-800/80 border-2 border-slate-700/50 text-white ${isPopular ? "border-2 border-primary shadow-lg" : ""} ${
                      isCurrentPlan ? "border-2 border-green-500 bg-green-800/50" : ""
                    }`}
                  >
                    {isPopular && !isCurrentPlan && (
                      <span className="border-primary/20 bg-primary absolute inset-x-0 -top-3 mx-auto flex h-6 w-fit items-center rounded-full bg-gradient-to-r from-primary to-secondary px-3 py-1 text-xs font-medium text-white ring-1 ring-white/20 ring-offset-1 ring-offset-gray-950/5 ring-inset">
                        Popular
                      </span>
                    )}
                    {isCurrentPlan && (
                      <span className="bg-green-500 text-white absolute inset-x-0 -top-3 mx-auto flex h-6 w-fit items-center rounded-full px-3 py-1 text-xs font-medium">
                        Current Plan
                      </span>
                    )}

                    <CardHeader className="p-4 sm:p-6">
                      <CardTitle className="font-medium text-base sm:text-lg">{plan.name}</CardTitle>

                      <span className="my-2 sm:my-3 block text-xl sm:text-2xl font-semibold">
                        ${(price.amount / 100).toFixed(0)} /{" "}
                        {price.interval || "mo"}
                      </span>

                      <CardDescription className="text-xs sm:text-sm text-white/70 min-h-[2.5rem] sm:min-h-[3rem]">
                        {plan.description}
                      </CardDescription>

                      <Button
                        className="mt-3 sm:mt-4 w-full text-sm sm:text-base py-2 sm:py-2.5"
                        variant={
                          isCurrentPlan
                            ? "secondary"
                            : isPopular
                            ? "default"
                            : "outline"
                        }
                        onClick={() => handleSubscribe(price.id)}
                        disabled={loadingPriceId === price.id || (userQuota?.plan === "lifetime" && !plan.isRecurring)}
                      >
                        {loadingPriceId === price.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Setting up checkout...
                          </>
                        ) : isCurrentPlan ? (
                          "✓ Current Plan"
                        ) : userQuota?.plan === "lifetime" ? (
                          // Lifetime users shouldn't be able to purchase again
                          plan.isRecurring ? "Downgrade to Monthly" : "✓ Lifetime Active"
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
                    </CardHeader>

                    <CardContent className="flex-grow space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
                      <hr className="border-dashed" />

                      <ul className="list-outside space-y-2 sm:space-y-3 text-xs sm:text-sm text-white/70">
                        <li className="flex items-center gap-2">
                          <Check className="size-3" />
                          {plan.isRecurring ?
                            (price.amount <= 1299 ? "20 summaries per month" :
                             price.amount <= 2299 ? "40 summaries per month" :
                             price.amount <= 4999 ? "60 summaries per month" : "Unlimited summaries")
                            : "70 summaries per month"}
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="size-3" />
                          {plan.isRecurring ?
                            (price.amount <= 1299 ? "25 searches per month" :
                             price.amount <= 2299 ? "50 searches per month" :
                             price.amount <= 4999 ? "70 searches per month" : "Unlimited searches")
                            : "150 searches per month"}
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="size-3" />
                          Chat with your Podcast Library
                        </li>
                        {/* <li className="flex items-center gap-2">
                          <Check className="size-3" />
                          All features included
                        </li> */}
                        {/* <li className="flex items-center gap-2">
                          <Check className="size-3" />
                          Priority support
                        </li> */}
                        <li className="flex items-center gap-2">
                          <Check className="size-3" />
                          Cancel anytime
                        </li>
                        {plan.isRecurring && (
                          <li className="flex items-center gap-2">
                            <Check className="size-3" />
                            Recurring billing
                          </li>
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )}

        {error && (
          <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-md max-w-md mx-auto">
            <p className="text-red-800 text-center">{error}</p>
          </div>
        )}

        {userSubscription &&
          !loaderData.plans?.items.some(
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
