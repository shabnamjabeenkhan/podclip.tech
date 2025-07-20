# 📧 Email Setup with Resend (Convex Component)

This guide explains how to set up email functionality using the Convex Resend component.

## 🔧 Setup

### 1. Get Resend API Key
1. Go to [Resend.com](https://resend.com)
2. Create an account or sign in
3. Navigate to API Keys in your dashboard
4. Create a new API key
5. Copy the API key (starts with `re_`)

### 2. Configure Environment Variables
Add these to your Convex deployment environment variables:

```bash
RESEND_API_KEY=re_your_api_key_here
RESEND_WEBHOOK_SECRET=whsec_your_webhook_secret_here  # Optional but recommended
```

### 3. Enable Email in Config
Update your `config.ts`:

```typescript
export const config: AppConfig = {
  features: {
    email: true,      // Enable email feature
    convex: true,     // Required for Resend component
    // ... other features
  },
  services: {
    resend: {
      enabled: true,
      apiKey: getEnvVar('RESEND_API_KEY'),
      webhookSecret: getEnvVar('RESEND_WEBHOOK_SECRET'),
    },
    convex: {
      enabled: true,
      // ... convex config
    },
    // ... other services
  },
};
```

### 4. Set Up Domain (Production)
For production emails:
1. In Resend dashboard, go to Domains
2. Add your domain (e.g., `mydomain.com`)
3. Add the required DNS records
4. Verify the domain

## 🚀 Usage

### Send Emails from Convex Functions

```typescript
import { resend } from "./sendEmails";

// In any Convex function
export const sendWelcomeEmail = internalMutation({
  args: { email: v.string(), name: v.string() },
  handler: async (ctx, { email, name }) => {
    await resend.sendEmail(
      ctx,
      "Your App <welcome@yourdomain.com>",
      email,
      `Welcome ${name}!`,
      `<h1>Welcome to our app, ${name}!</h1>`
    );
  },
});
```

### Available Functions

The `convex/sendEmails.ts` file includes:
- `sendTestEmail()` - Send a test email
- `sendWelcomeEmail(email, name)` - Send welcome email to new users
- `handleEmailEvent(id, event)` - Handle webhook events from Resend

### Email Events & Webhooks

Resend will send webhook events to `/resend-webhook` for:
- Email delivered
- Email bounced
- Email complained (spam)
- Email opened (if tracking enabled)
- Email clicked (if tracking enabled)

These events are automatically handled and logged.

## 🔗 Integration Points

### User Registration
Call welcome email when users sign up:

```typescript
// In your user registration function
await ctx.runMutation(internal.sendEmails.sendWelcomeEmail, {
  email: user.email,
  name: user.name,
});
```

### Order Confirmations
```typescript
await resend.sendEmail(
  ctx,
  "Your Store <orders@yourstore.com>",
  customerEmail,
  "Order Confirmation #12345",
  orderEmailTemplate
);
```

## 📊 Testing

1. **Test Email Function**: Call `sendTestEmail()` to verify setup
2. **Check Logs**: Monitor Convex logs for email sending status  
3. **Webhook Testing**: Use Resend dashboard to test webhook delivery
4. **Production Testing**: Send real emails to your own address

## 🔧 Customization

### Email Templates
Create reusable email templates in `convex/emailTemplates.ts`:

```typescript
export const welcomeEmailTemplate = (name: string) => `
  <html>
    <body>
      <h1>Welcome ${name}!</h1>
      <p>Thanks for joining us.</p>
    </body>
  </html>
`;
```

### Batch Emails
For multiple recipients:

```typescript
export const sendBatchEmails = internalMutation({
  args: { emails: v.array(v.string()), subject: v.string(), content: v.string() },
  handler: async (ctx, { emails, subject, content }) => {
    for (const email of emails) {
      await resend.sendEmail(ctx, "Your App <noreply@yourdomain.com>", email, subject, content);
    }
  },
});
```

## 🚨 Production Considerations

1. **Domain Verification**: Verify your sending domain in Resend
2. **Rate Limits**: Resend has rate limits based on your plan
3. **Bounce Handling**: Monitor bounce rates and handle bounced emails
4. **Unsubscribe Links**: Include unsubscribe links for marketing emails
5. **GDPR Compliance**: Handle email preferences and data deletion

## 💰 Pricing

Resend offers:
- **Free Tier**: 3,000 emails/month, 100 emails/day
- **Pro Plans**: Starting at $20/month for higher volumes

## 🔗 Resources

- [Resend Documentation](https://resend.com/docs)
- [Convex Resend Component](https://www.convex.dev/components/resend)
- [Email Best Practices](https://resend.com/docs/best-practices) 