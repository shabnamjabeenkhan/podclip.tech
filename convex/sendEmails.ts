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

export const sendContactEmail = action({
  args: { 
    name: v.string(),
    email: v.string(),
    subject: v.string(),
    message: v.string()
  },
  handler: async (ctx, { name, email, subject, message }) => {
    const fromEmail = process.env.SENDER_EMAIL || "contact@resend.dev";
    const companyName = process.env.COMPANY_NAME || "PodClip";
    const adminEmail = process.env.ADMIN_EMAIL || "admin@podclip.tech";
    
    try {
      // Send contact form submission to admin
      await resend.sendEmail(
        ctx,
        `${companyName} Contact Form <${fromEmail}>`,
        adminEmail,
        `Contact Form: ${subject}`,
        `
        <h2>New Contact Form Submission</h2>
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <div style="border-left: 3px solid #e5e7eb; padding-left: 12px; margin: 16px 0;">
          ${message.replace(/\n/g, '<br>')}
        </div>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          This message was sent via the contact form on ${companyName}.
          Reply directly to this email to respond to ${name}.
        </p>
        `
      );

      // Send confirmation email to the user
      await resend.sendEmail(
        ctx,
        `${companyName} <${fromEmail}>`,
        email,
        `Thanks for contacting ${companyName}`,
        `
        <h2>Thanks for reaching out, ${name}!</h2>
        <p>We've received your message about "<strong>${subject}</strong>" and will get back to you as soon as possible.</p>
        
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p><strong>Your message:</strong></p>
          <p style="margin: 8px 0;">${message.replace(/\n/g, '<br>')}</p>
        </div>
        
        <p>If you have any urgent questions, you can also reach us directly at <a href="mailto:${adminEmail}">${adminEmail}</a>.</p>
        
        <p>Best regards,<br>The ${companyName} Team</p>
        `
      );
      
      return { success: true, message: "Contact email sent successfully!" };
    } catch (error) {
      console.error("Failed to send contact email:", error);
      throw new Error("Failed to send contact email. Please try again or email us directly.");
    }
  },
}); 