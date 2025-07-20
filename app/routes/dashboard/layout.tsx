import { redirect, useLoaderData } from "react-router";
import { AppSidebar } from "~/components/dashboard/app-sidebar";
import { SiteHeader } from "~/components/dashboard/site-header";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import type { Route } from "./+types/layout";
import { Outlet } from "react-router";
import { isFeatureEnabled, isServiceEnabled } from "../../../config";

export async function loader(args: Route.LoaderArgs) {
  const authEnabled = isFeatureEnabled("auth") && isServiceEnabled("clerk");
  const paymentsEnabled = isFeatureEnabled("payments");
  const convexEnabled = isFeatureEnabled("convex") && isServiceEnabled("convex");

  let userId: string | null = null;
  let user: any = null;

  // 1. Authentication
  if (authEnabled) {
    const { getAuth } = await import("@clerk/react-router/ssr.server");
    const { createClerkClient } = await import("@clerk/react-router/api.server");

    const auth = await getAuth(args);
    userId = auth.userId;

    // Redirect to sign-in if not authenticated
    if (!userId) {
      throw redirect("/sign-in");
    }

    // Fetch user details (required for sidebar)
    user = await createClerkClient({
      // Secret key is guaranteed to exist if auth is enabled
      secretKey: process.env.CLERK_SECRET_KEY as string,
    }).users.getUser(userId);
  }

  // 2. Subscription check
  if (paymentsEnabled && convexEnabled && userId) {
    const { fetchQuery } = await import("convex/nextjs");
    const { api } = await import("../../../convex/_generated/api");

    const subscriptionStatus = await fetchQuery(
      api.subscriptions.checkUserSubscriptionStatusByClerkId,
      { clerkUserId: userId }
    );

    if (!subscriptionStatus?.hasActiveSubscription) {
      throw redirect("/subscription-required");
    }
  }

  return { user, authEnabled, paymentsEnabled };
}

export default function DashboardLayout() {
  const { user, authEnabled } = useLoaderData();

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" user={user} />
      <SidebarInset>
        <SiteHeader />
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
