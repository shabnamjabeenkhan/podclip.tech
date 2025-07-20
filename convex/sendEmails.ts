import { components, internal } from "./_generated/api";
import { Resend, vEmailId, vEmailEvent } from "@convex-dev/resend";
import { internalMutation, action } from "./_generated/server";
import { v } from "convex/values";

export const resend: Resend = new Resend(components.resend, {
  onEmailEvent: internal.sendEmails.handleEmailEvent,
  testMode: false, // Set to false to allow sending to real email addresses
});

export const handleEmailEvent = internalMutation({
  args: {
    id: vEmailId,
    event: vEmailEvent,
  },
  handler: async (ctx, args) => {
    console.log("Email event received:", args.id, args.event);
    // Handle email events here (deliveries, bounces, etc.)
    // You can update your database or trigger other actions based on the event
  },
});

export const sendTestEmail = internalMutation({
  handler: async (ctx) => {
    await resend.sendEmail(
      ctx,
      "Test <test@mydomain.com>",
      "delivered@resend.dev",
      "Test Email from Kaizen",
      "This is a test email from your Kaizen app!"
    );
  },
});

export const sendTestEmailToAddress = action({
  args: { 
    toEmail: v.string(),
    subject: v.optional(v.string()),
    message: v.optional(v.string())
  },
  handler: async (ctx, { toEmail, subject, message }) => {
    // Check if user is authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated to send test emails");
    }

    const fromEmail = process.env.SENDER_EMAIL || "test@resend.dev";
    const companyName = process.env.COMPANY_NAME || "Kaizen";
    
    try {
      await resend.sendEmail(
        ctx,
        `${companyName} <${fromEmail}>`,
        toEmail,
        subject || `Test Email from ${companyName}`,
        message || `<h1>Test Email</h1><p>This is a test email sent from your ${companyName} application!</p><p>If you received this, your email configuration is working correctly.</p>`
      );
      
      return { success: true, message: "Test email sent successfully!" };
    } catch (error) {
      console.error("Failed to send test email:", error);
      throw new Error("Failed to send test email. Check your email configuration.");
    }
  },
});

export const sendWelcomeEmail = internalMutation({
  args: { email: v.string(), name: v.string() },
  handler: async (ctx, { email, name }) => {
    const fromEmail = process.env.SENDER_EMAIL || "welcome@resend.dev";
    const companyName = process.env.COMPANY_NAME || "Kaizen";
    
    await resend.sendEmail(
      ctx,
      `${companyName} <${fromEmail}>`,
      email,
      `Welcome to ${companyName}, ${name}!`,
      `<h1>Welcome aboard, ${name}!</h1><p>We're excited to have you with us at ${companyName}.</p>`
    );
  },
}); 