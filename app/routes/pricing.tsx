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

import { api } from "../../convex/_generated/api";
import { isFeatureEnabled, config } from "../../config";
import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type PlanTier = "Basic" | "Standard" | "Pro";

interface PricingCardProps {
  title: PlanTier | string;
  price: string;
  description?: string;
  features: string[];
  cta: string;
  href: string;
  featured?: boolean;
  isCurrentPlan?: boolean;
  onSubscribe?: () => void;
  loading?: boolean;
}

function PricingCard({ plan }: { plan: PricingCardProps }) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-lg p-6 text-left text-white",
        plan.isCurrentPlan
          ? "bg-gradient-to-b from-green-900/50 to-green-800/30 border border-green-500"
          : plan.featured
            ? "bg-gradient-to-b from-slate-800 to-slate-900 border border-teal-500"
            : "bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-600"
      )}
      aria-label={`${plan.title} plan`}
    >
      {/* Top badge */}
      {(plan.featured || plan.isCurrentPlan) && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className={cn(
            "px-4 py-1 rounded-full text-xs font-medium",
            plan.isCurrentPlan
              ? "bg-green-500 text-white"
              : "bg-teal-500 text-white"
          )}>
            {plan.isCurrentPlan ? "Current Plan" : "Popular"}
          </span>
        </div>
      )}

      <div className="mt-4">
        <h3 className="text-xl font-semibold text-white mb-4">{plan.title}</h3>
        <div className="mb-6">
          <span className="text-3xl font-bold text-white">{plan.price}</span>
        </div>

        {plan.description && (
          <p className="text-sm text-gray-300 mb-6 leading-relaxed">
            {plan.description}
          </p>
        )}

        {/* Upgrade/Downgrade button if applicable */}
        {(plan.cta.includes("Upgrade") || plan.cta.includes("Downgrade")) && (
          <div className="mb-6">
            <Button
              className={cn(
                "w-full rounded-full text-sm font-medium py-2",
                plan.cta.includes("Downgrade")
                  ? "bg-teal-600 hover:bg-teal-700 text-white"
                  : "bg-gray-700 hover:bg-gray-600 text-white"
              )}
              onClick={plan.onSubscribe}
              disabled={plan.loading}
            >
              {plan.loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {plan.cta}
            </Button>
          </div>
        )}

        <div className="border-t border-dotted border-gray-600 pt-6">
          <ul className="space-y-3">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-center text-sm text-gray-300">
                <Check className="mr-3 h-4 w-4 text-gray-400" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Main CTA button for non-upgrade/downgrade cases */}
        {(!plan.cta.includes("Upgrade") && !plan.cta.includes("Downgrade")) && (
          <div className="mt-8">
            <Button
              className={cn(
                "w-full rounded-full text-sm font-medium py-2",
                plan.isCurrentPlan
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-gray-700 hover:bg-gray-600 text-white"
              )}
              onClick={plan.onSubscribe}
              disabled={plan.loading}
            >
              {plan.loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {plan.cta}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

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
    <section className="flex flex-col items-center justify-center min-h-screen px-4 bg-black text-white">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4 text-white">
          Pricing
        </h1>
        <p className="text-xl text-gray-400 mb-6">
          Select the plan that best suits your needs.
        </p>
      </div>

      <div className="not-prose mt-4 grid grid-cols-1 gap-6 min-[900px]:grid-cols-3">
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
                : index === Math.floor(plans.items.length / 2);
            const price = plan.prices[0];
            const isCurrentPlan = (() => {
              if (!userSubscription?.status || userSubscription.status !== "active") return false;
              if (!userQuota?.plan || userQuota.plan === 'free') return false;

              const planName = plan.name.toLowerCase();
              const userPlan = userQuota.plan.toLowerCase();

              if ((planName.includes('basic') && userPlan === 'basic') ||
                  (planName.includes('pro') && userPlan === 'pro') ||
                  (planName.includes('premium') && userPlan === 'premium')) {
                return true;
              }

              if (userSubscription.amount === price.amount) {
                return true;
              }

              if (userPlan === "monthly" && userSubscription.amount === price.amount) {
                return true;
              }

              return false;
            })();

            return (
              <PricingCard key={plan.id} plan={{
                title: `${plan.name} Plan`,
                price: `$${(price.amount / 100).toFixed(0)} / month`,
                description: "Podclip is an AI-powered tool that creates smart, concise text summaries of your podcast episodes. Easily export summaries to Notion and interact with your content using an AI chatbox—ask questions, clarify topics, and get insights from any episode you've summarized.",
                features: [
                  (() => {
                    if (!plan.isRecurring) return "60 summaries per month";
                    if (price.amount <= 1299) return "20 summaries per month";
                    if (price.amount <= 2299) return "40 summaries per month";
                    if (price.amount <= 5000) return "60 summaries per month";
                    return "Unlimited summaries";
                  })(),
                  (() => {
                    if (!plan.isRecurring) return "70 searches per month";
                    if (price.amount <= 1299) return "25 searches per month";
                    if (price.amount <= 2299) return "50 searches per month";
                    if (price.amount <= 5000) return "70 searches per month";
                    return "Unlimited searches";
                  })(),
                  "Chat with your Podcast Library",
                  "Cancel anytime",
                  "Recurring billing"
                ],
                cta: isCurrentPlan ? "✓ Current Plan" : userSubscription?.status === "active" ? (() => {
                  const currentAmount = userSubscription.amount || 0;
                  const newAmount = price.amount;
                  if (newAmount > currentAmount) {
                    return `Upgrade (+$${((newAmount - currentAmount) / 100).toFixed(0)}/mo)`;
                  } else if (newAmount < currentAmount) {
                    return `Downgrade (-$${((currentAmount - newAmount) / 100).toFixed(0)}/mo)`;
                  } else {
                    return "Manage Plan";
                  }
                })() : `Choose ${plan.name}`,
                href: "#",
                featured: isPopular && !isCurrentPlan,
                isCurrentPlan: isCurrentPlan,
                onSubscribe: () => handleSubscribe(price.id),
                loading: loadingPriceId === price.id
              }} />
            );
          })}
      </div>

      {error && (
        <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-md max-w-md mx-auto">
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
    </section>
  );
}
