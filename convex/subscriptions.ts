import { Polar } from "@polar-sh/sdk";
import { v } from "convex/values";
import { Webhook, WebhookVerificationError } from "standardwebhooks";
import { api } from "./_generated/api";
import { action, httpAction, mutation, query } from "./_generated/server";

const createCheckout = async ({
  customerEmail,
  productPriceId,
  successUrl,
  metadata,
}: {
  customerEmail: string;
  productPriceId: string;
  successUrl: string;
  metadata?: Record<string, string>;
}) => {
  // Check if required Polar environment variables are configured
  if (!process.env.POLAR_ACCESS_TOKEN) {
    throw new Error("POLAR_ACCESS_TOKEN is not configured");
  }
  
  if (!process.env.POLAR_ORGANIZATION_ID) {
    throw new Error("POLAR_ORGANIZATION_ID is not configured");
  }

  const polar = new Polar({
    server: (process.env.POLAR_SERVER as "sandbox" | "production") || "sandbox",
    accessToken: process.env.POLAR_ACCESS_TOKEN,
  });

  // Get product ID from price ID
  const { result: productsResult } = await polar.products.list({
    organizationId: process.env.POLAR_ORGANIZATION_ID,
    isArchived: false,
  });

  let productId = null;
  for (const product of productsResult.items) {
    const hasPrice = product.prices.some(
      (price: any) => price.id === productPriceId
    );
    if (hasPrice) {
      productId = product.id;
      break;
    }
  }

  if (!productId) {
    throw new Error(`Product not found for price ID: ${productPriceId}`);
  }

  const checkoutData = {
    products: [productId],
    successUrl: successUrl,
    customerEmail: customerEmail,
    metadata: {
      ...metadata,
      priceId: productPriceId,
    },
  };

  console.log(
    "Creating checkout with data:",
    JSON.stringify(checkoutData, null, 2)
  );

  const result = await polar.checkouts.create(checkoutData);
  return result;
};

export const getAvailablePlansQuery = query({
  handler: async (ctx) => {
    const polar = new Polar({
      server: "production",
      accessToken: process.env.POLAR_ACCESS_TOKEN,
    });

    const { result } = await polar.products.list({
      organizationId: process.env.POLAR_ORGANIZATION_ID,
      isArchived: false,
    });

    // Transform the data to remove Date objects and keep only needed fields
    const cleanedItems = result.items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      isRecurring: item.isRecurring,
      prices: item.prices.map((price: any) => ({
        id: price.id,
        amount: price.priceAmount,
        currency: price.priceCurrency,
        interval: price.recurringInterval,
      })),
    }));

    return {
      items: cleanedItems,
      pagination: result.pagination,
    };
  },
});

export const getAvailablePlans = action({
  handler: async (ctx) => {
    const polar = new Polar({
      server: "production",
      accessToken: process.env.POLAR_ACCESS_TOKEN,
    });

    const { result } = await polar.products.list({
      organizationId: process.env.POLAR_ORGANIZATION_ID,
      isArchived: false,
    });

    // Transform the data to remove Date objects and keep only needed fields
    const cleanedItems = result.items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      isRecurring: item.isRecurring,
      prices: item.prices.map((price: any) => ({
        id: price.id,
        amount: price.priceAmount,
        currency: price.priceCurrency,
        interval: price.recurringInterval,
      })),
    }));

    return {
      items: cleanedItems,
      pagination: result.pagination,
    };
  },
});

export const createCheckoutSession = action({
  args: {
    priceId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // First check if user exists
    let user = await ctx.runQuery(api.users.findUserByToken, {
      tokenIdentifier: identity.subject,
    });

    // If user doesn't exist, create them
    if (!user) {
      user = await ctx.runMutation(api.users.upsertUser);

      if (!user) {
        throw new Error("Failed to create user");
      }
    }

    const checkout = await createCheckout({
      customerEmail: user.email!,
      productPriceId: args.priceId,
      successUrl: `${process.env.FRONTEND_URL}/success`,
      metadata: {
        userId: user.tokenIdentifier,
      },
    });

    return checkout.url;
  },
});

export const checkUserSubscriptionStatus = query({
  args: {
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let tokenIdentifier: string;

    if (args.userId) {
      // Use provided userId directly as tokenIdentifier (they are the same)
      tokenIdentifier = args.userId;
    } else {
      // Fall back to auth context
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        return { hasActiveSubscription: false, plan: "free" };
      }
      tokenIdentifier = identity.subject;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
      .unique();

    if (!user) {
      return { hasActiveSubscription: false, plan: "free" };
    }

    // Check for active subscription (monthly plans)
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("userId", (q) => q.eq("userId", user.tokenIdentifier))
      .first();

    // Check for confirmed payment (lifetime plans)
    const payment = await ctx.db
      .query("payments")
      .withIndex("userId", (q) => q.eq("userId", user.tokenIdentifier))
      .filter((q) => q.eq(q.field("status"), "confirmed"))
      .first();

    const hasActiveSubscription = 
      (subscription?.status === "active") || 
      (payment?.status === "confirmed");

    const plan = subscription?.plan || payment?.plan || user.plan || "free";

    return { 
      hasActiveSubscription, 
      plan,
      subscriptionStatus: subscription?.status,
      paymentStatus: payment?.status 
    };
  },
});

export const checkUserSubscriptionStatusByClerkId = query({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by Clerk user ID (this assumes the tokenIdentifier contains the Clerk user ID)
    // In Clerk, the subject is typically in the format "user_xxxxx" where xxxxx is the Clerk user ID
    const tokenIdentifier = `user_${args.clerkUserId}`;

    let user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
      .unique();

    // If not found with user_ prefix, try the raw userId
    if (!user) {
      user = await ctx.db
        .query("users")
        .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.clerkUserId))
        .unique();
    }

    if (!user) {
      return { hasActiveSubscription: false };
    }

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("userId", (q) => q.eq("userId", user?.tokenIdentifier))
      .first();

    const hasActiveSubscription = subscription?.status === "active";
    return { hasActiveSubscription };
  },
});

export const fetchUserSubscription = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      return null;
    }

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("userId", (q) => q.eq("userId", user.tokenIdentifier))
      .first();

    return subscription;
  },
});

export const handleWebhookEvent = mutation({
  args: {
    body: v.any(),
  },
  handler: async (ctx, args) => {
    // Extract event type from webhook payload
    const eventType = args.body.type;
    const webhookId = args.body.id; // Unique webhook ID from Polar

    console.log(
      "🔔 Received webhook event:",
      eventType,
      "for entity:",
      args.body.data.id,
      "webhook ID:",
      webhookId
    );

    // Check if this webhook has already been processed (deduplication)
    const existingWebhook = await ctx.db
      .query("webhookEvents")
      .withIndex("by_webhook_id", (q) => q.eq("webhookId", webhookId))
      .first();

    if (existingWebhook) {
      console.log("⏭️ Webhook already processed, skipping:", webhookId);
      return { success: true, message: "Webhook already processed", alreadyProcessed: true };
    }

    // Store webhook event with processing status
    const webhookEventId = await ctx.db.insert("webhookEvents", {
      id: args.body.id,
      type: eventType,
      polarEventId: args.body.data.id,
      createdAt: args.body.data.created_at,
      modifiedAt: args.body.data.modified_at || args.body.data.created_at,
      data: args.body.data,
      processed: false,
      created_at: Date.now(),
      // Deduplication fields
      webhookId: webhookId,
      processingStatus: "processing",
      processedAt: undefined,
      errorMessage: undefined,
    });

    try {

    switch (eventType) {
      case "subscription.created":
        console.log("📝 Processing subscription.created for userId:", args.body.data.metadata.userId);
        const subscriptionData = args.body.data;
        
        // Enhanced logging to debug the issue
        console.log("🔍 Subscription data analysis:");
        console.log("- recurring_interval:", subscriptionData.recurring_interval);
        console.log("- status:", subscriptionData.status);
        console.log("- product_id:", subscriptionData.product_id);
        console.log("- price_id:", subscriptionData.price_id);
        console.log("- amount:", subscriptionData.amount);
        console.log("- currency:", subscriptionData.currency);
        
        // Determine if this is a monthly subscription or lifetime purchase
        // Check for both recurring_interval and null/undefined values
        const isMonthly = subscriptionData.recurring_interval === "month";
        const isLifetime = !subscriptionData.recurring_interval || subscriptionData.recurring_interval === null || subscriptionData.recurring_interval === "none";
        const plan = isMonthly ? "monthly" : "lifetime";
        
        console.log(`📋 Plan type detected: ${plan} (isMonthly: ${isMonthly}, isLifetime: ${isLifetime})`);
        
        if (isMonthly) {
          // Check if subscription record already exists (idempotent)
          const existingSubscription = await ctx.db
            .query("subscriptions")
            .withIndex("polarId", (q) => q.eq("polarId", subscriptionData.id))
            .first();

          if (existingSubscription) {
            console.log("⏭️ Subscription record already exists for:", subscriptionData.id);
          } else {
            // Handle as recurring subscription
            await ctx.db.insert("subscriptions", {
              polarId: subscriptionData.id,
              polarPriceId: subscriptionData.price_id,
              currency: subscriptionData.currency,
              interval: subscriptionData.recurring_interval,
              userId: subscriptionData.metadata.userId,
              status: subscriptionData.status,
              currentPeriodStart: new Date(subscriptionData.current_period_start).getTime(),
              currentPeriodEnd: new Date(subscriptionData.current_period_end).getTime(),
              cancelAtPeriodEnd: subscriptionData.cancel_at_period_end,
              amount: subscriptionData.amount,
              startedAt: new Date(subscriptionData.started_at).getTime(),
              endedAt: subscriptionData.ended_at ? new Date(subscriptionData.ended_at).getTime() : undefined,
              canceledAt: subscriptionData.canceled_at ? new Date(subscriptionData.canceled_at).getTime() : undefined,
              customerCancellationReason: subscriptionData.customer_cancellation_reason || undefined,
            customerCancellationComment: subscriptionData.customer_cancellation_comment || undefined,
            metadata: subscriptionData.metadata || {},
            customFieldData: subscriptionData.custom_field_data || {},
            customerId: subscriptionData.customer_id,
            plan: plan,
            created_at: Date.now(),
            updated_at: Date.now(),
            });
            console.log("✅ Monthly subscription record created");
          }
        } else {
          // Check if lifetime payment record already exists (idempotent)
          const existingLifetimePayment = await ctx.db
            .query("payments")
            .withIndex("polarOrderId", (q) => q.eq("polarOrderId", subscriptionData.id))
            .first();

          if (existingLifetimePayment) {
            console.log("⏭️ Lifetime payment record already exists for:", subscriptionData.id);
          } else {
            // Handle as one-time lifetime purchase (stored in payments table)
            await ctx.db.insert("payments", {
              userId: subscriptionData.metadata.userId,
              polarOrderId: subscriptionData.id, // Use subscription ID as order ID
              polarProductId: subscriptionData.product_id || "unknown",
              polarPriceId: subscriptionData.price_id,
              status: subscriptionData.status === "active" ? "confirmed" : "pending",
              plan: "lifetime",
              amount: subscriptionData.amount,
              currency: subscriptionData.currency,
              customerId: subscriptionData.customer_id,
              metadata: subscriptionData.metadata || {},
              customFieldData: subscriptionData.custom_field_data || {},
              confirmedAt: subscriptionData.status === "active" ? Date.now() : undefined,
              created_at: Date.now(),
              updated_at: Date.now(),
            });
            console.log("✅ Lifetime payment record created");
          }
        }
        
        // Update user plan for both types
        try {
          console.log(`🔄 Attempting to update user plan to: ${plan} for userId: ${subscriptionData.metadata.userId}`);
          await ctx.runMutation(api.users.updateUserPlan, {
            tokenIdentifier: subscriptionData.metadata.userId,
            plan: plan,
          });
          console.log(`✅ User plan updated to: ${plan}`);
        } catch (error) {
          console.error("❌ Failed to update user plan:", error);
          console.error("❌ Error details:", JSON.stringify(error, null, 2));
        }
        break;

      case "subscription.updated":
        // Find existing subscription
        const existingSub = await ctx.db
          .query("subscriptions")
          .withIndex("polarId", (q) => q.eq("polarId", args.body.data.id))
          .first();

        if (existingSub) {
          await ctx.db.patch(existingSub._id, {
            amount: args.body.data.amount,
            status: args.body.data.status,
            currentPeriodStart: new Date(
              args.body.data.current_period_start
            ).getTime(),
            currentPeriodEnd: new Date(
              args.body.data.current_period_end
            ).getTime(),
            cancelAtPeriodEnd: args.body.data.cancel_at_period_end,
            metadata: args.body.data.metadata || {},
            customFieldData: args.body.data.custom_field_data || {},
          });
        }
        break;

      case "subscription.active":
        console.log("🚀 Processing subscription.active for userId:", args.body.data.metadata.userId);
        const activeData = args.body.data;
        
        // Enhanced logging for subscription.active
        console.log("🔍 Active subscription data analysis:");
        console.log("- recurring_interval:", activeData.recurring_interval);
        console.log("- status:", activeData.status);
        console.log("- product_id:", activeData.product_id);
        console.log("- price_id:", activeData.price_id);
        
        const isMonthlyActive = activeData.recurring_interval === "month";
        const isLifetimeActive = !activeData.recurring_interval || activeData.recurring_interval === null || activeData.recurring_interval === "none";
        const activePlan = isMonthlyActive ? "monthly" : "lifetime";
        
        console.log(`📋 Activating ${activePlan} plan (isMonthlyActive: ${isMonthlyActive}, isLifetimeActive: ${isLifetimeActive})`);

        if (isMonthlyActive) {
          // Update monthly subscription
          const activeSub = await ctx.db
            .query("subscriptions")
            .withIndex("polarId", (q) => q.eq("polarId", activeData.id))
            .first();

          if (activeSub) {
            await ctx.db.patch(activeSub._id, {
              status: activeData.status,
              startedAt: new Date(activeData.started_at).getTime(),
            });
            console.log("✅ Monthly subscription activated");
          }
        } else {
          // Update lifetime payment status
          const activePayment = await ctx.db
            .query("payments")
            .withIndex("polarOrderId", (q) => q.eq("polarOrderId", activeData.id))
            .first();

          if (activePayment) {
            await ctx.db.patch(activePayment._id, {
              status: "confirmed",
              confirmedAt: Date.now(),
              updated_at: Date.now(),
            });
            console.log("✅ Lifetime payment confirmed");
          }
        }
        
        // Update user plan for both types
        try {
          console.log(`🔄 Attempting to activate user plan to: ${activePlan} for userId: ${activeData.metadata.userId}`);
          await ctx.runMutation(api.users.updateUserPlan, {
            tokenIdentifier: activeData.metadata.userId,
            plan: activePlan,
          });
          console.log(`✅ User plan activated: ${activePlan}`);
        } catch (error) {
          console.error("❌ Failed to activate user plan:", error);
          console.error("❌ Error details:", JSON.stringify(error, null, 2));
        }
        break;

      case "subscription.canceled":
        // Find and update subscription
        const canceledSub = await ctx.db
          .query("subscriptions")
          .withIndex("polarId", (q) => q.eq("polarId", args.body.data.id))
          .first();

        if (canceledSub) {
          await ctx.db.patch(canceledSub._id, {
            status: args.body.data.status,
            canceledAt: args.body.data.canceled_at
              ? new Date(args.body.data.canceled_at).getTime()
              : undefined,
            customerCancellationReason:
              args.body.data.customer_cancellation_reason || undefined,
            customerCancellationComment:
              args.body.data.customer_cancellation_comment || undefined,
          });
          
          // Downgrade user to free plan when subscription is canceled
          await ctx.runMutation(api.users.updateUserPlan, {
            tokenIdentifier: args.body.data.metadata.userId,
            plan: "free",
          });
          console.log("✅ User plan downgraded to free due to cancellation");
        }
        break;

      case "subscription.uncanceled":
        // Find and update subscription
        const uncanceledSub = await ctx.db
          .query("subscriptions")
          .withIndex("polarId", (q) => q.eq("polarId", args.body.data.id))
          .first();

        if (uncanceledSub) {
          await ctx.db.patch(uncanceledSub._id, {
            status: args.body.data.status,
            cancelAtPeriodEnd: false,
            canceledAt: undefined,
            customerCancellationReason: undefined,
            customerCancellationComment: undefined,
          });
        }
        break;

      case "subscription.revoked":
        // Find and update subscription
        const revokedSub = await ctx.db
          .query("subscriptions")
          .withIndex("polarId", (q) => q.eq("polarId", args.body.data.id))
          .first();

        if (revokedSub) {
          await ctx.db.patch(revokedSub._id, {
            status: "revoked",
            endedAt: args.body.data.ended_at
              ? new Date(args.body.data.ended_at).getTime()
              : undefined,
          });
        }
        break;

      case "order.created":
        console.log("📦 Processing order.created for one-time payment");
        // Handle one-time payments (lifetime purchases)
        const orderData = args.body.data;
        
        // Check if payment record already exists (idempotent)
        const existingPaymentRecord = await ctx.db
          .query("payments")
          .withIndex("polarOrderId", (q) => q.eq("polarOrderId", orderData.id))
          .first();

        if (existingPaymentRecord) {
          console.log("⏭️ Payment record already exists for order:", orderData.id);
        } else {
          // Insert payment record
          await ctx.db.insert("payments", {
            userId: orderData.metadata.userId,
            polarOrderId: orderData.id,
            polarProductId: orderData.product_id,
            polarPriceId: orderData.product_price_id,
            status: "pending", // Initially pending
            plan: "lifetime", // One-time payments are always lifetime
            amount: orderData.amount,
            currency: orderData.currency,
            customerId: orderData.customer_id,
            metadata: orderData.metadata || {},
            customFieldData: orderData.custom_field_data || {},
            created_at: Date.now(),
            updated_at: Date.now(),
          });
          console.log("✅ Payment record created for order:", orderData.id);
        }
        break;

      case "order.updated":
        console.log("🔄 Processing order.updated");
        // Find and update the payment record
        const existingPayment = await ctx.db
          .query("payments")
          .withIndex("polarOrderId", (q) => q.eq("polarOrderId", args.body.data.id))
          .first();

        if (existingPayment) {
          await ctx.db.patch(existingPayment._id, {
            status: args.body.data.status,
            amount: args.body.data.amount,
            updated_at: Date.now(),
          });
          console.log("✅ Payment record updated for order:", args.body.data.id);
        }
        break;

      case "order.paid":
        console.log("💰 Processing order.paid - activating lifetime plan");
        // Order paid - activate lifetime plan (this is the key event for lifetime purchases)
        const paidOrder = args.body.data;
        
        console.log("🔍 Paid order data analysis:");
        console.log("- order_id:", paidOrder.id);
        console.log("- status:", paidOrder.status);
        console.log("- amount:", paidOrder.amount);
        console.log("- currency:", paidOrder.currency);
        console.log("- metadata:", JSON.stringify(paidOrder.metadata, null, 2));
        
        // Update payment record
        const paymentToPay = await ctx.db
          .query("payments")
          .withIndex("polarOrderId", (q) => q.eq("polarOrderId", paidOrder.id))
          .first();

        if (paymentToPay) {
          await ctx.db.patch(paymentToPay._id, {
            status: "confirmed",
            confirmedAt: Date.now(),
            updated_at: Date.now(),
          });
          console.log("✅ Payment record updated to confirmed");
        } else {
          console.log("⚠️ Payment record not found, creating new one");
          // Create payment record if it doesn't exist
          await ctx.db.insert("payments", {
            userId: paidOrder.metadata.userId,
            polarOrderId: paidOrder.id,
            polarProductId: paidOrder.product_id,
            polarPriceId: paidOrder.product_price_id,
            status: "confirmed",
            plan: "lifetime",
            amount: paidOrder.amount,
            currency: paidOrder.currency,
            customerId: paidOrder.customer_id,
            metadata: paidOrder.metadata || {},
            customFieldData: paidOrder.custom_field_data || {},
            confirmedAt: Date.now(),
            created_at: Date.now(),
            updated_at: Date.now(),
          });
        }

        // Update user plan to lifetime
        if (paidOrder.metadata?.userId) {
          try {
            console.log(`🔄 Activating lifetime plan for userId: ${paidOrder.metadata.userId}`);
            await ctx.runMutation(api.users.updateUserPlan, {
              tokenIdentifier: paidOrder.metadata.userId,
              plan: "lifetime",
            });
            console.log("✅ User plan updated to lifetime for order:", paidOrder.id);
          } catch (error) {
            console.error("❌ Failed to update user plan:", error);
            console.error("❌ Error details:", JSON.stringify(error, null, 2));
          }
        } else {
          console.error("❌ No userId found in order metadata");
        }
        break;

      case "order.confirmed":
        console.log("✅ Processing order.confirmed - activating lifetime plan");
        // Order confirmed - activate lifetime plan
        const confirmedOrder = args.body.data;
        
        // Update payment record
        const paymentToConfirm = await ctx.db
          .query("payments")
          .withIndex("polarOrderId", (q) => q.eq("polarOrderId", confirmedOrder.id))
          .first();

        if (paymentToConfirm) {
          await ctx.db.patch(paymentToConfirm._id, {
            status: "confirmed",
            confirmedAt: Date.now(),
            updated_at: Date.now(),
          });
        }

        // Update user plan to lifetime
        if (confirmedOrder.metadata?.userId) {
          try {
            await ctx.runMutation(api.users.updateUserPlan, {
              tokenIdentifier: confirmedOrder.metadata.userId,
              plan: "lifetime",
            });
            console.log("✅ User plan updated to lifetime for order:", confirmedOrder.id);
          } catch (error) {
            console.error("❌ Failed to update user plan:", error);
            // Don't throw error - let the payment record exist for manual fixing
          }
        }
        break;

      case "order.refunded":
        console.log("💸 Processing order.refunded");
        // Handle refunds - downgrade to free plan
        const refundedOrder = args.body.data;
        
        // Update payment record
        const paymentToRefund = await ctx.db
          .query("payments")
          .withIndex("polarOrderId", (q) => q.eq("polarOrderId", refundedOrder.id))
          .first();

        if (paymentToRefund) {
          await ctx.db.patch(paymentToRefund._id, {
            status: "refunded",
            refundedAt: Date.now(),
            updated_at: Date.now(),
          });
        }

        // Downgrade user to free plan
        if (refundedOrder.metadata?.userId) {
          try {
            await ctx.runMutation(api.users.updateUserPlan, {
              tokenIdentifier: refundedOrder.metadata.userId,
              plan: "free",
            });
            console.log("✅ User plan downgraded to free due to refund");
          } catch (error) {
            console.error("❌ Failed to downgrade user plan:", error);
          }
        }
        break;

      default:
        console.log(`Unhandled event type: ${eventType}`);
        break;
    }

    // Mark webhook as successfully processed
    await ctx.db.patch(webhookEventId, {
      processingStatus: "completed",
      processedAt: Date.now(),
      processed: true,
    });

    console.log("✅ Webhook processed successfully:", webhookId);
    return { success: true, message: "Webhook processed successfully" };

    } catch (error) {
      // Mark webhook as failed
      await ctx.db.patch(webhookEventId, {
        processingStatus: "failed",
        processedAt: Date.now(),
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      console.error("❌ Webhook processing failed:", error);
      throw error; // Re-throw to trigger Convex retry logic
    }
  },
});

// Use our own validation similar to validateEvent from @polar-sh/sdk/webhooks
// The only diffference is we use btoa to encode the secret since Convex js runtime doesn't support Buffer
const validateEvent = (
  body: string | Buffer,
  headers: Record<string, string>,
  secret: string
) => {
  const base64Secret = btoa(secret);
  const webhook = new Webhook(base64Secret);
  webhook.verify(body, headers);
};

export const paymentWebhook = httpAction(async (ctx, request) => {
  try {
    console.log("🔗 Webhook received at:", new Date().toISOString());
    
    // Check if required Polar environment variables are configured
    if (!process.env.POLAR_ACCESS_TOKEN || !process.env.POLAR_ORGANIZATION_ID) {
      console.log("❌ Polar not configured - missing environment variables");
      return new Response(JSON.stringify({ message: "Polar not configured" }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    const rawBody = await request.text();
    console.log("📦 Webhook body length:", rawBody.length);

    // Internally validateEvent uses headers as a dictionary e.g. headers["webhook-id"]
    // So we need to convert the headers to a dictionary
    // (request.headers is a Headers object which is accessed as request.headers.get("webhook-id"))
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Validate the webhook event
    if (!process.env.POLAR_WEBHOOK_SECRET) {
      throw new Error(
        "POLAR_WEBHOOK_SECRET environment variable is not configured"
      );
    }
    validateEvent(rawBody, headers, process.env.POLAR_WEBHOOK_SECRET);

    const body = JSON.parse(rawBody);
    console.log("🎯 Webhook event type:", body.type);
    console.log("📦 Webhook event data:", JSON.stringify(body.data, null, 2));

    // track events and based on events store data
    await ctx.runMutation(api.subscriptions.handleWebhookEvent, {
      body,
    });

    console.log("✅ Webhook processed successfully");
    return new Response(JSON.stringify({ message: "Webhook received!" }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return new Response(
        JSON.stringify({ message: "Webhook verification failed" }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(JSON.stringify({ message: "Webhook failed" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
});

export const getWebhookEvents = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("webhookEvents")
      .order("desc")
      .take(args.limit || 10);
    
    return events.map(event => ({
      id: event._id,
      type: event.type,
      polarEventId: event.polarEventId,
      created_at: event.created_at,
      data: event.data,
    }));
  },
});

export const debugUserPaymentStatus = query({
  args: {
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let tokenIdentifier: string;

    if (args.userId) {
      tokenIdentifier = args.userId;
    } else {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        return { error: "Not authenticated" };
      }
      tokenIdentifier = identity.subject;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
      .unique();

    if (!user) {
      return { error: "User not found" };
    }

    // Get all subscriptions for this user
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("userId", (q) => q.eq("userId", tokenIdentifier))
      .collect();

    // Get all payments for this user
    const payments = await ctx.db
      .query("payments")
      .withIndex("userId", (q) => q.eq("userId", tokenIdentifier))
      .collect();

    return {
      user: {
        id: user._id,
        tokenIdentifier: user.tokenIdentifier,
        plan: user.plan,
        summary_count: user.summary_count,
        quota_reset_date: user.quota_reset_date,
      },
      subscriptions,
      payments,
    };
  },
});

export const createCustomerPortalUrl = action({
  handler: async (ctx, args: { customerId: string }) => {
    const polar = new Polar({
      server: "production",
      accessToken: process.env.POLAR_ACCESS_TOKEN,
    });

    try {
      const result = await polar.customerSessions.create({
        customerId: args.customerId,
      });

      // Only return the URL to avoid Convex type issues
      return { url: result.customerPortalUrl };
    } catch (error) {
      console.error("Error creating customer session:", error);
      throw new Error("Failed to create customer session");
    }
  },
});
