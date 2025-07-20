# 📊 Monitoring & Error Reporting Setup Guide

This guide walks you through setting up comprehensive error reporting and monitoring for your Kaizen application using **Convex's built-in exception reporting** and OpenStatus.

## Overview

The monitoring system provides:
- **Frontend Error Tracking**: Basic error boundaries (Sentry can be added manually if needed)
- **Convex Backend Error Tracking**: Built-in exception reporting (Pro feature)
- **Uptime Monitoring**: OpenStatus integration for service monitoring
- **Automatic Error Metadata**: Function name, type, runtime, request ID, environment, user context

## Prerequisites

- Kaizen application set up and running
- **Convex Pro subscription** (required for built-in exception reporting)
- Sentry account (for backend error reporting)
- Email for notifications

## Step 1: Enable Monitoring Feature

1. Open `config.ts` in your project root
2. Set the monitoring feature flag to `true`:

```typescript
export const config: AppConfig = {
  features: {
    // ... other features
    monitoring: true,  // 👈 Enable monitoring
  },
  // ...
};
```

## Step 2: Set Up Convex Built-in Exception Reporting

### 2.1 Upgrade to Convex Pro

The built-in exception reporting feature is only available to Convex Pro users:

1. Go to your [Convex Dashboard](https://dashboard.convex.dev)
2. Navigate to your deployment
3. Upgrade to Pro if not already on Pro plan

### 2.2 Create Sentry Account & Project

1. Go to [sentry.io](https://sentry.io) and create a free account
2. Create a new project:
   - Choose **Generic** as the platform (Convex will handle the integration)
   - Name it `kaizen-convex` (or your preferred name)
   - Choose your organization

### 2.3 Get Your Sentry DSN

After creating the project:

1. **DSN**: Found in **Settings** → **Projects** → **Your Project** → **Client Keys (DSN)**
2. Copy the DSN URL (looks like: `https://xxxxx@sentry.io/xxxxx`)

### 2.4 Configure Convex Exception Reporting

1. Go to your [Convex Dashboard](https://dashboard.convex.dev)
2. Navigate to your deployment
3. Go to **Settings** → **Integrations** → **Exception Reporting**
4. Click on the **Sentry** card
5. Follow the setup directions:
   - Enter your **Sentry DSN**
   - Optionally add custom tags

**Supported Built-in Tags:**
- `func`: Function name (e.g., "users:createUser")
- `func_type`: One of `["query", "mutation", "action", "http_action"]`
- `func_runtime`: One of `["default", "node"]`
- `request_id`: Unique request identifier
- `server_name`: Deployment name (e.g., "happy-animal-123")
- `environment`: One of `["prod", "dev", "preview"]`
- `user`: User's `tokenIdentifier` (if authenticated)

### 2.5 Test the Integration

1. **Create a test error** in one of your Convex functions:

```typescript
// convex/test.ts
import { mutation } from "./_generated/server";

export const testError = mutation({
  handler: async () => {
    throw new Error("Test Convex error for Sentry");
  }
});
```

2. **Call the function** from your app or dashboard
3. **Check Sentry** - the error should appear with rich metadata
4. **Remove the test function** after verification

## Step 3: Set Up OpenStatus (Optional)

### 3.1 Create OpenStatus Account

1. Go to [openstatus.dev](https://openstatus.dev) and create an account
2. Create a new workspace/project

### 3.2 Configure Environment Variables

Add to your `.env` file:

```bash
# OpenStatus Configuration (optional)
OPENSTATUS_API_KEY=your-api-key-here
OPENSTATUS_PROJECT_ID=your-project-id
```

### 3.3 Enable OpenStatus Service

In `config.ts`:

```typescript
export const config: AppConfig = {
  // ...
  services: {
    // ... other services
    openstatus: {
      enabled: true,  // 👈 Enable OpenStatus
    },
  },
};
```

### 3.4 Create Monitors

In OpenStatus dashboard:

1. **Main App Monitor**:
   - **Name**: `Kaizen App`
   - **URL**: `https://your-app.com`
   - **Regions**: Multiple regions
   - **Interval**: 300 seconds (5 minutes)

2. **Health Check Monitor**:
   - **Name**: `Kaizen API Health`
   - **URL**: `https://your-app.com/api/health`
   - **Regions**: Multiple regions
   - **Interval**: 60 seconds

## Step 4: Production Configuration

### 4.1 Environment Variables

Since Convex handles backend error reporting automatically, you only need basic configuration:

```bash
# Basic monitoring (optional - for custom frontend error handling)
VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id

# OpenStatus (optional)
OPENSTATUS_API_KEY=your-api-key-here
OPENSTATUS_PROJECT_ID=your-project-id
```

### 4.2 Convex Dashboard Configuration

**For Production:**
1. In Convex Dashboard → **Integrations** → **Exception Reporting**
2. Update any custom tags for production environment
3. Set up Sentry alert rules for production errors

**For Development/Preview:**
- Exception reporting works automatically across all environments
- Errors are tagged with environment (`dev`, `preview`, `prod`)

## Step 5: Set Up Alerting

### 5.1 Sentry Alert Rules

In your Sentry project:

1. Go to **Alerts** → **Create Alert**
2. Configure trigger:
   - **Trigger**: `An issue is created`
   - **Environment**: `production` (or leave blank for all)
   - **Tags**: You can filter by Convex function types
3. Add actions:
   - **Email notifications**
   - **Slack webhooks**
   - **Custom webhooks**

### 5.2 OpenStatus Notifications (if enabled)

In OpenStatus:

1. Go to **Notifications** → **Add Notification**
2. Choose notification methods:
   - **Slack**: Connect workspace
   - **Email**: Add addresses
   - **Webhook**: Custom integrations

## Step 6: Testing & Validation

### 6.1 Test Convex Error Reporting

1. **Create a test function** with an error:
```typescript
export const testConvexError = mutation({
  handler: async () => {
    throw new Error("Testing Convex built-in error reporting");
  }
});
```

2. **Call the function** and verify error appears in Sentry with:
   - Function name and type
   - Request ID
   - Environment
   - User context (if authenticated)

### 6.2 Test Uptime Monitoring (if configured)

1. Verify monitors are active in OpenStatus
2. Test by temporarily making health endpoint return 500
3. Check that notifications are sent

## Step 7: Advantages of Built-in Exception Reporting

**✅ What you get automatically:**
- **Zero Code Changes**: No need to wrap functions manually
- **Rich Metadata**: Function name, type, runtime, user context
- **Automatic Sampling**: Intelligent error sampling and deduplication
- **Environment Awareness**: Automatic environment tagging
- **User Context**: Authenticated user information included
- **Performance Impact**: Minimal performance overhead

**🆚 vs Manual SDK Integration:**
- No manual error capturing code needed
- No risk of missing errors in new functions
- Consistent metadata across all functions
- Better performance (no SDK overhead in function runtime)
- Professional-grade error tracking out of the box

## Troubleshooting

### Common Issues

1. **Errors not appearing in Sentry**:
   - Verify you're on Convex Pro plan
   - Check DSN configuration in Dashboard
   - Ensure functions are actually throwing errors

2. **Missing error context**:
   - Built-in reporting provides extensive context automatically
   - User context requires authentication to be set up

3. **Too many/few errors**:
   - Convex automatically handles sampling
   - Configure alert rules in Sentry to filter noise

### Getting Help

- **Convex Documentation**: [Exception Reporting](https://docs.convex.dev/production/integrations/exception-reporting)
- **Sentry Documentation**: [docs.sentry.io](https://docs.sentry.io)
- **OpenStatus Documentation**: [docs.openstatus.dev](https://docs.openstatus.dev)

## Next Steps

Once monitoring is set up:

1. **Configure Sentry dashboards** for key metrics
2. **Set up release tracking** in Sentry to correlate errors with deployments
3. **Create alert escalation policies** for critical errors
4. **Monitor error trends** to identify code quality issues

---

🎉 **Congratulations!** Your Convex backend now has professional-grade error reporting with zero code changes required. All function errors are automatically captured with rich context and sent to Sentry.