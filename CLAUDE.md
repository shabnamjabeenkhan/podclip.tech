# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kaizen is a modern full-stack SaaS starter template built with React Router v7, Convex, Clerk, Polar.sh, and other modern tools. It features a flexible configuration system that allows enabling/disabling major features like authentication, payments, backend, and email services.

## Development Commands

### Core Development
- `npm run dev` - Start development server with HMR
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run typecheck` - Run TypeScript checks with route generation


## Configuration Architecture

### Feature Flag System
The entire application is controlled by `config.ts` which uses feature flags to enable/disable major functionality:

```typescript
export const config: AppConfig = {
  features: {
    auth: boolean,      // Clerk authentication
    payments: boolean,  // Polar.sh billing
    convex: boolean,    // Convex database
    email: boolean,     // Resend via Convex
    monitoring: boolean // Error reporting
  },
  services: { /* service configurations */ },
  ui: { /* UI visibility flags */ }
}
```

### Configuration Validation
- `validateConfig()` - Validates required environment variables for enabled features
- `initializeConfig()` - Initializes and validates configuration at app startup
- `syncConfigWithEnv()` - Syncs feature flags to environment variables for Convex

## Key Architecture Patterns

### Full-Stack React Router v7
- **SSR-enabled** by default with `@vercel/react-router` preset
- **File-based routing** in `app/routes/`
- **Loaders and actions** for data fetching and mutations
- **Protected routes** using Clerk authentication when enabled

### Convex Backend Integration
- **Real-time database** with automatic sync
- **Serverless functions** in `convex/` directory
- **Schema definition** in `convex/schema.ts`
- **Webhook handlers** for external service events
- **Built-in exception reporting** (Pro feature)

### Service Integration Pattern
- **Conditional imports** based on feature flags
- **Environment variable validation** for enabled services
- **Graceful degradation** when services are disabled
- **Webhook event handling** for Polar.sh payments


## Database Schema (Convex)

### Core Tables
- `users` - User profiles with Clerk token identifier
- `subscriptions` - Polar.sh subscription data with comprehensive tracking
- `webhookEvents` - Webhook event logging for external services

### Key Indexes
- `users.by_token` - Fast user lookup by Clerk token
- `subscriptions.userId` - User subscription lookup
- `subscriptions.polarId` - Polar.sh subscription ID lookup

## Environment Variables

### Always Required
- `FRONTEND_URL` - Frontend URL for callbacks and redirects

### Feature-Dependent (based on config.ts)
- **Convex**: `CONVEX_DEPLOYMENT`, `VITE_CONVEX_URL`
- **Clerk**: `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- **Polar.sh**: `POLAR_ACCESS_TOKEN`, `POLAR_ORGANIZATION_ID`, `POLAR_WEBHOOK_SECRET`
- **Resend**: `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`
- **OpenAI**: `OPENAI_API_KEY`
- **Sentry**: `VITE_SENTRY_DSN`, `SENTRY_ENVIRONMENT`

## Component Architecture

### UI Components
- **shadcn/ui** components in `app/components/ui/`
- **Radix UI** primitives for accessibility
- **TailwindCSS v4** for styling with utility classes
- **Responsive design** with mobile-first approach

### Feature Components
- **Homepage sections** in `app/components/homepage/`
- **Dashboard components** in `app/components/dashboard/`
- **Conditional rendering** based on feature flags

## Development Workflow

### Before Making Changes
1. **Check feature flags** in `config.ts` to understand enabled features
2. **Verify environment variables** for active services
3. **Run typecheck** to ensure TypeScript compliance

### Code Style Requirements
- **TypeScript-first** - All code must be properly typed
- **React Router v7 patterns** - Use loaders/actions for data fetching
- **Conditional feature logic** - Respect feature flags throughout
- **Component composition** - Use shadcn/ui patterns for consistency


## Common Patterns

### Feature Flag Checking
```typescript
import { isFeatureEnabled } from '~/config';

if (isFeatureEnabled('auth')) {
  // Auth-specific logic
}
```

### Service Configuration Access
```typescript
import { getServiceConfig } from '~/config';

const clerkConfig = getServiceConfig('clerk');
```

### Protected Route Implementation
```typescript
// Use Clerk's built-in protection when auth is enabled
// Graceful fallback when auth is disabled
```

## Production Considerations

### Deployment Options
- **Vercel** (recommended) - Optimized with React Router preset
- **Docker** - Multi-stage build configuration included
- **Self-hosted** - Node.js production server ready

### Performance
- **SSR optimization** with React Router v7
- **Code splitting** automatic with Vite
- **Asset optimization** built into build process
- **Real-time sync** with Convex for data consistency

### Monitoring
- **Convex built-in exception reporting** for backend errors (Pro)
- **Frontend error boundaries** for graceful error handling
- **OpenStatus integration** for uptime monitoring
- **Sentry integration** for additional frontend monitoring

## Common Issues and Solutions

### Configuration Errors
- Run `validateConfig()` to check for missing environment variables
- Ensure feature flags match enabled services
- Check `config.example.ts` for reference configurations

### Development Server Issues
- Ensure Node.js 20+ is installed
- Run `npm install --legacy-peer-deps` for dependency resolution
- Check that required services are running (Convex dev server)

