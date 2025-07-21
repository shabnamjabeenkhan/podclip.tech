import { redirect, useLoaderData } from "react-router";
import { AppSidebar } from "~/components/dashboard/app-sidebar";
import { SiteHeader } from "~/components/dashboard/site-header";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import type { Route } from "./+types/layout";
import { Outlet } from "react-router";
import { isFeatureEnabled, isServiceEnabled } from "../../../config";
import { MiniPlayer } from "~/components/audio/mini-player";
import { useKeyboardShortcuts } from "~/hooks/use-keyboard-shortcuts";

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

  // 2. User setup (instead of requiring subscription)
  if (convexEnabled && userId) {
    const { fetchMutation } = await import("convex/nextjs");
    const { api } = await import("../../../convex/_generated/api");

    // Ensure user exists in database (create if needed)
    try {
      await fetchMutation(api.users.upsertUser);
    } catch (error) {
      console.warn("Failed to upsert user:", error);
    }

    // No subscription check here - let users access dashboard with free quota
    // Payment will only be required when they try to upgrade after hitting quota limit
  }

  return { user, authEnabled, paymentsEnabled };
}

export default function DashboardLayout() {
  const { user } = useLoaderData();
  
  // Enable keyboard shortcuts globally in dashboard
  useKeyboardShortcuts();

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
        <div className="pb-20"> {/* Add padding for mini player */}
          <Outlet />
        </div>
      </SidebarInset>
      <MiniPlayer />
    </SidebarProvider>
  );
}
