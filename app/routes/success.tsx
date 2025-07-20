"use client";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@clerk/react-router";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { CheckCircle, ArrowRight, Loader2, Clock } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { useEffect, useState } from "react";
import { isFeatureEnabled, config } from "../../config";

export default function Success() {
  // Early return if payments are not enabled
  if (!isFeatureEnabled('payments') || !config.ui.showPricing) {
    return (
      <section className="flex flex-col items-center justify-center min-h-screen px-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle className="text-2xl">Success!</CardTitle>
            <CardDescription>
              Thank you for your interest. Payment functionality is currently disabled.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/dashboard">Continue to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  // Early return if convex is not enabled (needed for subscription data)
  if (!isFeatureEnabled('convex')) {
    return (
      <section className="flex flex-col items-center justify-center min-h-screen px-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle className="text-2xl">Success!</CardTitle>
            <CardDescription>
              Thank you for your purchase. Backend services are currently unavailable.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/dashboard">Continue to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  const { isSignedIn } = useAuth();
  const subscription = useQuery(api.subscriptions.fetchUserSubscription);
  const upsertUser = useMutation(api.users.upsertUser);
  const [waitTime, setWaitTime] = useState(0);

  // Ensure user is created/updated when they land on success page
  useEffect(() => {
    if (isSignedIn) {
      upsertUser();
    }
  }, [isSignedIn, upsertUser]);

  // Track how long we've been waiting for the subscription
  useEffect(() => {
    if (!subscription && isSignedIn) {
      const interval = setInterval(() => {
        setWaitTime(prev => prev + 1);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [subscription, isSignedIn]);

  if (!isSignedIn) {
    return (
      <section className="flex flex-col items-center justify-center min-h-screen px-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle className="text-2xl">Access Denied</CardTitle>
            <CardDescription>
              Please sign in to view your subscription details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/sign-in">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (!subscription) {
    // Show different UI based on how long we've been waiting
    if (waitTime < 30) {
      return (
        <section className="flex flex-col items-center justify-center min-h-screen px-4">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading your subscription details... ({waitTime}s)</span>
          </div>
        </section>
      );
    }

    // After 30 seconds, show explanation and options
    return (
      <section className="flex flex-col items-center justify-center min-h-screen px-4">
        <Card className="max-w-2xl w-full text-center">
          <CardHeader className="pb-6">
            <div className="mx-auto mb-4">
              <Clock className="h-16 w-16 text-orange-500" />
            </div>
            <CardTitle className="text-3xl font-bold">
              Payment Successful!
            </CardTitle>
            <CardDescription className="text-lg">
              Your payment was processed successfully. We're still setting up your subscription.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-muted rounded-lg p-6 text-left">
              <h3 className="font-semibold text-lg mb-4">What's happening?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Your payment was successful, but our system is still processing your subscription details. 
                This usually takes 30-60 seconds, but can occasionally take longer.
              </p>
              <p className="text-sm text-muted-foreground">
                You can proceed to your dashboard now - your subscription will be activated automatically.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Button asChild className="w-full">
                  <Link to="/dashboard">
                    Continue to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.location.reload()}
                >
                  <Loader2 className="mr-2 h-4 w-4" />
                  Refresh Page
                </Button>
              </div>
            </div>

            <div className="pt-6 border-t">
              <p className="text-sm text-muted-foreground">
                If your subscription doesn't activate within 5 minutes, please contact support.
                We'll resolve any issues promptly.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="flex flex-col items-center justify-center min-h-screen px-4">
      <Card className="max-w-2xl w-full text-center">
        <CardHeader className="pb-6">
          <div className="mx-auto mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-3xl font-bold">
            Welcome to your subscription!
          </CardTitle>
          <CardDescription className="text-lg">
            Your payment was successful and your subscription is now active.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-muted rounded-lg p-6 text-left">
            <h3 className="font-semibold text-lg mb-4">Subscription Details</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-medium capitalize">{subscription.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium">
                  ${subscription.amount ? (subscription.amount / 100).toFixed(2) : '0.00'} {subscription.currency ? subscription.currency.toUpperCase() : 'USD'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Billing Cycle:</span>
                <span className="font-medium capitalize">{subscription.interval}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Next Billing:</span>
                <span className="font-medium">
                  {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">What's Next?</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Button asChild className="w-full">
                <Link to={subscription?.status === 'active' ? "/dashboard" : "/pricing"}>
                  {subscription?.status === 'active' ? (
                    <>
                      Go to Dashboard
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    "View Pricing"
                  )}
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/">
                  Back to Home
                </Link>
              </Button>
            </div>
          </div>

          <div className="pt-6 border-t">
            <p className="text-sm text-muted-foreground">
              {subscription?.status === 'active' ? (
                "You'll receive a confirmation email shortly. If you have any questions, feel free to contact our support team."
              ) : (
                "Your payment is processing. It may take a few minutes for your subscription to activate. Please refresh the page or try again shortly."
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}