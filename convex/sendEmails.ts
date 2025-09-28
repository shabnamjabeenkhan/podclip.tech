import { components } from "./_generated/api";
import { Resend, vEmailId, vEmailEvent } from "@convex-dev/resend";
import { internalMutation, action } from "./_generated/server";
import { v } from "convex/values";

export const resend: Resend = new Resend(components.resend, {
  testMode: false, // Set to false to allow sending to real email addresses
});

export const handleEmailEvent = internalMutation({
  args: {
    id: vEmailId,
    event: vEmailEvent,
  },
  handler: async (_ctx, args) => {
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

export const checkAndSendSummaryEmail = internalMutation({
  args: {
    userId: v.string(),
    episodeTitle: v.string(),
    summary: v.string(),
    takeaways: v.array(v.any()),
    actionableInsights: v.optional(v.array(v.any())),
    summaryId: v.string()
  },
  handler: async (ctx, { userId, episodeTitle, summary, takeaways, actionableInsights, summaryId }) => {
    // Get user details - userId is actually the document ID, need to query by tokenIdentifier
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", userId))
      .unique();

    if (!user?.email) {
      console.log(`📧 No email address found for user: ${userId}`);
      return;
    }

    // Production: Use actual user email
    const emailToSend = user.email;

    console.log(`🔍 Environment check:`, {
      NODE_ENV: process.env.NODE_ENV,
      userEmail: user.email,
      emailToSend,
      userId
    });

    // Check user preferences for email notifications
    const preferences = await ctx.db
      .query("user_preferences")
      .withIndex("by_user", (q) => q.eq("user_id", user.tokenIdentifier))
      .unique();

    const emailNotificationsEnabled = preferences?.email_notifications ?? true; // Default to enabled

    if (!emailNotificationsEnabled) {
      console.log(`📧 Email notifications disabled for user: ${user.email}`);
      return;
    }

    console.log(`📧 EMAIL TEMPLATE v3.0 [DEPLOYED ${new Date().toISOString()}]: NO TIMESTAMPS | Sending to ${emailToSend} | Takeaways: ${takeaways.length} | Insights: ${actionableInsights?.length || 0}`);

    try {
      // Send the email
      const emailResult = await resend.sendEmail(
        ctx,
        `${process.env.COMPANY_NAME || "PodClip"} <${process.env.SENDER_EMAIL || "summaries@resend.dev"}>`,
        emailToSend,
        `📝 Your ${episodeTitle} Summary`,
        `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb; margin-bottom: 20px;">Hi ${user.name || "there"}! Your podcast summary is ready 🎧</h2>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <h3 style="margin-top: 0; color: #1e40af;">${episodeTitle}</h3>
            <p style="margin-bottom: 0;">${summary}</p>
          </div>

          <h4 style="color: #1e40af; margin-top: 30px;">Key Takeaways:</h4>
          <ul style="line-height: 1.6; padding-left: 20px;">${takeaways.map((t: any) => {
            const text = typeof t === 'string' ? t : t.text;
            return `<li style="margin-bottom: 8px;">${text}</li>`;
          }).join('')}</ul>

          ${actionableInsights && actionableInsights.length > 0 ? `
          <h4 style="color: #1e40af; margin-top: 30px;">Actionable Insights:</h4>
          <ul style="line-height: 1.6; padding-left: 20px;">${actionableInsights.map((insight: any) => {
            const action = typeof insight === 'string' ? insight : (insight.action || insight.text || String(insight));
            return `<li style="margin-bottom: 8px; color: #059669;"><strong>💡 ${action}</strong></li>`;
          }).join('')}</ul>` : ''}

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/dashboard/all-summaries" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View full summary in dashboard →</a>
          </div>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; text-align: center;">
            Generated by ${process.env.COMPANY_NAME || "PodClip"} •
            <a href="${process.env.FRONTEND_URL}/dashboard/settings" style="color: #2563eb;">Manage email preferences</a>
          </p>
        </div>
        `
      );

      console.log(`✅ Email successfully sent via Resend. Email ID: ${emailResult || 'unknown'}`);
      console.log(`📧 Email details:`, { to: emailToSend, from: process.env.SENDER_EMAIL });
    } catch (error) {
      console.error(`❌ Failed to send email to ${user.email}:`, error);
      throw error;
    }
  },
});

export const sendSummaryEmail = internalMutation({
  args: {
    email: v.string(),
    name: v.string(),
    episodeTitle: v.string(),
    summary: v.string(),
    takeaways: v.array(v.any()),
    episodeUrl: v.optional(v.string())
  },
  handler: async (ctx, { email, name, episodeTitle, summary, takeaways, episodeUrl }) => {
    const fromEmail = process.env.SENDER_EMAIL || "summaries@resend.dev";
    const companyName = process.env.COMPANY_NAME || "PodClip";

    // Format takeaways as HTML list
    const takeawaysList = takeaways.map((t: any) => {
      const text = typeof t === 'string' ? t : t.text;
      const timestamp = t.timestamp ? ` (${t.formatted_time})` : '';
      return `<li style="margin-bottom: 8px;">${text}${timestamp}</li>`;
    }).join('');

    await resend.sendEmail(
      ctx,
      `${companyName} <${fromEmail}>`,
      email,
      `📝 Your ${episodeTitle} Summary`,
      `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb; margin-bottom: 20px;">Hi ${name}! Your podcast summary is ready 🎧</h2>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
          <h3 style="margin-top: 0; color: #1e40af;">${episodeTitle}</h3>
          <p style="margin-bottom: 0;">${summary}</p>
        </div>

        <h4 style="color: #1e40af; margin-top: 30px;">Key Takeaways:</h4>
        <ul style="line-height: 1.6; padding-left: 20px;">${takeawaysList}</ul>

        ${episodeUrl ? `<div style="text-align: center; margin: 30px 0;">
          <a href="${episodeUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View full summary in dashboard →</a>
        </div>` : ''}

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px; text-align: center;">
          Generated by ${companyName} •
          <a href="${process.env.FRONTEND_URL}/dashboard/settings" style="color: #2563eb;">Manage email preferences</a>
        </p>
      </div>
      `
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

      // Send confirmation email to the user (only if not in sandbox mode or if email matches admin)
      const isTestMode = fromEmail.includes('resend.dev');
      if (!isTestMode || email === adminEmail) {
        try {
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
        } catch (confirmationError) {
          console.log("Could not send confirmation email in sandbox mode, but contact form was delivered to admin");
        }
      }

      return { success: true, message: "Contact email sent successfully!" };
    } catch (error) {
      console.error("Failed to send contact email:", error);
      throw new Error("Failed to send contact email. Please try again or email us directly.");
    }
  },
}); 