import type { AppConfig } from './config';

// Example configurations for different use cases

// ========================
// 📱 COMMON CONFIGURATIONS
// ========================

// 1. Full-featured SaaS app (default)
export const fullSaasConfig: AppConfig = {
  features: {
    auth: true,
    payments: true,
    convex: true,
    email: true,
    monitoring: true,
  },
  services: {
    clerk: {
      enabled: true,
      publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
      secretKey: process.env.CLERK_SECRET_KEY,
    },
    polar: {
      enabled: true,
      accessToken: process.env.POLAR_ACCESS_TOKEN,
      organizationId: process.env.POLAR_ORGANIZATION_ID,
      webhookSecret: process.env.POLAR_WEBHOOK_SECRET,
    },
    convex: {
      enabled: true,
      deployment: process.env.CONVEX_DEPLOYMENT,
      url: process.env.VITE_CONVEX_URL,
    },
    resend: {
      enabled: true,
      apiKey: process.env.RESEND_API_KEY,
      webhookSecret: process.env.RESEND_WEBHOOK_SECRET,
    },
    openai: {
      enabled: true,
      apiKey: process.env.OPENAI_API_KEY,
    },
  },
  ui: {
    showPricing: true,
    showDashboard: true,
    showChat: true,
    showAuth: true,
  },
};

// 2. Simple frontend app (no backend services)
export const frontendOnlyConfig: AppConfig = {
  features: {
    auth: false,
    payments: false,
    convex: false,
    email: false,
    monitoring: false,
  },
  services: {
    clerk: { enabled: false },
    polar: { enabled: false },
    convex: { enabled: false },
    resend: { enabled: false },
    openai: { enabled: false },
  },
  ui: {
    showPricing: false,
    showDashboard: true,  // Show as demo
    showChat: false,
    showAuth: false,
  },
};

// 3. Auth-only app (users but no payments)
export const authOnlyConfig: AppConfig = {
  features: {
    auth: true,
    payments: false,
    convex: true,
    email: false,
    monitoring: false,
  },
  services: {
    clerk: {
      enabled: true,
      publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
      secretKey: process.env.CLERK_SECRET_KEY,
    },
    polar: { enabled: false },
    convex: {
      enabled: true,
      deployment: process.env.CONVEX_DEPLOYMENT,
      url: process.env.VITE_CONVEX_URL,
    },
    resend: { enabled: false },
    openai: {
      enabled: true,
      apiKey: process.env.OPENAI_API_KEY,
    },
  },
  ui: {
    showPricing: false,
    showDashboard: true,
    showChat: true,
    showAuth: true,
  },
};

// 4. Payments-only app (with payments but no authentication)
export const paymentsOnlyConfig: AppConfig = {
  features: {
    auth: false,
    payments: true,
    convex: true,
    email: false,
    monitoring: false,
  },
  services: {
    clerk: { enabled: false },
    polar: {
      enabled: true,
      accessToken: process.env.POLAR_ACCESS_TOKEN,
      organizationId: process.env.POLAR_ORGANIZATION_ID,
      webhookSecret: process.env.POLAR_WEBHOOK_SECRET,
    },
    convex: {
      enabled: true,
      deployment: process.env.CONVEX_DEPLOYMENT,
      url: process.env.VITE_CONVEX_URL,
    },
    resend: { enabled: false },
    openai: { enabled: false },
  },
  ui: {
    showPricing: true,
    showDashboard: true,
    showChat: false,
    showAuth: false,
  },
};

// 5. Static website (completely static)
export const staticConfig: AppConfig = {
  features: {
    auth: false,
    payments: false,
    convex: false,
    email: false,
    monitoring: false,
  },
  services: {
    clerk: { enabled: false },
    polar: { enabled: false },
    convex: { enabled: false },
    resend: { enabled: false },
    openai: { enabled: false },
  },
  ui: {
    showPricing: false,
    showDashboard: false,
    showChat: false,
    showAuth: false,
  },
};

// ========================
// 🛠️ HOW TO USE
// ========================
// 1. Choose the configuration that matches your needs
// 2. Copy the desired configuration object
// 3. Replace the main `config` export in config.ts with your chosen configuration
// 4. Update your environment variables accordingly
// 5. Follow the setup guide for your chosen configuration

// Instructions for using these configurations:
// 1. Choose the configuration that matches your use case
// 2. Copy the desired configuration object
// 3. Replace the main `config` export in config.ts with your chosen configuration
// 4. Update your environment variables accordingly
// 5. Remove or comment out unused dependencies from package.json if desired

export default {
  fullSaasConfig,
  frontendOnlyConfig,
  authOnlyConfig,
  paymentsOnlyConfig,
  staticConfig,
}; 