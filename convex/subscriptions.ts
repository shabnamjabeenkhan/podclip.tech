import { Polar } from "@polar-sh/sdk";
import { v } from "convex/values";
import { Webhook, WebhookVerificationError } from "standardwebhooks";
import { api } from "./_generated/api";
import { action, httpAction, mutation, query } from "./_generated/server";

// Simple structured logger for consistent webhook/DB audit logs
function logStructured(event: string, payload: Record<string, unknown> = {}): void {
  try {
    console.log(
      JSON.stringify({ ts: new Date().toISOString(), event, ...payload })
    );
  } catch (err) {
    console.log(`[${event}]`, payload);
  }
}

type TierPlan = "basic" | "pro" | "premium";

function mapMonthlyPlan(amountCents: number): TierPlan {
  if (amountCents <= 999) return "basic"; // $9.99
  if (amountCents <= 1499) return "pro"; // $14.99
  return "premium"; // $49.99 (or higher monthly tiers)
}

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
      server: (process.env.POLAR_SERVER as "sandbox" | "production") || "sandbox",
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
      server: (process.env.POLAR_SERVER as "sandbox" | "production") || "sandbox",
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
    webhookId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Extract event type from webhook payload
    const eventType = args.body.type;
    // Polar sends the unique event ID in the `webhook-id` header, not in the body
    const webhookId = args.webhookId || args.body.id; 

    logStructured("webhook.received.detail", { type: eventType, entityId: args.body?.data?.id, webhookId: webhookId ?? null });

    // Check if this webhook has already been processed (deduplication)
    const existingWebhook = webhookId
      ? await ctx.db
      .query("webhookEvents")
      .withIndex("by_webhook_id", (q) => q.eq("webhookId", webhookId))
      .first()
      : null;

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
        
        const plan: TierPlan = mapMonthlyPlan(subscriptionData.amount ?? 0);
        
        console.log(`📋 Plan type detected: ${plan} (amount: $${(subscriptionData.amount ?? 0)/100})`);
        
        // All subscriptions are monthly recurring
        if (subscriptionData.recurring_interval === "month") {
          // Check if subscription record already exists (idempotent)
          const existingSubscription = await ctx.db
            .query("subscriptions")
            .withIndex("polarId", (q) => q.eq("polarId", subscriptionData.id))
            .first();

          if (existingSubscription) {
            console.log("⏭️ Subscription record already exists for:", subscriptionData.id);
          } else {
            // Handle as recurring subscription
            const insertDoc = {
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
            } as const;
            logStructured("subscriptions.insert", {
              table: "subscriptions",
              action: "insert",
              reason: "webhook:subscription.created",
              userId: insertDoc.userId,
              polarId: insertDoc.polarId,
              interval: insertDoc.interval,
              status: insertDoc.status,
            });
            const newId = await ctx.db.insert("subscriptions", insertDoc);
            logStructured("subscriptions.inserted", { _id: newId, polarId: insertDoc.polarId, userId: insertDoc.userId });
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
            const insertPayment = {
              userId: subscriptionData.metadata.userId,
              polarOrderId: subscriptionData.id, // Use subscription ID as order ID
              polarProductId: subscriptionData.product_id || "unknown",
              polarPriceId: subscriptionData.price_id,
              status: subscriptionData.status === "active" ? "confirmed" : "pending",
              plan: plan,
              amount: subscriptionData.amount,
              currency: subscriptionData.currency,
              customerId: subscriptionData.customer_id,
              metadata: subscriptionData.metadata || {},
              customFieldData: subscriptionData.custom_field_data || {},
              confirmedAt: subscriptionData.status === "active" ? Date.now() : undefined,
              created_at: Date.now(),
              updated_at: Date.now(),
            } as const;
            logStructured("payments.insert", {
              table: "payments",
              action: "insert",
              reason: "webhook:subscription.created(lifetime)",
              userId: insertPayment.userId,
              polarOrderId: insertPayment.polarOrderId,
              status: insertPayment.status,
            });
            const payId = await ctx.db.insert("payments", insertPayment);
            logStructured("payments.inserted", { _id: payId, polarOrderId: insertPayment.polarOrderId, userId: insertPayment.userId });
            console.log("✅ Lifetime payment record created");
          }
        }
        
        // Update user plan for both types and reset quotas on successful payment
        try {
          console.log(`🔄 Attempting to update user plan to: ${plan} for userId: ${subscriptionData.metadata.userId}`);
          await ctx.runMutation(api.users.updateUserPlanAndResetQuota, {
            tokenIdentifier: subscriptionData.metadata.userId,
            plan: plan,
            resetQuota: true, // Reset quota when new subscription is created
          });
          console.log(`✅ User plan updated to: ${plan} with quota reset`);
        } catch (error) {
          console.error("❌ Failed to update user plan:", error);
          console.error("❌ Error details:", JSON.stringify(error, null, 2));
        }
        break;

      case "subscription.updated":
        // Find existing subscription
        console.log("🔄 Processing subscription.updated for userId:", args.body.data.metadata?.userId);
        const existingSub = await ctx.db
          .query("subscriptions")
          .withIndex("polarId", (q) => q.eq("polarId", args.body.data.id))
          .first();

        if (existingSub) {
          const updatedData = args.body.data;
          const oldPeriodEnd = existingSub.currentPeriodEnd || 0;
          const newPeriodEnd = new Date(updatedData.current_period_end).getTime();
          
          // Check if this is a subscription renewal (new billing period started)
          const isRenewal = newPeriodEnd > oldPeriodEnd && updatedData.status === "active";
          
          // Calculate new plan based on updated amount
          const newPlan: TierPlan = mapMonthlyPlan(updatedData.amount || 0);
          
          const patchData: any = {
            amount: updatedData.amount,
            status: updatedData.status,
            currentPeriodStart: new Date(updatedData.current_period_start).getTime(),
            currentPeriodEnd: newPeriodEnd,
            cancelAtPeriodEnd: updatedData.cancel_at_period_end,
            metadata: updatedData.metadata || {},
            customFieldData: updatedData.custom_field_data || {},
          };

          // Update polarPriceId and customerId if present
          if (updatedData.price_id) {
            patchData.polarPriceId = updatedData.price_id;
          }
          if (updatedData.customer_id) {
            patchData.customerId = updatedData.customer_id;
          }

          // Update plan if changed
          if (existingSub.plan !== newPlan) {
            patchData.plan = newPlan;
          }

          await ctx.db.patch(existingSub._id, patchData);

          // If plan changed, update user plan WITHOUT resetting quotas (mid-cycle change)
          if (existingSub.plan !== newPlan) {
            logStructured("plan.changed", { 
              oldPlan: existingSub.plan, 
              newPlan, 
              userId: updatedData.metadata?.userId 
            });
            
            if (updatedData.metadata?.userId) {
              await ctx.runMutation(api.users.updateUserPlanAndResetQuota, {
                tokenIdentifier: updatedData.metadata.userId,
                plan: newPlan,
                resetQuota: false, // IMPORTANT: preserve usage counts on mid-cycle plan changes
              });
            }
          }

          // Reset quota if this is a renewal payment
          if (isRenewal && updatedData.metadata?.userId) {
            try {
              console.log(`🔄 RENEWAL DETECTED: Resetting quota for userId: ${updatedData.metadata.userId}`);
              await ctx.runMutation(api.users.resetQuotaOnPayment, {
                tokenIdentifier: updatedData.metadata.userId,
                reason: "subscription renewal payment"
              });
              console.log(`✅ Quota reset on subscription renewal`);
            } catch (error) {
              console.error("❌ Failed to reset quota on renewal:", error);
            }
          }
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
        const activePlan: TierPlan = mapMonthlyPlan(activeData.amount ?? 0);
        
        console.log(`📋 Activating ${activePlan} plan (isMonthlyActive: ${isMonthlyActive})`);

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
              plan: activePlan,
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
              plan: activePlan,
            });
            console.log("✅ Payment confirmed");
          }
        }
        
        // Update user plan for both types
        try {
          console.log(`🔄 Attempting to activate user plan to: ${activePlan} for userId: ${activeData.metadata.userId}`);
          
          // Do NOT reset on activation/plan change; only reset on true renewals (handled in subscription.updated)
          const shouldResetQuota = false;
          
          await ctx.runMutation(api.users.updateUserPlanAndResetQuota, {
            tokenIdentifier: activeData.metadata.userId,
            plan: activePlan,
            resetQuota: shouldResetQuota,
          });
          console.log(`✅ User plan activated: ${activePlan}${shouldResetQuota ? ' with quota reset' : ''}`);
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
            status: "cancelled", // Mark as cancelled but keep access
            canceledAt: args.body.data.canceled_at
              ? new Date(args.body.data.canceled_at).getTime()
              : undefined,
            customerCancellationReason:
              args.body.data.customer_cancellation_reason || undefined,
            customerCancellationComment:
              args.body.data.customer_cancellation_comment || undefined,
            cancelAtPeriodEnd: true, // Mark for end-of-period cancellation
          });
          
          // DO NOT immediately downgrade user - they keep access until period ends
          // The downgrade will happen when their currentPeriodEnd date passes
          console.log("✅ Subscription marked for cancellation at period end - user retains access");
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
        
        const orderAmount = orderData.amount || 0;
        const orderPlan: TierPlan = mapMonthlyPlan(orderAmount);
        console.log(`📋 Order plan type detected: ${orderPlan} (amount: $${(orderAmount/100).toFixed(2)})`);
        
        // Check if payment record already exists (idempotent)
        const existingPaymentRecord = await ctx.db
          .query("payments")
          .withIndex("polarOrderId", (q) => q.eq("polarOrderId", orderData.id))
          .first();

        if (existingPaymentRecord) {
          console.log("⏭️ Payment record already exists for order:", orderData.id);
        } else {
          // Insert payment record
          const insertPayment = {
            userId: orderData.metadata.userId,
            polarOrderId: orderData.id,
            polarProductId: orderData.product_id,
            polarPriceId: orderData.product_price_id,
            status: "pending", // Initially pending
            plan: orderPlan, // Use detected plan type
            amount: orderData.amount,
            currency: orderData.currency,
            customerId: orderData.customer_id,
            metadata: orderData.metadata || {},
            customFieldData: orderData.custom_field_data || {},
            created_at: Date.now(),
            updated_at: Date.now(),
          } as const;
          logStructured("payments.insert", {
            table: "payments",
            action: "insert",
            reason: "webhook:order.created",
            userId: insertPayment.userId,
            polarOrderId: insertPayment.polarOrderId,
            status: insertPayment.status,
          });
          const payId2 = await ctx.db.insert("payments", insertPayment);
          logStructured("payments.inserted", { _id: payId2, polarOrderId: insertPayment.polarOrderId, userId: insertPayment.userId });
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
          const insertPayment = {
            userId: paidOrder.metadata.userId,
            polarOrderId: paidOrder.id,
            polarProductId: paidOrder.product_id,
            polarPriceId: paidOrder.product_price_id,
            status: "confirmed",
            plan: mapMonthlyPlan(paidOrder.amount || 0),
            amount: paidOrder.amount,
            currency: paidOrder.currency,
            customerId: paidOrder.customer_id,
            metadata: paidOrder.metadata || {},
            customFieldData: paidOrder.custom_field_data || {},
            confirmedAt: Date.now(),
            created_at: Date.now(),
            updated_at: Date.now(),
          } as const;
          logStructured("payments.insert", {
            table: "payments",
            action: "insert",
            reason: "webhook:order.paid",
            userId: insertPayment.userId,
            polarOrderId: insertPayment.polarOrderId,
            status: insertPayment.status,
          });
          await ctx.db.insert("payments", insertPayment);
        }

        // Update user plan based on payment record
        if (paidOrder.metadata?.userId) {
          try {
            // Get the plan type from the payment record
            const finalPayment = await ctx.db
              .query("payments")
              .withIndex("polarOrderId", (q) => q.eq("polarOrderId", paidOrder.id))
              .first();
            
            const planToActivate = finalPayment?.plan || "basic"; // Default to basic if no plan found
            console.log(`🔄 Activating ${planToActivate} plan for userId: ${paidOrder.metadata.userId}`);
            
            await ctx.runMutation(api.users.updateUserPlanAndResetQuota, {
              tokenIdentifier: paidOrder.metadata.userId,
              plan: planToActivate,
              resetQuota: false, // IMPORTANT: preserve usage on payment activation
            });
            console.log(`✅ User plan updated to ${planToActivate} for order:`, paidOrder.id);
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

        // Update user plan based on payment record
        if (confirmedOrder.metadata?.userId) {
          try {
            // Get the plan type from the payment record
            const confirmedPayment = await ctx.db
              .query("payments")
              .withIndex("polarOrderId", (q) => q.eq("polarOrderId", confirmedOrder.id))
              .first();
            
            const planToActivate = confirmedPayment?.plan || "basic"; // Default to basic if no plan found
            console.log(`🔄 Activating ${planToActivate} plan for userId: ${confirmedOrder.metadata.userId}`);
            
            await ctx.runMutation(api.users.updateUserPlanAndResetQuota, {
              tokenIdentifier: confirmedOrder.metadata.userId,
              plan: planToActivate,
              resetQuota: false, // IMPORTANT: preserve usage on order confirmation
            });
            console.log(`✅ User plan updated to ${planToActivate} for order:`, confirmedOrder.id);
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

      case "invoice.paid":
        console.log("💰 Processing invoice.paid - subscription payment successful");
        const paidInvoice = args.body.data;
        
        if (paidInvoice.subscription_id && paidInvoice.metadata?.userId) {
          try {
            console.log(`🔄 INVOICE PAID: Resetting quota for userId: ${paidInvoice.metadata.userId}`);
            await ctx.runMutation(api.users.resetQuotaOnPayment, {
              tokenIdentifier: paidInvoice.metadata.userId,
              reason: "invoice payment successful"
            });
            console.log(`✅ Quota reset on invoice payment`);
          } catch (error) {
            console.error("❌ Failed to reset quota on invoice payment:", error);
          }
        }
        break;

      case "payment.succeeded":
        console.log("💳 Processing payment.succeeded - payment successful");
        const successfulPayment = args.body.data;
        
        if (successfulPayment.metadata?.userId) {
          try {
            console.log(`🔄 PAYMENT SUCCESS: Resetting quota for userId: ${successfulPayment.metadata.userId}`);
            await ctx.runMutation(api.users.resetQuotaOnPayment, {
              tokenIdentifier: successfulPayment.metadata.userId,
              reason: "payment successful"
            });
            console.log(`✅ Quota reset on payment success`);
          } catch (error) {
            console.error("❌ Failed to reset quota on payment success:", error);
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
    logStructured("webhook.received", {
      at: new Date().toISOString(),
      path: "subscriptions.paymentWebhook",
    });
    
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
    logStructured("webhook.body", { length: rawBody.length });

    // Internally validateEvent uses headers as a dictionary e.g. headers["webhook-id"]
    // So we need to convert the headers to a dictionary
    // (request.headers is a Headers object which is accessed as request.headers.get("webhook-id"))
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const webhookIdHeader = headers["webhook-id"] || headers["webhook_id"] || headers["x-webhook-id"];
    logStructured("webhook.headers", { webhookId: webhookIdHeader });

    // Validate the webhook event
    if (!process.env.POLAR_WEBHOOK_SECRET) {
      throw new Error(
        "POLAR_WEBHOOK_SECRET environment variable is not configured"
      );
    }
    validateEvent(rawBody, headers, process.env.POLAR_WEBHOOK_SECRET);

    const body = JSON.parse(rawBody);
    logStructured("webhook.event", { type: body.type });

    // track events and based on events store data
    await ctx.runMutation(api.subscriptions.handleWebhookEvent, {
      body,
      webhookId: webhookIdHeader,
    });

    logStructured("webhook.processed", { type: body.type, status: "ok" });
    return new Response(JSON.stringify({ message: "Webhook received!" }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      logStructured("webhook.error", { reason: "verification_failed" });
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

    logStructured("webhook.error", { reason: "unhandled_error", message: (error as Error)?.message });
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

// Scheduled job to check for expired cancelled subscriptions and downgrade users
// Query to find expired cancelled subscriptions
export const getExpiredCancelledSubscriptions = query({
  args: { currentTime: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "cancelled"),
          q.eq(q.field("cancelAtPeriodEnd"), true),
          q.lt(q.field("currentPeriodEnd"), args.currentTime) // Period has ended
        )
      )
      .collect();
  },
});

// Mutation to update subscription status
export const updateSubscriptionStatus = mutation({
  args: { 
    subscriptionId: v.id("subscriptions"),
    status: v.string(),
    endedAt: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const updateData: any = { status: args.status };
    if (args.endedAt) {
      updateData.endedAt = args.endedAt;
    }
    
    await ctx.db.patch(args.subscriptionId, updateData);
  },
});

// Scheduled job to check for expired cancelled subscriptions and downgrade users
export const processExpiredSubscriptions = action({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // Find all cancelled subscriptions that have passed their period end date
    const expiredSubscriptions = await ctx.runQuery(api.subscriptions.getExpiredCancelledSubscriptions, { currentTime: now });
    
    console.log(`🔍 Found ${expiredSubscriptions.length} expired cancelled subscriptions to process`);
    
    for (const subscription of expiredSubscriptions) {
      try {
        // Downgrade user to free plan
        await ctx.runMutation(api.users.updateUserPlan, {
          tokenIdentifier: subscription.userId,
          plan: "free",
        });
        
        // Update subscription status to 'ended'
        await ctx.runMutation(api.subscriptions.updateSubscriptionStatus, {
          subscriptionId: subscription._id,
          status: "ended",
          endedAt: now,
        });
        
        console.log(`✅ User ${subscription.userId} downgraded to free after subscription period ended`);
      } catch (error) {
        console.error(`❌ Failed to process expired subscription for user ${subscription.userId}:`, error);
      }
    }
    
    return { processedCount: expiredSubscriptions.length };
  },
});

export const createCustomerPortalUrl = action({
  handler: async (ctx, args: { customerId: string }) => {
    const polar = new Polar({
      server: (process.env.POLAR_SERVER as "sandbox" | "production") || "sandbox",
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
