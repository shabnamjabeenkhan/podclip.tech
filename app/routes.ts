import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";
import { config, isFeatureEnabled } from "../config";

function buildRoutes(): RouteConfig {
  const routes: RouteConfig = [
    // Home route is always available
  index("routes/home.tsx"),
    // Changelog is always available
    route("changelog", "routes/changelog.tsx"),
    
    // Legal pages are always available
    route("terms-of-service", "routes/terms-of-service.tsx"),
    route("privacy-policy", "routes/privacy-policy.tsx"),
    route("refund-policy", "routes/refund-policy.tsx"),
    
    // Contact page is always available
    route("contact", "routes/contact.tsx"),
    
    // API routes (resource routes - no UI)
    route("api/health", "routes/api.health.ts"),
    route("api/audio/proxy", "routes/api.audio.proxy.ts"),
    route("api/webhooks/sentry", "routes/api.webhooks.sentry.ts"),
    route("api/notion/oauth", "routes/api.notion.oauth.ts"),
  ];

  // Authentication routes
  if (isFeatureEnabled('auth') && config.ui.showAuth) {
    routes.push(
  route("sign-in/*", "routes/sign-in.tsx"),
      route("sign-up/*", "routes/sign-up.tsx")
    );
  }

  // Pricing routes
  if (isFeatureEnabled('payments') && config.ui.showPricing) {
    routes.push(
  route("pricing", "routes/pricing.tsx"),
  route("success", "routes/success.tsx"),
      route("subscription-required", "routes/subscription-required.tsx")
    );
  }

  // Dashboard routes
  if (config.ui.showDashboard) {
    const dashboardRoutes = [
    route("dashboard", "routes/dashboard/index.tsx"),
    route("dashboard/new-summary", "routes/dashboard/new-summary.tsx"),
    route("dashboard/all-summaries", "routes/dashboard/all-summaries.tsx"),
    route("dashboard/settings", "routes/dashboard/settings.tsx"),
    ];

    // Add chat route if enabled
    if (config.ui.showChat) {
      dashboardRoutes.push(route("dashboard/chat", "routes/dashboard/chat.tsx"));
    }

    routes.push(layout("routes/dashboard/layout.tsx", dashboardRoutes));
  }

  return routes;
}

export default buildRoutes() satisfies RouteConfig;
