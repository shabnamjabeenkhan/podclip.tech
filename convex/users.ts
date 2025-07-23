import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";

export const findUserByToken = query({
  args: { tokenIdentifier: v.string() },
  handler: async (ctx, args) => {
    // Get the user's identity from the auth context
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    // Check if we've already stored this identity before
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (user !== null) {
      return user;
    }

    return null;
  },
});

export const upsertUser = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    // Check if user exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (existingUser) {
      // Update if needed
      if (
        existingUser.name !== identity.name ||
        existingUser.email !== identity.email
      ) {
        await ctx.db.patch(existingUser._id, {
          name: identity.name,
          email: identity.email,
        });
      }
      return existingUser;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      name: identity.name,
      email: identity.email,
      tokenIdentifier: identity.subject,
      plan: "free", // Default plan
      summary_count: 0, // Starting count
      quota_reset_date: undefined, // No reset needed for free plan
    });

    await ctx.scheduler.runAfter(0, internal.sendEmails.sendWelcomeEmail, {
      email: identity.email!,
      name: identity.name!,
    });

    return await ctx.db.get(userId);
  },
});

// Get user's current quota status
export const getUserQuota = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      // Return default quota for new users instead of throwing error
      return {
        used: 0,
        limit: 5, // Free plan default
        remaining: 5,
        canGenerate: true,
        plan: "free",
        resetDate: undefined,
        needsReset: false,
        userId: identity.subject,
      };
    }

    // Check if user needs quota reset (for monthly subscribers)
    const now = Date.now();
    let currentCount = user.summary_count || 0;
    let quotaResetDate = user.quota_reset_date;
    let needsReset = false;

    // Both monthly and lifetime users need quota resets
    if ((user.plan === "monthly" || user.plan === "lifetime") && quotaResetDate && now >= quotaResetDate) {
      // User needs quota reset, but we can't mutate in a query
      // The reset will be handled by checkAndResetQuota mutation
      needsReset = true;
      currentCount = 0; // Show reset count in UI
      const nextMonth = new Date(quotaResetDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      quotaResetDate = nextMonth.getTime();
    }

    // Determine quota limits based on plan
    const quotaLimits = {
      free: 5,      // 5 summaries for free users
      monthly: 50,  // 50 summaries per month
      lifetime: 70, // 70 summaries per month for lifetime users
    };

    const limit = quotaLimits[user.plan as keyof typeof quotaLimits] || quotaLimits.free;
    const remaining = limit === -1 ? -1 : Math.max(0, limit - currentCount);
    const canGenerate = limit === -1 || currentCount < limit;

    return {
      used: currentCount,
      limit,
      remaining,
      canGenerate,
      plan: user.plan,
      resetDate: quotaResetDate,
      needsReset,
      userId: user.tokenIdentifier,
    };
  },
});

// Check and reset quota if needed (call before generating summary)
export const checkAndResetQuota = internalMutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const now = Date.now();
    let currentCount = user.summary_count || 0;

    // Check if user needs quota reset (for monthly and lifetime subscribers)
    if ((user.plan === "monthly" || user.plan === "lifetime") && user.quota_reset_date && now >= user.quota_reset_date) {
      // Reset quota for monthly and lifetime subscribers
      currentCount = 0;
      const nextMonth = new Date(user.quota_reset_date);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      await ctx.db.patch(user._id, {
        summary_count: 0,
        quota_reset_date: nextMonth.getTime(),
      });
    }

    // Return current quota status
    const quotaLimits = {
      free: 5,      // 5 summaries for free users
      monthly: 50,  // 50 summaries per month
      lifetime: 70, // 70 summaries per month for lifetime users
    };

    const limit = quotaLimits[user.plan as keyof typeof quotaLimits] || quotaLimits.free;
    const canGenerate = limit === -1 || currentCount < limit;

    return {
      canGenerate,
      used: currentCount,
      limit,
      remaining: limit === -1 ? -1 : Math.max(0, limit - currentCount),
    };
  },
});

// Increment user's summary count
export const incrementSummaryCount = internalMutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const currentCount = user.summary_count || 0;
    await ctx.db.patch(user._id, {
      summary_count: currentCount + 1,
    });

    return currentCount + 1;
  },
});

// Manual fix for existing paid users whose plan wasn't updated
export const fixUserPlanRobust = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
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

    let planToUpdate = null;
    let source = null;

    // Determine plan from subscription or payment
    if (subscription && subscription.status === "active") {
      planToUpdate = subscription.plan || (subscription.interval === "month" ? "monthly" : "lifetime");
      source = "subscription";
    } else if (payment && payment.status === "confirmed") {
      planToUpdate = payment.plan || "lifetime";
      source = "payment";
    }

    if (planToUpdate) {
      let quotaResetDate = user.quota_reset_date;
      
      // Set quota reset date for monthly subscribers only
      if (planToUpdate === "monthly") {
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
        quotaResetDate = nextMonth.getTime();
      } else {
        // Clear reset date for lifetime plans
        quotaResetDate = undefined;
      }

      await ctx.db.patch(user._id, {
        plan: planToUpdate,
        quota_reset_date: quotaResetDate,
        // Reset summary count when upgrading plans
        summary_count: 0,
      });

      return { 
        success: true, 
        plan: planToUpdate, 
        source,
        message: `Plan updated to ${planToUpdate} (from ${source})` 
      };
    } else {
      return { 
        success: false, 
        message: "No active subscription or confirmed payment found",
        details: {
          subscriptionStatus: subscription?.status || "none",
          paymentStatus: payment?.status || "none"
        }
      };
    }
  },
});

// Legacy function for backward compatibility - now uses the robust version
export const fixUserPlan = mutation({
  handler: async (ctx) => {
    // Call the robust version directly to avoid circular dependency
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Check for active subscription (monthly plans)
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("userId", (q) => q.eq("userId", user.tokenIdentifier))
      .first();

    // Check for confirmed payment (lifetime plans) - also check for "paid" status
    const payment = await ctx.db
      .query("payments")
      .withIndex("userId", (q) => q.eq("userId", user.tokenIdentifier))
      .filter((q) => q.or(q.eq(q.field("status"), "confirmed"), q.eq(q.field("status"), "paid")))
      .first();

    let planToUpdate = null;
    let source = null;

    // Determine plan from subscription or payment - prioritize lifetime payments
    if (payment && (payment.status === "confirmed" || payment.status === "paid")) {
      planToUpdate = payment.plan || "lifetime";
      source = "payment";
    } else if (subscription && subscription.status === "active") {
      planToUpdate = subscription.plan || (subscription.interval === "month" ? "monthly" : "lifetime");
      source = "subscription";
    }

    if (planToUpdate) {
      let quotaResetDate = user.quota_reset_date;
      
      // Set quota reset date for monthly subscribers only
      if (planToUpdate === "monthly") {
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
        quotaResetDate = nextMonth.getTime();
      } else {
        // Clear reset date for lifetime plans
        quotaResetDate = undefined;
      }

      await ctx.db.patch(user._id, {
        plan: planToUpdate,
        quota_reset_date: quotaResetDate,
        // Reset summary count when upgrading plans
        summary_count: 0,
      });

      return { 
        success: true, 
        plan: planToUpdate, 
        source,
        message: `Plan updated to ${planToUpdate} (from ${source})`,
        paymentStatus: payment?.status || "none"
      };
    } else {
      return { 
        success: false, 
        message: "No active subscription or confirmed payment found",
        details: {
          subscriptionStatus: subscription?.status || "none",
          paymentStatus: payment?.status || "none"
        }
      };
    }
  },
});

// Manual override to force upgrade user to lifetime (emergency fix)
export const forceUpgradeToLifetime = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    console.log("🔧 Force upgrading user to lifetime:", user.tokenIdentifier);

    // Force update to lifetime plan
    await ctx.db.patch(user._id, {
      plan: "lifetime",
      quota_reset_date: undefined, // Clear reset date for lifetime plans
      summary_count: 0, // Reset summary count
    });

    console.log("✅ User forcefully upgraded to lifetime plan");

    return { 
      success: true, 
      message: "Successfully upgraded to lifetime plan",
      plan: "lifetime",
      quota: 70
    };
  },
});

// Update user plan (called when subscription changes)
export const updateUserPlan = mutation({
  args: { 
    tokenIdentifier: v.string(),
    plan: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    let quotaResetDate = user.quota_reset_date;
    
    // Set quota reset date for monthly and lifetime subscribers
    if (args.plan === "monthly" || args.plan === "lifetime") {
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      quotaResetDate = nextMonth.getTime();
    } else {
      // Clear reset date for free plans
      quotaResetDate = undefined;
    }

    await ctx.db.patch(user._id, {
      plan: args.plan,
      quota_reset_date: quotaResetDate,
      // Reset summary count when upgrading plans
      summary_count: 0,
    });

    return await ctx.db.get(user._id);
  },
});

// Test function: Simulate using up quota
export const testUseUpQuota = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Set summary count to the limit
    const quotaLimits = {
      free: 5,
      monthly: 50,
      lifetime: 70,
    };

    const limit = quotaLimits[user.plan as keyof typeof quotaLimits] || quotaLimits.free;

    await ctx.db.patch(user._id, {
      summary_count: limit,
    });

    return {
      success: true,
      message: `Set quota to maximum (${limit}/${limit})`,
      plan: user.plan,
      used: limit,
      limit: limit,
    };
  },
});

// Test function: Force quota reset (simulate month passing)
export const testForceQuotaReset = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    if (user.plan === "free") {
      return {
        success: false,
        message: "Free users don't have quota resets",
        plan: user.plan,
      };
    }

    // Reset quota and set next reset date
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

    await ctx.db.patch(user._id, {
      summary_count: 0,
      quota_reset_date: nextMonth.getTime(),
    });

    const quotaLimits = {
      monthly: 50,
      lifetime: 70,
    };

    const limit = quotaLimits[user.plan as keyof typeof quotaLimits] || 50;

    return {
      success: true,
      message: `Quota reset! You now have ${limit} summaries available.`,
      plan: user.plan,
      used: 0,
      limit: limit,
      nextResetDate: nextMonth.toISOString(),
    };
  },
});

// Test function: Set quota reset date to past (to trigger automatic reset)
export const testTriggerAutomaticReset = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    if (user.plan === "free") {
      return {
        success: false,
        message: "Free users don't have quota resets",
        plan: user.plan,
      };
    }

    // Set quota reset date to 1 day ago to trigger automatic reset
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await ctx.db.patch(user._id, {
      quota_reset_date: yesterday.getTime(),
    });

    return {
      success: true,
      message: "Set quota reset date to yesterday. Next time you check your quota, it should automatically reset!",
      plan: user.plan,
      resetDate: yesterday.toISOString(),
    };
  },
});

// Daily cron job function: Reset quotas for all users whose reset date has passed
export const resetExpiredQuotas = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    console.log(`🕐 Daily quota reset check starting at ${new Date(now).toISOString()}`);
    
    // Find all users with expired quota reset dates (monthly and lifetime plans)
    const expiredUsers = await ctx.db
      .query("users")
      .filter((q) => 
        q.and(
          // User has a reset date
          q.neq(q.field("quota_reset_date"), undefined),
          // Reset date has passed
          q.lt(q.field("quota_reset_date"), now),
          // User is on a paid plan
          q.or(
            q.eq(q.field("plan"), "monthly"),
            q.eq(q.field("plan"), "lifetime")
          )
        )
      )
      .collect();

    console.log(`📊 Found ${expiredUsers.length} users with expired quotas`);

    let resetCount = 0;
    let errorCount = 0;

    // Reset quota for each expired user
    for (const user of expiredUsers) {
      try {
        const oldCount = user.summary_count || 0;
        
        // Calculate next reset date (same day next month)
        const currentResetDate = new Date(user.quota_reset_date!);
        const nextResetDate = new Date(currentResetDate);
        nextResetDate.setMonth(nextResetDate.getMonth() + 1);

        // Handle edge case: if next month doesn't have the same day (e.g., Jan 31 → Feb 28)
        if (nextResetDate.getMonth() !== (currentResetDate.getMonth() + 1) % 12) {
          // Set to last day of the target month
          nextResetDate.setDate(0);
        }

        // Reset the user's quota
        await ctx.db.patch(user._id, {
          summary_count: 0,
          quota_reset_date: nextResetDate.getTime(),
        });

        console.log(
          `✅ QUOTA RESET: ${user.tokenIdentifier} (${user.plan}) ` +
          `${oldCount} → 0, next reset: ${nextResetDate.toISOString().split('T')[0]}`
        );
        
        resetCount++;
      } catch (error) {
        console.error(`❌ Failed to reset quota for user ${user.tokenIdentifier}:`, error);
        errorCount++;
      }
    }

    const summary = {
      timestamp: new Date(now).toISOString(),
      totalChecked: expiredUsers.length,
      successfulResets: resetCount,
      errors: errorCount,
      message: `Successfully reset ${resetCount} quotas, ${errorCount} errors`
    };

    console.log(`🏁 Daily quota reset completed:`, summary);
    
    return summary;
  },
});

// Test function: Manually trigger the daily quota reset (for testing the cron job)
export const testDailyCronReset = mutation({
  handler: async (ctx): Promise<{
    success: boolean;
    message: string;
    result: any;
  }> => {
    console.log("🧪 Manually triggering daily cron job for testing...");
    
    // Call the internal cron function directly
    const result: any = await ctx.runMutation(internal.users.resetExpiredQuotas, {});
    
    return {
      success: true,
      message: "Daily cron job executed manually for testing",
      result: result,
    };
  },
});

// Production monitoring: Get users with upcoming quota resets
export const getUpcomingQuotaResets = query({
  handler: async (ctx) => {
    const now = Date.now();
    const next7Days = now + (7 * 24 * 60 * 60 * 1000); // 7 days from now
    
    const usersWithUpcomingResets = await ctx.db
      .query("users")
      .filter((q) => 
        q.and(
          q.neq(q.field("quota_reset_date"), undefined),
          q.gt(q.field("quota_reset_date"), now),
          q.lt(q.field("quota_reset_date"), next7Days),
          q.or(
            q.eq(q.field("plan"), "monthly"),
            q.eq(q.field("plan"), "lifetime")
          )
        )
      )
      .collect();

    return usersWithUpcomingResets.map(user => ({
      userId: user.tokenIdentifier,
      plan: user.plan,
      currentQuota: user.summary_count || 0,
      resetDate: user.quota_reset_date,
      resetIn: user.quota_reset_date ? Math.ceil((user.quota_reset_date - now) / (24 * 60 * 60 * 1000)) : null,
    }));
  },
});

// Production monitoring: Check cron job execution history
export const getCronExecutionHistory = query({
  handler: async (ctx) => {
    // This would require storing cron execution results, but for now we can check recent logs
    const recentUsers = await ctx.db
      .query("users")
      .filter((q) => 
        q.and(
          q.or(
            q.eq(q.field("plan"), "monthly"),
            q.eq(q.field("plan"), "lifetime")
          ),
          q.neq(q.field("quota_reset_date"), undefined)
        )
      )
      .order("desc")
      .take(10);

    return {
      totalPaidUsers: recentUsers.length,
      recentResets: recentUsers.filter(u => {
        const now = Date.now();
        const daysSinceReset = u.quota_reset_date ? (now - u.quota_reset_date) / (24 * 60 * 60 * 1000) : 999;
        return daysSinceReset < 1 && u.summary_count === 0; // Reset in last 24h with 0 count
      }).length,
      nextCronRun: "Daily at 2:00 AM UTC",
    };
  },
});
