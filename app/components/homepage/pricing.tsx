"use client";
import { useAuth } from "@clerk/react-router";
import { useAction, useMutation, useQuery } from "convex/react";
import { Check, Loader2, Sparkles, ArrowRight, Star, Zap, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "~/components/ui/card";
import { cn } from "~/lib/utils";
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
  const [frequency, setFrequency] = useState<string>('monthly');
  const [mounted, setMounted] = useState(false);

  const userSubscription = useQuery(api.subscriptions.fetchUserSubscription);
  const subscriptionStatus = useQuery(api.subscriptions.checkUserSubscriptionStatus, isSignedIn ? {} : "skip");
  const userQuota = useQuery(api.users.getUserQuota, isSignedIn ? {} : "skip");
  const createCheckout = useAction(api.subscriptions.createCheckoutSession);
  const createPortalUrl = useAction(api.subscriptions.createCustomerPortalUrl);
  const upsertUser = useMutation(api.users.upsertUser);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

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
    <section id="pricing" className="not-prose relative flex w-full flex-col gap-16 overflow-hidden px-4 py-24 text-center sm:px-8">
      {/* Background Effects */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="bg-primary/10 absolute -top-[10%] left-[50%] h-[40%] w-[60%] -translate-x-1/2 rounded-full blur-3xl" />
        <div className="bg-primary/5 absolute -right-[10%] -bottom-[10%] h-[40%] w-[40%] rounded-full blur-3xl" />
        <div className="bg-primary/5 absolute -bottom-[10%] -left-[10%] h-[40%] w-[40%] rounded-full blur-3xl" />
      </div>

      <div className="flex flex-col items-center justify-center gap-8">
        <div className="flex flex-col items-center space-y-2">
          <Badge
            variant="outline"
            className="border-primary/20 bg-primary/5 mb-4 rounded-full px-4 py-1 text-sm font-medium"
          >
            <Sparkles className="text-primary mr-1 h-3.5 w-3.5 animate-pulse" />
            Pricing Plans
          </Badge>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="from-foreground to-foreground/30 bg-gradient-to-b bg-clip-text text-4xl font-bold text-transparent sm:text-5xl"
          >
            Pick the perfect plan for your needs
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-muted-foreground max-w-md pt-2 text-lg"
          >
            Simple, transparent pricing that scales with your business. No
            hidden fees, no surprises.
          </motion.p>
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
          <>
            <div className="mt-8 grid w-full max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
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
                      : index === Math.floor(loaderData.plans.items.length / 2);
                  const price = plan.prices[0];
                  const isCurrentPlan = (() => {
                    if (!userQuota?.plan || userQuota.plan === 'free') return false;
                    const planName = plan.name.toLowerCase();
                    const userPlan = userQuota.plan.toLowerCase();
                    if ((planName.includes('basic') && userPlan === 'basic') ||
                        (planName.includes('pro') && userPlan === 'pro') ||
                        (planName.includes('premium') && userPlan === 'premium')) {
                      return userSubscription?.status === "active";
                    }
                    if (userPlan === "lifetime" && !plan.isRecurring) {
                      return price.amount >= 3900;
                    }
                    if (userPlan === "monthly" && userSubscription?.status === "active") {
                      return userSubscription.amount === price.amount;
                    }
                    return false;
                  })();

                  const getIcon = () => {
                    if (index === 0) return Star;
                    if (index === 1) return Zap;
                    return Shield;
                  };
                  const IconComponent = getIcon();

                  return (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
                      whileHover={{ y: -5 }}
                      className="flex"
                    >
                      <Card
                        className={cn(
                          'bg-secondary/20 relative h-full w-full text-left transition-all duration-300 hover:shadow-lg',
                          isPopular
                            ? 'ring-primary/50 dark:shadow-primary/10 shadow-md ring-2'
                            : 'hover:border-primary/30',
                          isPopular &&
                            'from-primary/[0.03] bg-gradient-to-b to-transparent',
                        )}
                      >
                        {isPopular && (
                          <div className="absolute -top-3 right-0 left-0 mx-auto w-fit">
                            <Badge className="bg-primary text-primary-foreground rounded-full px-4 py-1 shadow-sm">
                              <Sparkles className="mr-1 h-3.5 w-3.5" />
                              Popular
                            </Badge>
                          </div>
                        )}
                        {isCurrentPlan && (
                          <div className="absolute -top-3 right-0 left-0 mx-auto w-fit">
                            <Badge className="bg-green-500 text-white rounded-full px-4 py-1 shadow-sm">
                              Current Plan
                            </Badge>
                          </div>
                        )}
                        <CardHeader className={cn('pb-4', isPopular && 'pt-8')}>
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                'flex h-8 w-8 items-center justify-center rounded-full',
                                isPopular
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-secondary text-foreground',
                              )}
                            >
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <CardTitle
                              className={cn(
                                'text-xl font-bold text-white',
                                isPopular && 'text-primary',
                              )}
                            >
                              {plan.name}
                            </CardTitle>
                          </div>
                          <CardDescription className="mt-3 space-y-2">
                            <p className="text-sm">{plan.description || "Podclip is an AI-powered tool that creates smart, concise text summaries of your podcast episodes. Easily export summaries to Notion and interact with your content using an AI chatbox—ask questions, clarify topics, and get insights from any episode you've summarized."}</p>
                            <div className="pt-2">
                              <div className="flex items-baseline">
                                <span
                                  className={cn(
                                    'text-3xl font-bold',
                                    isPopular ? 'text-primary' : 'text-foreground',
                                  )}
                                >
                                  ${(price.amount / 100).toFixed(0)}
                                </span>
                                <span className="text-muted-foreground ml-1 text-sm">
                                  /month, billed monthly
                                </span>
                              </div>
                            </div>
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3 pb-6">
                          {[
                            plan.isRecurring ?
                              (price.amount <= 1299 ? "20 summaries per month" :
                               price.amount <= 2299 ? "40 summaries per month" :
                               price.amount <= 4999 ? "60 summaries per month" : "Unlimited summaries")
                              : "70 summaries per month",
                            plan.isRecurring ?
                              (price.amount <= 1299 ? "25 searches per month" :
                               price.amount <= 2299 ? "50 searches per month" :
                               price.amount <= 4999 ? "70 searches per month" : "Unlimited searches")
                              : "150 searches per month",
                            "Chat with your Podcast Library",
                            "Cancel anytime",
                            ...(plan.isRecurring ? ["Recurring billing"] : [])
                          ].map((feature, featureIndex) => (
                            <motion.div
                              key={featureIndex}
                              initial={{ opacity: 0, x: -5 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: 0.5 + featureIndex * 0.05 }}
                              className="flex items-center gap-2 text-sm"
                            >
                              <div
                                className={cn(
                                  'flex h-5 w-5 items-center justify-center rounded-full',
                                  isPopular
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-secondary text-secondary-foreground',
                                )}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </div>
                              <span
                                className={
                                  isPopular
                                    ? 'text-foreground'
                                    : 'text-muted-foreground'
                                }
                              >
                                {feature}
                              </span>
                            </motion.div>
                          ))}
                        </CardContent>
                        <CardFooter>
                          <Button
                            variant={isCurrentPlan ? 'secondary' : 'default'}
                            className={cn(
                              'w-full font-medium transition-all duration-300',
                              isCurrentPlan
                                ? ''
                                : 'bg-primary hover:bg-primary/90 hover:shadow-primary/20 hover:shadow-md text-white',
                            )}
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
                            ) : userSubscription?.status === "active" ? (
                              (() => {
                                const currentAmount = userSubscription.amount || 0;
                                const newAmount = price.amount;
                                if (newAmount > currentAmount) {
                                  return `Upgrade (+$${((newAmount - currentAmount) / 100).toFixed(0)}/mo)`;
                                } else if (newAmount < currentAmount) {
                                  return `Downgrade (-$${((currentAmount - newAmount) / 100).toFixed(0)}/mo)`;
                                } else {
                                  return "Manage Plan";
                                }
                              })()
                            ) : (
                              "Get Started"
                            )}
                            <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                          </Button>
                        </CardFooter>
                      </Card>
                    </motion.div>
                  );
                })}
            </div>
          </>
        )}

        {error && (
          <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-md max-w-md mx-auto">
            <p className="text-red-800 text-center">{error}</p>
          </div>
        )}

        {userSubscription &&
          loaderData?.plans?.items &&
          !loaderData.plans.items.some(
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
