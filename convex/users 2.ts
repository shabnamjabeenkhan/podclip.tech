import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

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

    if (user.plan === "monthly" && quotaResetDate && now >= quotaResetDate) {
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
      monthly: 70,  // 70 summaries per month
      lifetime: 70, // 70 summaries per month (same as monthly)
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

    // Check if user needs quota reset (for monthly subscribers)
    if (user.plan === "monthly" && user.quota_reset_date && now >= user.quota_reset_date) {
      // Reset quota for monthly subscribers
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
      monthly: 70,  // 70 summaries per month
      lifetime: 70, // 70 summaries per month (same as monthly)
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
export const fixUserPlan = mutation({
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

    // Check if user has an active subscription
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("userId", (q) => q.eq("userId", user.tokenIdentifier))
      .first();

    if (subscription && subscription.status === "active") {
      // Update user plan based on subscription
      const plan = subscription.plan || (subscription.interval === "month" ? "monthly" : "lifetime");
      
      let quotaResetDate = user.quota_reset_date;
      
      // Set quota reset date for monthly subscribers
      if (plan === "monthly") {
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
        quotaResetDate = nextMonth.getTime();
      } else {
        // Clear reset date for non-monthly plans
        quotaResetDate = undefined;
      }

      await ctx.db.patch(user._id, {
        plan: plan,
        quota_reset_date: quotaResetDate,
        // Reset summary count when upgrading plans
        summary_count: 0,
      });

      return { success: true, plan: plan, message: `Plan updated to ${plan}` };
    } else {
      return { success: false, message: "No active subscription found" };
    }
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
    
    // Set quota reset date for monthly subscribers
    if (args.plan === "monthly") {
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      quotaResetDate = nextMonth.getTime();
    } else {
      // Clear reset date for non-monthly plans
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
