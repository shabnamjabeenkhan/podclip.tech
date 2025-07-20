# ⚙️ Configuration Guide

This comprehensive guide walks you through configuring all the features and services in your Kaizen application.

## Overview

The `config.ts` file is the central hub for enabling/disabling features and configuring services. This modular approach allows you to:

- **Start Simple**: Enable only the features you need
- **Scale Gradually**: Add features as your app grows
- **Reduce Complexity**: Avoid unused dependencies and setup
- **Type Safety**: Get TypeScript validation for your configuration

## Quick Start

1. **Copy the example**: Check out pre-made configurations in `config.example.ts`
2. **Enable features**: Set feature flags to `true` for what you need
3. **Configure services**: Add environment variables for enabled services
4. **Validate setup**: Run `npm run dev` to see configuration status

---

## Core Configuration Structure

```typescript
export const config: AppConfig = {
  features: {
    auth: boolean,        // User authentication (Clerk)
    payments: boolean,    // Subscription billing (Polar.sh)
    convex: boolean,      // Database and real-time features
    email: boolean,       // Email sending (Resend via Convex)
    monitoring: boolean,  // Error reporting and monitoring
  },
  services: {
    // Service-specific configurations
  },
  ui: {
    // UI feature toggles
  }
};
```

---

## Environment Variables

Create a `.env` file in your project root with the services you plan to use:

```bash
# Core - Required for basic functionality
VITE_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOYMENT=your-deployment-name

# Authentication (if auth: true)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Payments (if payments: true)
POLAR_ACCESS_TOKEN=polar_...
POLAR_ORGANIZATION_ID=org_...
POLAR_WEBHOOK_SECRET=whsec_...

# AI Features (if you want chat)
OPENAI_API_KEY=sk-...

# Email (if email: true)
RESEND_API_KEY=re_...
RESEND_WEBHOOK_SECRET=whsec_...

# Basic Frontend Monitoring (optional)
VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id

# Uptime Monitoring (optional)
OPENSTATUS_API_KEY=your-key
OPENSTATUS_PROJECT_ID=your-project
```

---

## Feature Configuration

### 🔐 Authentication (`auth: true`)

Enables user sign-up, sign-in, and protected routes using Clerk.

**Required Services:**
- `clerk: { enabled: true }`
- `convex: { enabled: true }` (for user data storage)

**Environment Variables:**
```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

**UI Changes:**
- Adds sign-in/sign-up buttons to homepage
- Protects dashboard routes
- Shows user profile in navigation
- Enables subscription status checking

**Setup Guide:** See [Authentication Setup](./guides/auth-setup.md)

### 💳 Payments (`payments: true`)

Enables subscription billing and premium features using Polar.sh.

**Required Services:**
- `polar: { enabled: true }`
- `convex: { enabled: true }` (for subscription data)

**Environment Variables:**
```bash
POLAR_ACCESS_TOKEN=polar_...
POLAR_ORGANIZATION_ID=org_...
POLAR_WEBHOOK_SECRET=whsec_...
```

**UI Changes:**
- Shows pricing page at `/pricing`
- Adds subscription status to dashboard
- Enables premium feature gating
- Shows checkout buttons

**Setup Guide:** See [Payments Setup](./guides/payments-setup.md)

### 🗄️ Database (`convex: true`)

Enables real-time database, backend functions, and API endpoints.

**Required Services:**
- `convex: { enabled: true }`

**Environment Variables:**
```bash
VITE_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOYMENT=your-deployment-name
```

**Features Enabled:**
- Real-time data synchronization
- Backend functions (queries, mutations, actions)
- User data storage
- File uploads
- WebSocket connections

**Setup Guide:** See [Convex Setup](./guides/convex-setup.md)

### 📧 Email (`email: true`)

Enables transactional email sending using Resend via Convex component.

**Required Services:**
- `convex: { enabled: true }`
- `resend: { enabled: true }`

**Environment Variables:**
```bash
RESEND_API_KEY=re_...
RESEND_WEBHOOK_SECRET=whsec_...
```

**Features Enabled:**
- Welcome emails
- Password reset emails
- Subscription notifications
- Email event tracking (delivery, opens, clicks)

**Setup Guide:** See [Email Setup](./guides/email-setup.md)

### 📊 Monitoring (`monitoring: true`)

Enables error reporting and uptime monitoring.

**Built-in Exception Reporting (Recommended):**
- Convex Pro feature for automatic backend error reporting
- Zero code changes required
- Rich metadata and context
- Configure through Convex Dashboard → Integrations

**Manual Frontend Monitoring (Optional):**
- Basic error boundaries
- Manual Sentry integration for frontend errors

**Environment Variables:**
```bash
# Frontend monitoring (optional)
VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id

# Uptime monitoring (optional)
OPENSTATUS_API_KEY=your-key
OPENSTATUS_PROJECT_ID=your-project
```

**Setup Guide:** See [Monitoring Setup](./guides/monitoring-setup.md)

---

## Service Configuration

### Clerk Authentication

```typescript
services: {
  clerk: {
    enabled: true,
    publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  }
}
```

**Features:**
- Social logins (Google, GitHub, etc.)
- Email/password authentication
- User management dashboard
- Session management
- Multi-factor authentication

### Polar.sh Payments

```typescript
services: {
  polar: {
    enabled: true,
    accessToken: process.env.POLAR_ACCESS_TOKEN,
    organizationId: process.env.POLAR_ORGANIZATION_ID,
    webhookSecret: process.env.POLAR_WEBHOOK_SECRET,
  }
}
```

**Features:**
- Subscription plans
- One-time payments
- Webhook handling
- Customer portal
- Revenue analytics

### Convex Database

```typescript
services: {
  convex: {
    enabled: true,
    url: process.env.VITE_CONVEX_URL,
    deployment: process.env.CONVEX_DEPLOYMENT,
  }
}
```

**Features:**
- Real-time database
- Server-side functions
- File storage
- Full-text search
- Authentication integration

### Resend Email

```typescript
services: {
  resend: {
    enabled: true,
    apiKey: process.env.RESEND_API_KEY,
    webhookSecret: process.env.RESEND_WEBHOOK_SECRET,
  }
}
```

**Features:**
- Transactional emails
- Email templates
- Delivery tracking
- Bounce handling
- Email events

### OpenAI Integration

```typescript
services: {
  openai: {
    enabled: true,
    apiKey: process.env.OPENAI_API_KEY,
  }
}
```

**Features:**
- AI chat functionality
- Text generation
- Content moderation
- Embeddings

---

## Email-Enabled Configuration

When you enable email functionality, your application gains powerful email capabilities through the Resend service via Convex component:

### Email Service Features
- **Transactional Emails**: Welcome emails, password resets, notifications
- **Email Events**: Track delivery, opens, clicks, bounces, complaints
- **Template Support**: Reusable email templates with dynamic content
- **Production Ready**: Domain verification, SPF/DKIM setup
- **Real-time Webhooks**: Process email events in Convex functions

### Configuration Example
```typescript
export const config: AppConfig = {
  features: {
    convex: true,    // Required for email
    email: true,     // 👈 Enable email
    auth: true,      // For user-specific emails
  },
  services: {
    convex: { enabled: true },
    resend: { enabled: true },  // 👈 Enable Resend
    clerk: { enabled: true },
  },
  ui: {
    showDashboard: true,
    showAuth: true,
  }
};
```

### Required Environment Variables
```bash
# Convex (required)
VITE_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOYMENT=your-deployment

# Resend Email Service
RESEND_API_KEY=re_...
RESEND_WEBHOOK_SECRET=whsec_...

# Authentication (for user emails)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

---

## UI Configuration

Control which UI elements are visible:

```typescript
ui: {
  showPricing: boolean,     // Show pricing page and links
  showDashboard: boolean,   // Show dashboard navigation
  showChat: boolean,        // Show AI chat in dashboard
  showAuth: boolean,        // Show sign-in/sign-up buttons
}
```

**Automatic UI Updates:**
- Navigation items appear/disappear based on enabled features
- Conditional component rendering
- Route protection based on auth settings
- Feature gates for premium content

---

## Validation and Debugging

### Configuration Validation

The `validateConfig()` function checks:
- Required environment variables are present
- Service configurations are valid
- Feature dependencies are met
- No conflicting settings

### Development Logging

When running `npm run dev`, you'll see:
```bash
🎯 Kaizen Configuration Status:
✅ Core features initialized
✅ Authentication: Enabled (Clerk)
✅ Payments: Enabled (Polar.sh)
✅ Database: Enabled (Convex)
✅ Email: Enabled (Resend via Convex)
✅ Monitoring: Backend via Convex built-in, Frontend basic
```

### Environment Variable Sync

The `syncConfigWithEnv()` function:
- Sets service flags for conditional imports
- Validates required variables
- Provides helpful error messages
- Works across development and production

---

## Example Configurations

### Full SaaS Configuration

Perfect for complete SaaS applications:

```typescript
export const fullSaasConfig: AppConfig = {
  features: {
    auth: true,
    payments: true,
    convex: true,
    email: true,
    monitoring: true,
  },
  services: {
    clerk: { enabled: true },
    polar: { enabled: true },
    convex: { enabled: true },
    resend: { enabled: true },
    openai: { enabled: true },
    sentry: { enabled: false }, // Use Convex built-in
    openstatus: { enabled: true },
  },
  ui: {
    showPricing: true,
    showDashboard: true,
    showChat: true,
    showAuth: true,
  },
};
```

### Frontend-Only Configuration

For static sites or frontend-only applications:

```typescript
export const frontendOnlyConfig: AppConfig = {
  features: {
    auth: false,
    payments: false,
    convex: false,
    email: false,
    monitoring: false,
  },
  services: {
    // All services disabled
  },
  ui: {
    showPricing: false,
    showDashboard: false,
    showChat: false,
    showAuth: false,
  },
};
```

### Auth-Only Configuration

For applications that need user management but not payments:

```typescript
export const authOnlyConfig: AppConfig = {
  features: {
    auth: true,
    payments: false,
    convex: true,
    email: false,
    monitoring: false,
  },
  services: {
    clerk: { enabled: true },
    convex: { enabled: true },
  },
  ui: {
    showPricing: false,
    showDashboard: true,
    showChat: false,
    showAuth: true,
  },
};
```

---

## Production Checklist

Before deploying to production:

### Environment Variables
- [ ] All required environment variables are set
- [ ] Production API keys (not test keys) are configured
- [ ] Webhook URLs point to production domain
- [ ] Environment is set to "production"

### Service Configuration
- [ ] **Convex**: Deployed to production environment
- [ ] **Clerk**: Production instance configured with correct URLs
- [ ] **Polar.sh**: Production organization and webhooks
- [ ] **Resend**: Domain verified and production API key
- [ ] **Sentry**: Production project with built-in exception reporting via Convex Dashboard

### Security
- [ ] Environment variables are not committed to git
- [ ] Webhook secrets are properly configured
- [ ] CORS settings are production-ready
- [ ] Content Security Policy is configured

### Monitoring
- [ ] **Convex Exception Reporting**: Configured via Dashboard for Pro users
- [ ] **Frontend monitoring**: Set up if needed (optional)
- [ ] **Uptime monitoring**: OpenStatus configured
- [ ] **Alert notifications**: Email/Slack configured

---

## Troubleshooting

### Common Issues

1. **"Service not configured" errors**:
   - Check that environment variables are set
   - Verify service is enabled in config
   - Run `npm run dev` to see configuration status

2. **TypeScript errors**:
   - Run `npm run typecheck` to see specific issues
   - Check that all required services are properly configured
   - Ensure environment variables match expected types

3. **Features not appearing**:
   - Verify feature flags are set to `true`
   - Check UI configuration settings
   - Clear browser cache and restart dev server

4. **Webhook failures**:
   - Verify webhook URLs are publicly accessible
   - Check webhook secret configuration
   - Test webhooks using service provider tools

### Getting Help

- **Configuration Issues**: Check this guide and `config.example.ts`
- **Service-Specific Problems**: See individual service setup guides
- **Error Reporting**: Use built-in Convex exception reporting for backend issues
- **Community Support**: Join the Convex Discord for help

---

🎉 **You're all set!** Your Kaizen application is now configured with the features you need. Check out the individual setup guides for detailed service configuration. 