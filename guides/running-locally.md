# 🏠 Running Locally Guide

This guide walks you through setting up and running the Kaizen application on your local development machine.

## 🆕 Recent Updates

This guide has been enhanced with detailed steps for:
- **Clerk JWT Templates** setup for proper Convex integration
- **Detailed Polar.sh configuration** with all required API keys
- **Local webhook testing** using ngrok for payment development
- **Complete flow testing** with database verification steps
- **Production deployment** considerations for environment variables

## Prerequisites

Before getting started, make sure you have:

- **Node.js** (v18 or later) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** - [Download here](https://git-scm.com/)
- **Code Editor** - We recommend [VS Code](https://code.visualstudio.com/)

## Step 1: Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd kaizen

# Install dependencies
npm install --legacy-peer-deps

# Verify the installation
npm run typecheck
```

## Step 2: Basic Configuration

1. **Open `config.ts`** in the project root
2. **Choose your features** by setting them to `true`/`false`:

```typescript
export const config: AppConfig = {
  features: {
    auth: true,        // User authentication
    payments: true,    // Subscription billing  
    convex: true,      // Database and real-time features
    email: true,       // Email sending
    monitoring: true,  // Error reporting and monitoring
  },
  // ... services will be configured next
};
```

3. **Start simple**: For your first run, try enabling just `convex: true` and `monitoring: true`

## Step 3: Set Up Core Services

### 3.1 Convex Database (Required)

Convex provides your database, backend functions, and real-time features.

1. **Install Convex CLI**:
   ```bash
   npm install -g convex
   ```

2. **Initialize Convex**:
   ```bash
   npx convex dev
   ```
   
   This will:
   - Create a new Convex project (or use existing)
   - Start the Convex development server
   - Give you a deployment URL

3. **Copy the environment variables** that Convex provides:
   ```bash
   # Add these to your .env.local file
   VITE_CONVEX_URL=https://your-deployment.convex.cloud
   CONVEX_DEPLOYMENT=your-deployment-name
   NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
   ```

### 3.2 Authentication (Optional - if `auth: true`)

1. **Create a Clerk account** at [clerk.dev](https://clerk.dev)

2. **Create a new application**:

   - Give it a name like "Kaizen App"
   - Copy your API keys (Settings -> API Keys)

3. **Set up JWT Templates for Convex integration**:
   - In Clerk dashboard, go to **Configure** → **JWT Templates**
   - Click **New template** → **Convex**
   - Click **Save** (important - don't forget this step!)
   - Copy the **Issuer** URL (looks like `https://your-app.clerk.accounts.dev`)

4. **Add to `.env.local`**:
   ```bash
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   VITE_CLERK_FRONTEND_API_URL=https://your-app.clerk.accounts.dev
   ```

5. **Set up Convex environment variables**:
   - Go to your Convex dashboard → **Settings** → **Environment Variables**
   - Add: `VITE_CLERK_FRONTEND_API_URL` with the Issuer URL from step 3

6. **Update `config.ts`**:
   ```typescript
   services: {
     convex: { enabled: true },
     clerk: { enabled: true },  // 👈 Enable Clerk
   }
   ```

### 3.3 AI Chat (Optional)

If you want the AI chat feature in the dashboard:

1. **Get OpenAI API key** from [platform.openai.com](https://platform.openai.com)

2. **Add to `.env`**:
   ```bash
   OPENAI_API_KEY=sk-...
   ```

3. **Update `config.ts`**:
   ```typescript
   services: {
     openai: { enabled: true },  // 👈 Enable OpenAI
   }
   ```

## Step 4: Start Development Server

```bash
# Start the development server
npm run dev
```

You should see:
- ✅ Configuration validation messages
- 🌐 Server running at `http://localhost:5173`
- 📊 Convex dashboard URL

## Step 5: Test Basic Functionality

1. **Open your browser** to `http://localhost:5173`
2. **Check the homepage** loads properly
3. **Try the dashboard** at `/dashboard`
4. **Test authentication** (if enabled) by signing up

## Step 6: Add More Features (Optional)

### 6.1 Payments with Polar.sh

⚠️ **Important**: Use [sandbox.polar.sh](https://sandbox.polar.sh) for testing with fake money first!

1. **Create account** at [sandbox.polar.sh](https://sandbox.polar.sh)

2. **Create organization and products**:
   - Create a new organization (e.g., "Kaizen Test")
   - Click **Products** → **Create Product**
   - Set up a subscription product with pricing
   - Save the product

3. **Get API credentials**:
   
   **Access Token:**
   - Go to **Settings** → **Developers**
   - Click **New Token**
   - Select all permissions, set no expiration
   - Copy the token
   
   **Organization ID:**
   - Go to **Settings** → **General**
   - Copy the Organization ID at the top
   
   **Webhook Secret:**
   - Get your Convex HTTP actions URL from dashboard (ends in `.convex.site`)
   - Go to **Settings** → **Webhooks** 
   - Click **Add Endpoint**
   - URL: `https://your-deployment.convex.site/payments/webhook`
   - Format: **Raw**
   - Click **Generate new secret**
   - Select all events and click **Create**
   - Copy the webhook secret

4. **Add to Convex environment variables**:
   - Go to Convex dashboard → **Settings** → **Environment Variables**
   - Add these variables:
   ```bash
   POLAR_ACCESS_TOKEN=polar_...
   POLAR_ORGANIZATION_ID=org_...
   POLAR_WEBHOOK_SECRET=whsec_...
   FRONTEND_URL=http://localhost:5173
   ```
   - ⚠️ **Note**: Update `FRONTEND_URL` to your ngrok URL when testing webhooks locally (see Step 7)

5. **Update `config.ts`**:
   ```typescript
   services: {
     polar: { enabled: true },  // 👈 Enable Polar
   }
   ```

### 6.2 Email with Resend

1. **Create account** at [resend.com](https://resend.com)

2. **Choose your email setup approach**:

   **Option A: Quick Testing (No Domain Required)**
   - Use Resend's built-in sandbox domain
   - Sender email: `onboarding@resend.dev` (works immediately)
   - Perfect for development and testing

   **Option B: Custom Domain (Production Ready)**
   - Verify your own domain for branded emails
   - Go to Resend dashboard → **Domains**
   - Click **Add Domain** and enter your domain (e.g., `yourdomain.com`)
   - Add the required DNS records to your domain registrar:
     - Copy the TXT, MX, and CNAME records shown
     - Add them to your domain's DNS settings
   - ⏳ **Wait for verification**: Status will show "Pending" → "Verified"
     - **Time**: Can take anywhere from **a few minutes to several hours**
     - **Depends on**: Your DNS provider's propagation time
     - **Don't wait**: Use Option A (`onboarding@resend.dev`) while waiting
   - Sender email: `noreply@yourdomain.com` (only after "Verified" status)

3. **Get API key**:
   - Go to Resend dashboard → **API Keys**
   - Click **Create API Key**
   - Give it a name and select **Full Access** permissions
   - Copy the API key (starts with `re_`)

4. **Set up webhook** (for email delivery tracking):
   - Get your Convex HTTP actions URL from dashboard (ends in `.convex.site`)
   - ⚠️ **Important**: Use `.convex.site` URL for webhooks, NOT `.convex.cloud`
   - In Resend dashboard → **Webhooks** → **Add Endpoint**
   - URL: `https://your-deployment.convex.site/resend-webhook`
   - Enable all `email.*` events (delivered, bounced, complained, etc.)
   - Click **Create**
   - Copy the webhook secret (starts with `whsec_`)

5. **Add to Convex environment variables**:
   - Go to Convex dashboard → **Settings** → **Environment Variables**
   - Add these required variables:
   ```bash
   RESEND_API_KEY=re_...
   RESEND_WEBHOOK_SECRET=whsec_...
   
   # Choose SENDER_EMAIL based on your setup:
   SENDER_EMAIL=onboarding@resend.dev        # Option A: Testing (works immediately)
   # OR
   SENDER_EMAIL=noreply@yourdomain.com       # Option B: Custom domain (after verification)
   
   COMPANY_NAME=Your Company Name            # For email templates
   ```
   - ⚠️ **Critical**: Resend runs as a Convex backend component, so ALL email environment variables must be in Convex dashboard, NOT in your local `.env.local` file
   - ⚠️ **Domain Error Fix**: If you get "domain not verified" error, either:
     - Use `onboarding@resend.dev` for testing, OR  
     - Verify your custom domain in Resend dashboard first

6. **Update `config.ts`**:
   ```typescript
   features: {
     email: true,  // 👈 Enable email feature
   },
   services: {
     resend: { enabled: true },  // 👈 Enable Resend service
   }
   ```

7. **Test email functionality**:
   
   **🚀 Quick Test Steps:**
   1. ✅ `npm run dev` → go to `/dashboard` (must be authenticated)
   2. ✅ Find "Test Email Functionality" card
   3. ✅ **Enter your Resend account email** (email you used to sign up for Resend)
   4. ✅ Add subject/message, click "Send Test Email"
   5. ✅ Look for green success toast message
   6. ✅ **Check spam folder first** (sandbox emails usually go there)
   7. ✅ Verify Status 200 in Resend dashboard → **Logs**
   
   **Detailed Instructions:**
   - Start your dev server: `npm run dev`
   - Navigate to `/dashboard` (authentication required)
   - Look for "Test Email" form in dashboard
   - **Important**: For sandbox testing (`onboarding@resend.dev`), you can ONLY send emails to the email address you used to sign up for Resend
   - Enter that specific email address in the test form
   - Send a test email with the test form in the dashboard and check:
     - ✅ Resend dashboard → **Logs** shows Status 200 (success)
     - ✅ Check your **inbox AND spam folder** (sandbox emails often go to spam)
     - ✅ Verify webhook events in Convex logs: `npx convex logs`

8. **What to expect for successful email testing**:
   - ✅ **Form submission**: Button shows loading spinner, then green success toast: "Test email sent successfully! Check your inbox (and spam folder)."
   - ✅ **Resend dashboard**: Status 200 in Logs with correct recipient email and request/response details
   - ✅ **Email delivery**: Email appears in spam folder (normal for sandbox `onboarding@resend.dev` emails)
   - ✅ **Convex logs**: Shows "Making a batch of 1 emails" message
   - ⚠️ **Normal behavior**: Sandbox emails from `onboarding@resend.dev` typically go to spam - this is expected!
   - 📧 **Email content**: Shows "Test Email from Kaizen" with your custom message

9. **Email configuration notes**:
   - **testMode**: Set to `false` in Resend config to send to real email addresses
   - **Development**: Emails work in development mode with proper API keys
   - **Rate limits**: Resend has generous limits but check their pricing page
   - **Spam prevention**: Use verified domains for production to avoid spam folders
   - **Sandbox limitations**: Can only send to your Resend account email address

### 6.2.1 Troubleshooting Email Issues

**"You can only send testing emails to your own email address" Error**:
```
Resend API error: {"statusCode":403,"message":"You can only send testing emails to your own email address (your-email@domain.com). To send emails to other recipients, please verify a domain..."}
```
**Solutions**:
1. **Use your Resend account email**: Enter the exact email address you used to sign up for Resend
2. **Alternative**: Verify a custom domain to send to any email address

**"Domain not verified" Error**:
```
Resend API error: {"statusCode":403,"message":"The domain yourdomain.com is not verified..."}
```
**Solutions**:
1. **Quick Fix**: Change `SENDER_EMAIL` to `onboarding@resend.dev` in Convex environment variables
2. **Production Fix**: Verify your domain in Resend dashboard → **Domains** → Add DNS records
   - ⚠️ **Important**: Domain verification is NOT instant
   - Status shows "Pending" for **minutes to hours** depending on DNS provider
   - Only use custom domain email AFTER status shows "Verified"

**Email sent but not received**:
1. **Check Resend dashboard**: Look for Status 200 in **Logs** section
2. **Check spam folder**: Sandbox emails (`onboarding@resend.dev`) often go to spam - this is normal
3. **Check correct email**: Make sure you're sending to your Resend account email
4. **Gmail users**: Check "All Mail" folder and search for "onboarding@resend.dev"

**Email not sending**:
- Check Convex logs: `npx convex logs` (no --watch flag)
- Verify all 4 environment variables are set in Convex dashboard
- Restart `npx convex dev` after adding environment variables
- Check Resend dashboard → **Logs** for delivery status

**Form refreshing page instead of sending**:
- Check browser console (F12) for JavaScript errors
- Verify user is authenticated (email feature requires login)
- Check that `api.sendEmails.sendTestEmailToAddress` is imported correctly

**Webhook not working**:
- Verify webhook URL uses `.convex.site` not `.convex.cloud`
- Check webhook secret matches in both Resend and Convex
- Test webhook in Resend dashboard → **Webhooks** → **Test**

### 6.3 Error Reporting & Monitoring

#### Built-in Convex Exception Reporting (Recommended)

For production-grade error reporting with zero code changes:

1. **Upgrade to Convex Pro** (required for built-in exception reporting)
2. **Create Sentry account** at [sentry.io](https://sentry.io)
3. **Create project** (choose "Generic" platform)
4. **Configure in Convex Dashboard**:
   - Go to Settings → Integrations → Exception Reporting
   - Add your Sentry DSN
   - All function errors will be automatically reported

#### Frontend Monitoring (Optional)

For additional frontend error tracking:

```bash
# Optional - for custom frontend error handling
VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id
```

## Step 7: Local Webhook Testing (Required for Payments)

If you're testing payments locally, you need to expose your localhost to the internet so Polar can send webhooks.

### 7.1 Install and Setup ngrok

1. **Install ngrok**: [Download from ngrok.com](https://ngrok.com/) or:
   ```bash
   # macOS with Homebrew
   brew install ngrok
   
   # Or download directly
   ```

2. **Expose your local server**:
   ```bash
   # Replace 5173 with your actual port
   ngrok http 5173
   ```

3. **Copy the public URL** (e.g., `https://abc123.ngrok.io`)

4. **Update allowed hosts** in `vite.config.ts`:
   ```typescript
   export default defineConfig({
     server: {
       allowedHosts: [
         'abc123.ngrok.io',  // Your ngrok URL without https://
       ],
     },
     // ... rest of config
   });
   ```

5. **Update Convex environment variables** (Required for payments):
   - In Convex dashboard → **Settings** → **Environment Variables**
   - Add: `FRONTEND_URL` with your ngrok URL (no trailing slash)
   - Example: `FRONTEND_URL=https://abc123.ngrok.io`
   - ⚠️ **Important**: This is required for payment redirects to work!

6. **Update Polar webhook URL**:
   - Go to Polar → **Settings** → **Webhooks**
   - Edit your webhook endpoint
   - Change URL to: `https://your-deployment.convex.site/payments/webhook`
   - Note: Use your Convex HTTP actions URL (`.convex.site`), not your frontend ngrok URL

### 7.2 Test Payment Flow

1. **Start your dev server** and ngrok
2. **Visit your ngrok URL** in browser
3. **Sign up/login** with a test account
4. **Go to pricing page** and click subscribe
5. **Use test credit card**: `4242 4242 4242 4242`
6. **Complete payment** and verify:
   - Redirected to success page
   - User has access to dashboard
   - Payment recorded in Convex data
   - Webhook received successfully

⚠️ **Remember**: When deploying to production, replace ngrok URL with your actual domain!

## Step 8: Development Workflow

### 8.1 Running Commands

```bash
# Development server
npm run dev

# Type checking
npm run typecheck

# Build for production
npm run build

```

### 8.2 File Structure

```
├── app/                    # React Router application
│   ├── components/        # Reusable UI components
│   ├── routes/           # Page components and routing
│   └── root.tsx          # App root component
├── convex/               # Convex backend functions
│   ├── schema.ts         # Database schema
│   ├── users.ts          # User management functions
│   └── sendEmails.ts     # Email functions
├── config.ts             # ⚙️ Main configuration file
└── guides/               # Setup documentation
```

### 8.3 Common Development Tasks

**Add a new page:**
1. Create file in `app/routes/`
2. Export default component
3. Add to navigation if needed

**Add a new Convex function:**
1. Create/edit file in `convex/`
2. Export query, mutation, or action
3. Use in React with `useQuery` or `useMutation`

**Add a new UI component:**
1. Create in `app/components/`
2. Follow existing patterns
3. Add to exports if reusable

## Step 9: Testing Your Setup

### 9.1 Configuration Validation

Run the development server and check the console for:

```bash
🎯 Kaizen Configuration Status:
✅ Core features initialized
✅ Authentication: Enabled (Clerk)
✅ Database: Enabled (Convex)
✅ Monitoring: Backend via Convex built-in
```

### 9.2 Complete Flow Testing

**Test the full authentication + payment flow:**

1. **Homepage Test**:
   - [ ] Loads without errors
   - [ ] Navigation works
   - [ ] Login/Sign up buttons visible (if auth enabled)

2. **Authentication Flow**:
   - [ ] Click "Sign up" → form loads
   - [ ] Create test account (use any email + password)
   - [ ] Verify you're redirected to dashboard
   - [ ] Check Convex dashboard → **Data** → **users** table for your user

3. **Payment Flow** (if payments enabled):
   - [ ] Navigate to pricing page
   - [ ] Click "Subscribe" on a plan
   - [ ] Redirected to Polar checkout
   - [ ] Use test card: `4242 4242 4242 4242`
   - [ ] Fill in random details (name, address)
   - [ ] Complete payment successfully
   - [ ] Verify redirect to success page
   - [ ] Check you have dashboard access

4. **Database Verification**:
   - [ ] In Convex dashboard → **Data** → **subscriptions**
   - [ ] Find your subscription record with `status: "active"`
   - [ ] User record should show subscription details

5. **AI Chat Test** (if OpenAI enabled):
   - [ ] Go to dashboard → **Chat** tab
   - [ ] Send test message: "Hello, what is 2 + 2?"
   - [ ] Verify AI responds correctly

6. **Subscription Management**:
   - [ ] Go to dashboard → **Settings**
   - [ ] Click "Manage Subscription"
   - [ ] Verify redirected to Polar customer portal
   - [ ] Test cancelling subscription
   - [ ] Check database shows updated status

### 9.3 Error & Edge Case Testing

- [ ] **Invalid credentials**: Test wrong password
- [ ] **Network errors**: Disconnect wifi during payment
- [ ] **Webhook testing**: Check Convex logs for webhook events
- [ ] **Multiple subscriptions**: Test upgrading/downgrading plans


## Troubleshooting

### Common Issues

1. **"Convex deployment not found"**:
   - Run `npx convex dev` first
   - Check that `VITE_CONVEX_URL` is set correctly

2. **Authentication not working**:
   - Verify Clerk keys are correct
   - Check that localhost URLs are allowed in Clerk dashboard

3. **Payment checkout errors** (e.g., "Input should be a valid URL"):
   - Check that `FRONTEND_URL` is set in Convex environment variables
   - Verify the URL format: `https://abc123.ngrok.io` (no trailing slash)
   - For local development: use your ngrok URL
   - For production: use your actual domain

4. **Build errors**:
   - Run `npm run typecheck` to see TypeScript errors
   - Make sure all enabled services have required environment variables

5. **Styling issues**:
   - Clear browser cache
   - Check that Tailwind CSS is working
   - Verify component imports are correct

### Getting Help

- **Configuration Issues**: Check `config.example.ts` for working examples
- **Convex Issues**: [Convex Discord](https://convex.dev/community)
- **React Router**: [React Router Docs](https://reactrouter.com/)
- **Tailwind CSS**: [Tailwind Docs](https://tailwindcss.com/)

---

## Next Steps

Once you have the app running locally:

1. **Explore the codebase**: Check out the different components and routes
2. **Try different features**: Enable/disable features in `config.ts`
3. **Read the guides**: Check out service-specific setup guides
4. **Deploy to production**: Follow the [Deploy to Production guide](./deploy-to-production.md)

🎉 **You're ready to build!** Your Kaizen application is now running locally with the features you need. 