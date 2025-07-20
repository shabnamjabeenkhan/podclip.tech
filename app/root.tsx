import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import { ClerkProvider, useAuth } from "@clerk/react-router";
import { ConvexReactClient, ConvexProvider } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { Route } from "./+types/root";
import "./app.css";
import { Analytics } from "@vercel/analytics/react";
import { config, initializeConfig, isFeatureEnabled, isServiceEnabled } from "../config";
import { Toaster } from "sonner";

// Initialize configuration
initializeConfig();

// Conditionally create Convex client
const convex = isFeatureEnabled('convex') && config.services.convex?.url 
  ? new ConvexReactClient(config.services.convex.url)
  : null;

export async function loader(args: Route.LoaderArgs) {
  if (isFeatureEnabled('auth') && isServiceEnabled('clerk')) {
    const { rootAuthLoader } = await import("@clerk/react-router/ssr.server");
    return rootAuthLoader(args);
  }
  return {};
}

export const links: Route.LinksFunction = () => [
  // DNS prefetch for external services
  { rel: "dns-prefetch", href: "https://fonts.googleapis.com" },
  { rel: "dns-prefetch", href: "https://fonts.gstatic.com" },
  { rel: "dns-prefetch", href: "https://api.convex.dev" },
  { rel: "dns-prefetch", href: "https://clerk.dev" },
  
  // Preconnect to font services
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  
  // Font with display=swap for performance
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
  
  // Preload critical assets
  {
    rel: "preload",
    href: "/kaizen.png",
    as: "image",
    type: "image/jpg",
  },
  {
    rel: "preload",
    href: "/kaizen-favicon.png", 
    as: "image",
    type: "image/png",
  },
  
  // Icon
  {
    rel: "icon",
    type: "image/png",
    href: "/kaizen-favicon.png",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Analytics />
        {children}
        <Toaster />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App({ loaderData }: Route.ComponentProps) {
  const authEnabled = isFeatureEnabled('auth') && isServiceEnabled('clerk');
  const convexEnabled = isFeatureEnabled('convex') && convex;

  // Case 1: Both auth and convex enabled
  if (authEnabled && convexEnabled && convex) {
  return (
    <ClerkProvider
      loaderData={loaderData}
      signUpFallbackRedirectUrl="/"
      signInFallbackRedirectUrl="/"
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <Outlet />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
  }

  // Case 2: Only auth enabled
  if (authEnabled && !convexEnabled) {
    return (
      <ClerkProvider
        loaderData={loaderData}
        signUpFallbackRedirectUrl="/"
        signInFallbackRedirectUrl="/"
      >
        <Outlet />
      </ClerkProvider>
    );
  }

  // Case 3: Only convex enabled
  if (!authEnabled && convexEnabled && convex) {
    return (
      <ConvexProvider client={convex}>
        <Outlet />
      </ConvexProvider>
    );
  }

  // Case 4: Neither auth nor convex enabled
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
