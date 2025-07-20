# 🚀 Deploy to Production Guide

This guide walks you through deploying your Kaizen application to production with all services properly configured and monitored.

## Prerequisites

Before deploying to production:

- [ ] Application working locally with your desired features
- [ ] Production accounts for enabled services:
  - [Vercel](https://vercel.com) (for hosting)
  - [Convex](https://convex.dev) (for database/backend)
  - [Clerk](https://clerk.dev) (if using authentication)
  - [Polar.sh](https://polar.sh) (if using payments)
  - [Resend](https://resend.com) (if using email)
  - [OpenStatus](https://openstatus.dev) (if using uptime monitoring)
- [ ] Domain name (optional but recommended)

## Step 1: Prepare Production Services

### 1.1 Set Up Convex Production Environment

1. **Deploy to production**:
   ```bash
   npx convex deploy --cmd-url-env-var-name=VITE_CONVEX_URL --prod
   ```

2. **Configure exception reporting** (if monitoring enabled):
   - Go to [Convex Dashboard](https://dashboard.convex.dev)
   - Navigate to your production deployment
   - Go to **Settings** → **Integrations** → **Exception Reporting**
   - Set up Sentry integration (requires Convex Pro)

3. **Note your production URLs**:
   - Deployment URL: `https://your-deployment.convex.cloud`
   - Deployment name: `your-deployment-name`

### 1.2 Configure Clerk for Production

1. **Create production instance** or configure existing:
   - Go to [Clerk Dashboard](https://dashboard.clerk.dev)
   - Create new application or switch to production
   - Configure allowed origins:
     - `https://your-domain.com`
     - `https://your-deployment.vercel.app`

2. **Set up domains**:
   - **Frontend API**: Your app domain
   - **Backend API**: Your Convex deployment URL

3. **Configure webhooks** (if needed):
   - **Endpoint**: `https://your-domain.com/api/webhooks/clerk`
   - **Events**: Select user events you want to handle

### 1.3 Set Up Polar.sh Production

1. **Configure production organization**:
   - Go to [Polar.sh Dashboard](https://polar.sh)
   - Create or configure your organization
   - Set up products and pricing

2. **Configure webhooks**:
   - **Webhook URL**: `https://your-domain.com/api/webhooks/polar`
   - **Events**: Select subscription events
   - **Secret**: Generate and save webhook secret

### 1.4 Configure Resend for Production

1. **Verify your domain**:
   - Go to [Resend Dashboard](https://resend.com)
   - Add your domain and verify DNS records
   - This enables sending from your@domain.com

2. **Set up webhooks**:
   - **Endpoint**: `https://your-deployment.convex.cloud/resend-webhook`
   - **Events**: Select email events to track

## Step 2: Set Up Hosting (Vercel)

### 2.1 Deploy to Vercel

1. **Connect repository**:
   ```bash
   npx vercel
   ```
   
2. **Configure build settings**:
   - **Framework**: React Router
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 2.2 Set Production Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

```bash
# Core Configuration
NODE_ENV=production

# Convex
VITE_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOYMENT=your-deployment-name

# Authentication (if enabled)
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# Payments (if enabled)
POLAR_ACCESS_TOKEN=polar_...
POLAR_ORGANIZATION_ID=org_...
POLAR_WEBHOOK_SECRET=whsec_...

# AI Features (if enabled)
OPENAI_API_KEY=sk-...

# Email (if enabled)
RESEND_API_KEY=re_...
RESEND_WEBHOOK_SECRET=whsec_...

# Frontend Monitoring (optional)
VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id

# Uptime Monitoring (optional)
OPENSTATUS_API_KEY=your-key
OPENSTATUS_PROJECT_ID=your-project
```

### 2.3 Configure Domain (Optional)

1. **Add custom domain** in Vercel:
   - Go to Settings → Domains
   - Add your domain
   - Configure DNS records

2. **Update service configurations**:
   - Update Clerk allowed origins
   - Update webhook URLs to use custom domain

## Step 3: Configure Monitoring & Error Reporting

### 3.1 Set Up Convex Built-in Exception Reporting

1. **Upgrade to Convex Pro** (if not already):
   - Go to Convex Dashboard → Billing
   - Upgrade for built-in exception reporting

2. **Create Sentry project**:
   - Go to [Sentry.io](https://sentry.io)
   - Create new project (Generic platform)
   - Copy your DSN

3. **Configure in Convex Dashboard**:
   - Go to Settings → Integrations → Exception Reporting
   - Click Sentry card
   - Enter your Sentry DSN
   - All backend errors will be automatically reported

### 3.2 Set Up Uptime Monitoring (Optional)

1. **Create OpenStatus monitors**:
   - **Main App**: `https://your-domain.com`
   - **Health Check**: `https://your-domain.com/api/health`
   - **Convex Health**: Your Convex deployment status

2. **Configure notifications**:
   - Email alerts for downtime
   - Slack integration for team notifications

## Step 4: Test Production Deployment

### 4.1 Functionality Testing

- [ ] **Homepage**: Loads correctly with proper styling
- [ ] **Authentication**: Sign up/sign in flow works (if enabled)
- [ ] **Dashboard**: Protected routes work correctly
- [ ] **Payments**: Checkout flow completes (if enabled)
- [ ] **Real-time Features**: Database updates work
- [ ] **Email**: Welcome emails send properly (if enabled)

### 4.2 Error Monitoring Testing

1. **Test Convex error reporting**:
   ```typescript
   // Create temporary test function
   export const testProductionError = mutation({
     handler: async () => {
       throw new Error("Production error reporting test");
     }
   });
   ```

2. **Call the function** and verify:
   - Error appears in Sentry with rich metadata
   - Environment tagged as "prod"
   - User context included (if authenticated)

3. **Remove test function** after verification

### 4.3 Performance Testing

- [ ] **Lighthouse Score**: Run audit on production URL
- [ ] **Load Testing**: Test with expected user load
- [ ] **Error Rates**: Monitor error rates in first few hours
- [ ] **Response Times**: Verify API response times

## Step 5: Set Up Alerts & Notifications

### 5.1 Sentry Alert Rules

Create alerts for critical issues:

1. **High Error Rate**:
   - Trigger: >10 errors in 5 minutes
   - Action: Email to team

2. **New Error Types**:
   - Trigger: First occurrence of new error
   - Action: Slack notification

3. **Performance Issues**:
   - Trigger: Response time >5 seconds
   - Action: Team notification

### 5.2 Uptime Monitoring Alerts

1. **Critical Services Down**:
   - Main application unreachable
   - API health check failing
   - Response time >30 seconds

2. **Escalation Policy**:
   - Immediate: Email notification
   - 5 minutes: Slack alert
   - 15 minutes: SMS to on-call person

## Step 6: Post-Deployment Checklist

### 6.1 Security Verification

- [ ] **HTTPS**: All traffic uses HTTPS
- [ ] **Environment Variables**: Not exposed in client
- [ ] **API Keys**: Production keys, not test keys
- [ ] **Webhook Secrets**: Properly configured and secure
- [ ] **CORS Settings**: Restrictive for production

### 6.2 Performance Optimization

- [ ] **CDN**: Static assets served from CDN
- [ ] **Caching**: Proper cache headers set
- [ ] **Bundle Size**: JavaScript bundle optimized
- [ ] **Image Optimization**: Images compressed and optimized
- [ ] **Database Indexes**: Convex queries optimized

### 6.3 Monitoring Setup

- [ ] **Error Reporting**: Convex built-in exception reporting configured
- [ ] **Uptime Monitoring**: OpenStatus monitors active
- [ ] **Performance Monitoring**: Response times tracked
- [ ] **User Analytics**: Basic usage tracking (if desired)
- [ ] **Alert Channels**: Team notifications configured

### 6.4 Documentation

- [ ] **API Documentation**: Endpoints documented
- [ ] **Deployment Notes**: Process documented for team
- [ ] **Rollback Plan**: Emergency rollback procedure ready
- [ ] **Contact Information**: On-call contacts available

## Step 7: Ongoing Maintenance

### 7.1 Regular Monitoring

- **Daily**: Check error rates and uptime
- **Weekly**: Review performance metrics
- **Monthly**: Update dependencies and security patches

### 7.2 Backup Strategy

- **Convex Data**: Automatic backups included
- **Configuration**: Environment variables documented
- **Code**: Git repository with tags for releases

### 7.3 Scaling Considerations

Monitor these metrics to plan for scaling:

- **User Growth**: Active users and registrations
- **Database Usage**: Convex storage and bandwidth
- **Error Rates**: Increased errors may indicate scaling issues
- **Response Times**: Degrading performance signals

## Troubleshooting Production Issues

### Common Deployment Problems

1. **Environment Variables Not Set**:
   - Check Vercel environment variables
   - Verify spelling and case sensitivity
   - Restart deployment after changes

2. **Webhook Failures**:
   - Verify webhook URLs are accessible
   - Check webhook secrets match
   - Review webhook logs in service dashboards

3. **Authentication Issues**:
   - Verify Clerk domains are correct
   - Check that production keys are used
   - Test authentication flow manually

4. **Database Connection Issues**:
   - Verify Convex deployment is live
   - Check CONVEX_URL environment variable
   - Test API endpoints manually

### Getting Help

- **Convex Issues**: [Convex Discord](https://convex.dev/community)
- **Vercel Support**: [Vercel Support](https://vercel.com/support)
- **Service-Specific**: Check individual service documentation
- **Error Monitoring**: Sentry provides detailed error context

---

🎉 **Congratulations!** Your Kaizen application is now live in production with comprehensive monitoring and error reporting. Your Convex backend automatically reports all function errors to Sentry with rich metadata and context. 