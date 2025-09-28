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
      search_count: 0, // Starting search count
      time_saved_minutes: 0, // Starting time saved
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
  handler: async (ctx): Promise<{
    summaries: { used: number; limit: number; remaining: number; canGenerate: boolean };
    searches: { used: number; limit: number; remaining: number; canSearch: boolean };
    timeSavedMinutes: number;
    plan: string;
    resetDate?: number;
    needsReset: boolean;
    userId: string;
    subscriptionError?: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      // Return default values for unauthenticated users
      return {
        summaries: { used: 0, limit: 0, remaining: 0, canGenerate: false },
        searches: { used: 0, limit: 0, remaining: 0, canSearch: false },
        timeSavedMinutes: 0,
        plan: "free",
        resetDate: undefined,
        needsReset: false,
        userId: "",
        subscriptionError: "Not authenticated",
      };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      // Return default quota for new users instead of throwing error
      return {
        summaries: { used: 0, limit: 5, remaining: 5, canGenerate: true },
        searches: { used: 0, limit: 10, remaining: 10, canSearch: true }, // Free users: 10 searches
        timeSavedMinutes: 0,
        plan: "free",
        resetDate: undefined,
        needsReset: false,
        userId: identity.subject,
      };
    }

    // For paid plans, verify active subscription
    if (user.plan !== "free") {
      const subscriptionStatus: {
        hasActiveSubscription: boolean;
        reason: string;
        plan?: string;
      } = await ctx.runQuery(api.users.verifyActiveSubscription, { userId: user.tokenIdentifier });
      
      if (!subscriptionStatus.hasActiveSubscription) {
        // User doesn't have active subscription - return free plan quotas WITH ACTUAL USAGE
        const currentSummaryCount = user.summary_count || 0;
        const currentSearchCount = user.search_count || 0;
        const freeLimit = 5;
        const freeSearchLimit = 10;
        
        console.log(`🐛 DEBUG: User ${user.tokenIdentifier} has plan "${user.plan}" but no active subscription. Summary count: ${currentSummaryCount}, Search count: ${currentSearchCount}`);
        console.log(`📊 SUBSCRIPTION CHECK PATH: Returning free quotas with actual usage counts`);
        
        return {
          summaries: { 
            used: currentSummaryCount, 
            limit: freeLimit, 
            remaining: Math.max(0, freeLimit - currentSummaryCount), 
            canGenerate: currentSummaryCount < freeLimit 
          },
          searches: { 
            used: currentSearchCount, 
            limit: freeSearchLimit, 
            remaining: Math.max(0, freeSearchLimit - currentSearchCount), 
            canSearch: currentSearchCount < freeSearchLimit 
          },
          timeSavedMinutes: user.time_saved_minutes || 0,
          plan: user.plan || "free", // Show actual plan, fallback to "free"
          resetDate: undefined,
          needsReset: false,
          userId: identity.subject,
          subscriptionError: subscriptionStatus.reason,
        };
      }
    }

    // Check if user needs quota reset (for monthly subscribers)
    const now = Date.now();
    let currentSummaryCount = user.summary_count || 0;
    let currentSearchCount = user.search_count || 0;
    let quotaResetDate = user.quota_reset_date;
    let needsReset = false;

    // ONLY paid plan users get quota resets - FREE USERS NEVER GET RESETS
    // Free plan is one-time signup benefit only
    if ((user.plan === "monthly" || user.plan === "basic" || user.plan === "pro" || user.plan === "premium") && quotaResetDate && now >= quotaResetDate) {
      // User needs quota reset, but we can't mutate in a query
      // The reset will be handled by checkAndResetQuota mutation
      needsReset = true;
      currentSummaryCount = 0; // Show reset count in UI
      currentSearchCount = 0;
      const nextMonth = new Date(quotaResetDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      quotaResetDate = nextMonth.getTime();
    }
    // NOTE: Free users NEVER get quota resets - they must upgrade after using their signup allowance

    // Determine quota limits based on plan
    const summaryLimits = {
      free: 5,        // 5 summaries for free users
      basic: 20,      // 20 summaries per month (Basic Plan - $12.99)
      pro: 40,        // 40 summaries per month (Pro Plan - $20.99)
      premium: 60,    // 60 summaries per month (Premium Plan - $50.00)
      monthly: 50,    // 50 summaries per month (legacy monthly plan)
    };

    const searchLimits = {
      free: 10,       // 10 searches for free users
      basic: 25,      // 25 searches per month (Basic Plan - $12.99)
      pro: 50,        // 50 searches per month (Pro Plan - $20.99)
      premium: 70,    // 70 searches per month (Premium Plan - $50.00)
      monthly: 100,   // 100 searches per month (legacy monthly plan)
    };

    const summaryLimit = summaryLimits[user.plan as keyof typeof summaryLimits] || summaryLimits.free;
    const searchLimit = searchLimits[user.plan as keyof typeof searchLimits] || searchLimits.free;
    
    const summaryRemaining = Math.max(0, summaryLimit - currentSummaryCount);
    const searchRemaining = Math.max(0, searchLimit - currentSearchCount);
    
    const canGenerate = currentSummaryCount < summaryLimit;
    const canSearch = currentSearchCount < searchLimit;

    console.log(`📊 GET USER QUOTA: User ${identity.subject} | Plan: ${user.plan} | Summary count: ${currentSummaryCount}/${summaryLimit} | Search count: ${currentSearchCount}/${searchLimit}`);

    return {
      summaries: {
        used: currentSummaryCount,
        limit: summaryLimit,
        remaining: summaryRemaining,
        canGenerate,
      },
      searches: {
        used: currentSearchCount,
        limit: searchLimit,
        remaining: searchRemaining,
        canSearch,
      },
      timeSavedMinutes: user.time_saved_minutes || 0,
      plan: user.plan || "free",
      resetDate: quotaResetDate,
      needsReset,
      userId: user.tokenIdentifier,
    };
  },
});

// Check subscription payment status before allowing access
export const verifyActiveSubscription = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let tokenIdentifier: string;

    if (args.userId) {
      tokenIdentifier = args.userId;
    } else {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        return { hasActiveSubscription: false, reason: "Not authenticated" };
      }
      tokenIdentifier = identity.subject;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
      .unique();

    if (!user) {
      return { hasActiveSubscription: false, reason: "User not found" };
    }

    // For free users, no subscription required
    if (user.plan === "free") {
      return { hasActiveSubscription: true, plan: "free", reason: "Free plan" };
    }

    const now = Date.now();

    // Check for active monthly subscription (including cancelled with grace period)
    if (user.plan === "monthly" || user.plan === "basic" || user.plan === "pro" || user.plan === "premium") {
      // First check for active subscriptions
      const activeSubscription = await ctx.db
        .query("subscriptions")
        .withIndex("userId", (q) => q.eq("userId", tokenIdentifier))
        .filter((q) => q.eq(q.field("status"), "active"))
        .filter((q) => q.gt(q.field("currentPeriodEnd"), now)) // Must have valid current period
        .first();

      if (activeSubscription) {
        return { 
          hasActiveSubscription: true, 
          plan: user.plan,
          subscriptionId: activeSubscription.polarId,
          currentPeriodEnd: activeSubscription.currentPeriodEnd,
          reason: "Active monthly subscription"
        };
      }

      // Check for cancelled subscriptions still in grace period
      const cancelledSubscription = await ctx.db
        .query("subscriptions")
        .withIndex("userId", (q) => q.eq("userId", tokenIdentifier))
        .filter((q) => q.eq(q.field("status"), "cancelled"))
        .filter((q) => q.eq(q.field("cancelAtPeriodEnd"), true))
        .filter((q) => q.gt(q.field("currentPeriodEnd"), now)) // Grace period not expired
        .first();

      if (cancelledSubscription) {
        return {
          hasActiveSubscription: true,
          plan: user.plan,
          subscriptionId: cancelledSubscription.polarId,
          currentPeriodEnd: cancelledSubscription.currentPeriodEnd,
          reason: "Cancelled subscription in grace period",
          isCancelled: true,
          accessEndsAt: cancelledSubscription.currentPeriodEnd
        };
      }

      // Check for past_due subscriptions that haven't expired yet
      const pastDueSubscription = await ctx.db
        .query("subscriptions")
        .withIndex("userId", (q) => q.eq("userId", tokenIdentifier))
        .filter((q) => q.eq(q.field("status"), "past_due"))
        .filter((q) => q.gt(q.field("currentPeriodEnd"), now)) // Still valid by date
        .first();

      if (pastDueSubscription) {
        return {
          hasActiveSubscription: true,
          plan: user.plan,
          subscriptionId: pastDueSubscription.polarId,
          currentPeriodEnd: pastDueSubscription.currentPeriodEnd,
          reason: "Past due subscription still in valid period",
          isPastDue: true,
          accessEndsAt: pastDueSubscription.currentPeriodEnd
        };
      }

      return { 
        hasActiveSubscription: false, 
        plan: user.plan,
        reason: "No active subscription found or subscription expired" 
      };
    }

    return { hasActiveSubscription: false, reason: "Unknown plan type" };
  },
});

// Check and reset quota if needed - STRICT subscription enforcement
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

    // STRICT RULE: For ANY non-free plan, require active subscription
    if (user.plan !== "free") {
      const subscriptionStatus = await ctx.runQuery(api.users.verifyActiveSubscription, { userId: user.tokenIdentifier });
      
      if (!subscriptionStatus.hasActiveSubscription) {
        // BLOCK ALL PAID FEATURES - force user to free plan quotas
        throw new Error(`Subscription required: ${subscriptionStatus.reason}. You must have an active subscription to generate summaries or search podcasts beyond free limits.`);
      }
    }

    const now = Date.now();
    let currentSummaryCount = user.summary_count || 0;
    let currentSearchCount = user.search_count || 0;

    // ONLY reset quota if user is on PAID PLAN with active subscription AND reset date has passed
    // FREE USERS NEVER GET QUOTA RESETS - they must upgrade after using signup allowance
    if (user.plan !== "free" && (user.plan === "monthly" || user.plan === "basic" || user.plan === "pro" || user.plan === "premium") && user.quota_reset_date && now >= user.quota_reset_date) {
      // Double-check subscription is still active before resetting
      const subscriptionStatus = await ctx.runQuery(api.users.verifyActiveSubscription, { userId: user.tokenIdentifier });
      
      if (subscriptionStatus.hasActiveSubscription) {
        // Reset quota only after confirming active subscription
        currentSummaryCount = 0;
        currentSearchCount = 0;
        const nextMonth = new Date(user.quota_reset_date);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        
        await ctx.db.patch(user._id, {
          summary_count: 0,
          search_count: 0,
          quota_reset_date: nextMonth.getTime(),
        });

        console.log(`✅ QUOTA RESET: ${user.tokenIdentifier} (${user.plan}) - verified active subscription`);
      } else {
        console.log(`❌ QUOTA RESET DENIED: ${user.tokenIdentifier} - inactive subscription: ${subscriptionStatus.reason}`);
        throw new Error(`Cannot reset quota: ${subscriptionStatus.reason}`);
      }
    } else if (user.plan === "free") {
      console.log(`⏭️ FREE USER: ${user.tokenIdentifier} - no quota resets for free users, must upgrade after trial`);
    }

    // Return current quota status
    const summaryLimits = {
      free: 5,        // 5 summaries for free users
      basic: 20,      // 20 summaries per month (Basic Plan - $12.99)
      pro: 40,        // 40 summaries per month (Pro Plan - $20.99)
      premium: 60,    // 60 summaries per month (Premium Plan - $50.00)
      monthly: 50,    // 50 summaries per month (legacy monthly plan)
    };

    const searchLimits = {
      free: 10,       // 10 searches for free users
      basic: 25,      // 25 searches per month (Basic Plan - $12.99)
      pro: 50,        // 50 searches per month (Pro Plan - $20.99)
      premium: 70,    // 70 searches per month (Premium Plan - $50.00)
      monthly: 100,   // 100 searches per month (legacy monthly plan)
    };

    const summaryLimit = summaryLimits[user.plan as keyof typeof summaryLimits] || summaryLimits.free;
    const searchLimit = searchLimits[user.plan as keyof typeof searchLimits] || searchLimits.free;
    
    const canGenerate = currentSummaryCount < summaryLimit;
    const canSearch = currentSearchCount < searchLimit;

    return {
      canGenerate,
      canSearch,
      summaries: {
        used: currentSummaryCount,
        limit: summaryLimit,
        remaining: Math.max(0, summaryLimit - currentSummaryCount),
      },
      searches: {
        used: currentSearchCount,
        limit: searchLimit,
        remaining: Math.max(0, searchLimit - currentSearchCount),
      },
    };
  },
});

// STRICT quota check - enforces subscription requirement for paid plans
export const checkUserAccessAndQuota = internalMutation({
  handler: async (ctx, args: { featureType: "summary" | "search" }) => {
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
    let currentSummaryCount = user.summary_count || 0;
    let currentSearchCount = user.search_count || 0;

    // For paid plans, STRICTLY enforce active subscription requirement
    if (user.plan !== "free") {
      const subscriptionStatus = await ctx.runQuery(api.users.verifyActiveSubscription, { userId: user.tokenIdentifier });
      
      if (!subscriptionStatus.hasActiveSubscription) {
        // COMPLETE BLOCK - no access to paid features without active subscription
        throw new Error(`❌ SUBSCRIPTION REQUIRED: ${subscriptionStatus.reason}. You must have an active, paid subscription to ${args.featureType === "summary" ? "generate summaries" : "search for podcasts"} beyond the free tier limits (5 summaries, 10 searches).`);
      }

      // Check if quota reset is needed (ONLY for paid plans with active subscription)
      // FREE USERS NEVER GET QUOTA RESETS
      if (user.quota_reset_date && now >= user.quota_reset_date) {
        // Reset quota only after confirming active subscription (free users excluded)
        currentSummaryCount = 0;
        currentSearchCount = 0;
        const nextMonth = new Date(user.quota_reset_date);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        
        await ctx.db.patch(user._id, {
          summary_count: 0,
          search_count: 0,
          quota_reset_date: nextMonth.getTime(),
        });

        console.log(`✅ QUOTA RESET: ${user.tokenIdentifier} (${user.plan}) - verified active subscription`);
      }
    }

    // Determine quota limits
    const summaryLimits = {
      free: 5,        // 5 summaries for free users
      basic: 20,      // 20 summaries per month (Basic Plan - $12.99)
      pro: 40,        // 40 summaries per month (Pro Plan - $20.99)
      premium: 60,    // 60 summaries per month (Premium Plan - $50.00)
      monthly: 50,    // 50 summaries per month (legacy monthly plan)
    };

    const searchLimits = {
      free: 10,       // 10 searches for free users
      basic: 25,      // 25 searches per month (Basic Plan - $12.99)
      pro: 50,        // 50 searches per month (Pro Plan - $20.99)
      premium: 70,    // 70 searches per month (Premium Plan - $50.00)
      monthly: 100,   // 100 searches per month (legacy monthly plan)
    };

    const summaryLimit = summaryLimits[user.plan as keyof typeof summaryLimits] || summaryLimits.free;
    const searchLimit = searchLimits[user.plan as keyof typeof searchLimits] || searchLimits.free;

    // STRICT ENFORCEMENT: Check specific feature quota
    if (args.featureType === "summary") {
      if (currentSummaryCount >= summaryLimit) {
        if (user.plan === "free") {
          throw new Error(`🚫 FREE TRIAL EXHAUSTED: You've used all ${summaryLimit} free summaries from your signup trial. To continue generating summaries, you must upgrade to a paid subscription plan. Free summaries are a one-time signup benefit only.`);
        } else {
          throw new Error(`❌ MONTHLY QUOTA EXCEEDED: You've used all ${currentSummaryCount}/${summaryLimit} summaries for your ${user.plan} plan. Your quota will reset next month.`);
        }
      }
    } else { // search
      if (currentSearchCount >= searchLimit) {
        if (user.plan === "free") {
          throw new Error(`🚫 FREE TRIAL EXHAUSTED: You've used all ${searchLimit} free searches from your signup trial. To continue searching for podcasts, you must upgrade to a paid subscription plan. Free searches are a one-time signup benefit only.`);
        } else {
          throw new Error(`❌ MONTHLY QUOTA EXCEEDED: You've used all ${currentSearchCount}/${searchLimit} searches for your ${user.plan} plan. Your quota will reset next month.`);
        }
      }
    }

    return {
      canProceed: true,
      currentSummaryCount,
      currentSearchCount,
      summaryLimit,
      searchLimit,
      plan: user.plan || "free",
    };
  },
});

// Check if free user has exhausted their one-time trial and must upgrade
export const checkFreeTrialStatus = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { error: "Not authenticated" };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      return { error: "User not found" };
    }

    if (user.plan !== "free") {
      return { 
        isFreeUser: false,
        trialExhausted: false,
        message: "User is on paid plan"
      };
    }

    const currentSummaryCount = user.summary_count || 0;
    const currentSearchCount = user.search_count || 0;
    const summaryLimit = 5;
    const searchLimit = 10;

    const summariesExhausted = currentSummaryCount >= summaryLimit;
    const searchesExhausted = currentSearchCount >= searchLimit;
    const trialExhausted = summariesExhausted && searchesExhausted;

    return {
      isFreeUser: true,
      trialExhausted,
      summaries: {
        used: currentSummaryCount,
        limit: summaryLimit,
        exhausted: summariesExhausted,
        remaining: Math.max(0, summaryLimit - currentSummaryCount)
      },
      searches: {
        used: currentSearchCount,
        limit: searchLimit,
        exhausted: searchesExhausted,
        remaining: Math.max(0, searchLimit - currentSearchCount)
      },
      canContinue: !trialExhausted,
      mustUpgrade: trialExhausted,
      message: trialExhausted 
        ? "Free trial exhausted - must upgrade to continue using the service"
        : `Free trial: ${summaryLimit - currentSummaryCount} summaries, ${searchLimit - currentSearchCount} searches remaining`
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
    const newCount = currentCount + 1;
    
    console.log(`🔄 INCREMENT SUMMARY COUNT: User ${identity.subject} | Plan: ${user.plan} | Old count: ${currentCount} | New count: ${newCount}`);
    
    await ctx.db.patch(user._id, {
      summary_count: newCount,
    });

    return newCount;
  },
});

// Increment user's search count
export const incrementSearchCount = internalMutation({
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

    const currentCount = user.search_count || 0;
    await ctx.db.patch(user._id, {
      search_count: currentCount + 1,
    });

    return currentCount + 1;
  },
});

// Add time saved when a summary is generated (assumes average podcast is 45 minutes, summary takes 2 minutes to read)
export const addTimeSaved = internalMutation({
  args: { episodeDurationMinutes: v.optional(v.number()) },
  handler: async (ctx, args) => {
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

    // Calculate time saved: episode duration minus summary reading time (2 minutes)
    // Default to 45 minutes for average podcast episode if duration not provided
    const episodeDuration = args.episodeDurationMinutes || 45;
    const summaryReadingTime = 2;
    const timeSaved = Math.max(episodeDuration - summaryReadingTime, 0);

    const currentTimeSaved = user.time_saved_minutes || 0;
    const newTimeSaved = currentTimeSaved + timeSaved;

    await ctx.db.patch(user._id, {
      time_saved_minutes: newTimeSaved,
    });

    return {
      timeSavedThisSession: timeSaved,
      totalTimeSaved: newTimeSaved
    };
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

    let planToUpdate = null;
    let source = null;

    // Determine plan from active subscription only
    if (subscription && subscription.status === "active") {
      planToUpdate = subscription.plan || "monthly";
      source = "subscription";
    }

    if (planToUpdate) {
      let quotaResetDate = user.quota_reset_date;
      
      // Set quota reset date for monthly subscribers
      if (planToUpdate === "monthly" || planToUpdate === "basic" || planToUpdate === "pro" || planToUpdate === "premium") {
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
        quotaResetDate = nextMonth.getTime();
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
        message: "No active subscription found",
        details: {
          subscriptionStatus: subscription?.status || "none"
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

    let planToUpdate = null;
    let source = null;

    // Determine plan from active subscription only
    if (subscription && subscription.status === "active") {
      planToUpdate = subscription.plan || "monthly";
      source = "subscription";
    }

    if (planToUpdate) {
      let quotaResetDate = user.quota_reset_date;
      
      // Set quota reset date for monthly subscribers
      if (planToUpdate === "monthly" || planToUpdate === "basic" || planToUpdate === "pro" || planToUpdate === "premium") {
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
        quotaResetDate = nextMonth.getTime();
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
        message: "No active subscription found",
        details: {
          subscriptionStatus: subscription?.status || "none"
        }
      };
    }
  },
});

// Function removed - lifetime plans no longer supported

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
    
    // Set quota reset date ONLY for paid plans - FREE USERS NEVER GET RESETS
    if (args.plan === "monthly" || args.plan === "basic" || args.plan === "pro" || args.plan === "premium") {
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      quotaResetDate = nextMonth.getTime();
    } else {
      // Clear reset date for free plans - FREE USERS NEVER GET QUOTA RESETS
      quotaResetDate = undefined;
    }

    await ctx.db.patch(user._id, {
      plan: args.plan,
      quota_reset_date: quotaResetDate,
      // Reset counts when upgrading plans
      summary_count: 0,
      search_count: 0,
    });

    return await ctx.db.get(user._id);
  },
});

// Update user plan and optionally reset quota (called on successful payments)
export const updateUserPlanAndResetQuota = mutation({
  args: { 
    tokenIdentifier: v.string(),
    plan: v.string(),
    resetQuota: v.boolean(),
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
    
    // Set quota reset date ONLY for paid plans - FREE USERS NEVER GET RESETS
    if (args.plan === "monthly" || args.plan === "basic" || args.plan === "pro" || args.plan === "premium") {
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      quotaResetDate = nextMonth.getTime();
    } else {
      // Clear reset date for free plans - FREE USERS NEVER GET QUOTA RESETS
      quotaResetDate = undefined;
    }

    const updateFields: any = {
      plan: args.plan,
      quota_reset_date: quotaResetDate,
    };

    // Reset quota only if explicitly requested (on successful payments)
    if (args.resetQuota) {
      updateFields.summary_count = 0;
      updateFields.search_count = 0;
      console.log(`🔄 QUOTA RESET: ${args.tokenIdentifier} - successful payment for ${args.plan} plan`);
    }

    await ctx.db.patch(user._id, updateFields);

    return await ctx.db.get(user._id);
  },
});

// Manual quota reset for renewal payments (called by webhooks)
export const resetQuotaOnPayment = mutation({
  args: { 
    tokenIdentifier: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Only reset quota for paid plans
    if (user.plan === "free") {
      console.log(`⏭️ QUOTA RESET SKIPPED: ${args.tokenIdentifier} - free plan`);
      return user;
    }

    // Verify user has active subscription before resetting
    const subscriptionStatus = await ctx.runQuery(api.users.verifyActiveSubscription, { userId: user.tokenIdentifier });
    
    if (!subscriptionStatus.hasActiveSubscription) {
      console.log(`❌ QUOTA RESET DENIED: ${args.tokenIdentifier} - inactive subscription: ${subscriptionStatus.reason}`);
      throw new Error(`Cannot reset quota: ${subscriptionStatus.reason}`);
    }

    // Set next reset date
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

    await ctx.db.patch(user._id, {
      summary_count: 0,
      search_count: 0,
      quota_reset_date: nextMonth.getTime(),
    });

    console.log(`✅ QUOTA RESET: ${args.tokenIdentifier} (${user.plan}) - ${args.reason}`);

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
      basic: 20,
      pro: 40,
      premium: 60,
      monthly: 50,
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
      basic: 20,
      pro: 40,
      premium: 60,
      monthly: 50,
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

// Daily cron job function: Reset quotas ONLY for users with active subscriptions
export const resetExpiredQuotas = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    console.log(`🕐 Daily quota reset check starting at ${new Date(now).toISOString()}`);
    
    // Find all users with expired quota reset dates (ONLY paid plans - FREE USERS EXCLUDED)
    const expiredUsers = await ctx.db
      .query("users")
      .filter((q) => 
        q.and(
          // User has a reset date
          q.neq(q.field("quota_reset_date"), undefined),
          // Reset date has passed
          q.lt(q.field("quota_reset_date"), now),
          // User is on a paid plan (FREE USERS NEVER GET QUOTA RESETS)
          q.or(
            q.eq(q.field("plan"), "monthly"),
            q.eq(q.field("plan"), "basic"),
            q.eq(q.field("plan"), "pro"),
            q.eq(q.field("plan"), "premium")
          ),
          // EXPLICIT EXCLUSION: No free plan users
          q.neq(q.field("plan"), "free")
        )
      )
      .collect();

    console.log(`📊 Found ${expiredUsers.length} users with expired quotas`);

    let resetCount = 0;
    let deniedCount = 0;
    let errorCount = 0;

    // Reset quota for each expired user - BUT ONLY if subscription is active
    for (const user of expiredUsers) {
      try {
        // CRITICAL: Verify subscription is active before resetting quota
        const subscriptionStatus = await ctx.runQuery(api.users.verifyActiveSubscription, { userId: user.tokenIdentifier });
        
        if (!subscriptionStatus.hasActiveSubscription) {
          console.log(`❌ QUOTA RESET DENIED: ${user.tokenIdentifier} (${user.plan}) - ${subscriptionStatus.reason} | QUOTA FROZEN UNTIL PAYMENT`);
          deniedCount++;
          continue; // Skip this user - no active subscription
        }

        const oldSummaryCount = user.summary_count || 0;
        const oldSearchCount = user.search_count || 0;
        
        // Calculate next reset date (same day next month)
        const currentResetDate = new Date(user.quota_reset_date!);
        const nextResetDate = new Date(currentResetDate);
        nextResetDate.setMonth(nextResetDate.getMonth() + 1);

        // Handle edge case: if next month doesn't have the same day (e.g., Jan 31 → Feb 28)
        if (nextResetDate.getMonth() !== (currentResetDate.getMonth() + 1) % 12) {
          // Set to last day of the target month
          nextResetDate.setDate(0);
        }

        // Reset the user's quotas ONLY after confirming active subscription
        await ctx.db.patch(user._id, {
          summary_count: 0,
          search_count: 0,
          quota_reset_date: nextResetDate.getTime(),
        });

        console.log(
          `✅ QUOTA RESET: ${user.tokenIdentifier} (${user.plan}) ` +
          `summaries: ${oldSummaryCount} → 0, searches: ${oldSearchCount} → 0, next reset: ${nextResetDate.toISOString().split('T')[0]} - verified active subscription`
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
      deniedResets: deniedCount,
      errors: errorCount,
      message: `Reset ${resetCount} quotas, denied ${deniedCount} (inactive subscription), ${errorCount} errors`
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
            q.eq(q.field("plan"), "basic"),
            q.eq(q.field("plan"), "pro")
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
            q.eq(q.field("plan"), "basic"),
            q.eq(q.field("plan"), "pro")
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

// Check if user can access chat feature
export const canUserAccessChat = query({
  handler: async (ctx): Promise<{
    canAccess: boolean;
    reason: string;
    plan: string;
    used: number;
    limit: number;
    remaining: number;
    isPaidUser: boolean;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { 
        canAccess: false, 
        reason: "Not authenticated",
        plan: "free",
        used: 0,
        limit: 5,
        remaining: 5,
        isPaidUser: false
      };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      return { 
        canAccess: false, 
        reason: "User not found",
        plan: "free",
        used: 0,
        limit: 5,
        remaining: 5,
        isPaidUser: false
      };
    }

    // Check if user has quota available or is on paid plan
    const now = Date.now();
    let currentCount = user.summary_count || 0;
    let quotaResetDate = user.quota_reset_date;

    // Check if user needs quota reset (for all paid plan subscribers)
    if ((user.plan === "monthly" || user.plan === "basic" || user.plan === "pro") && quotaResetDate && now >= quotaResetDate) {
      // User needs quota reset, but we can't mutate in a query
      // Show reset count in calculation
      currentCount = 0;
    }

    // Determine quota limits based on plan
    const quotaLimits = {
      free: 5,        // 5 summaries for free users
      basic: 20,      // 20 summaries per month (Basic Plan - $12.99)
      pro: 40,        // 40 summaries per month (Pro Plan - $20.99)
      premium: 60,    // 60 summaries per month (Premium Plan - $50.00)
      monthly: 50,    // 50 summaries per month (legacy monthly plan)
    };

    // STRICT SUBSCRIPTION CHECK for chat access
    if (user.plan !== "free") {
      const subscriptionStatus: {
        hasActiveSubscription: boolean;
        reason: string;
        plan?: string;
      } = await ctx.runQuery(api.users.verifyActiveSubscription, { userId: user.tokenIdentifier });
      
      if (!subscriptionStatus.hasActiveSubscription) {
        return {
          canAccess: false,
          reason: `Subscription required: ${subscriptionStatus.reason}. Chat is only available to users with active subscriptions or free users with remaining quota.`,
          plan: "free", // Force to free plan behavior
          used: 0,
          limit: 5,
          remaining: 5,
          isPaidUser: false,
        };
      }
    }

    const limit = quotaLimits[user.plan as keyof typeof quotaLimits] || quotaLimits.free;
    const hasRemainingQuota = currentCount < limit;

    // Chat access rules:
    // 1. Paid users (monthly/basic/pro/premium) can always access chat
    // 2. Free users can access chat only if they have remaining summaries
    const isPaidUser = user.plan === "monthly" || user.plan === "basic" || user.plan === "pro" || user.plan === "premium";
    const canAccess = isPaidUser || (user.plan === "free" && hasRemainingQuota);

    let reason = "";
    if (!canAccess) {
      reason = `Chat is available to paid subscribers or free users with remaining summaries. You've used ${currentCount}/${limit} summaries. Upgrade to continue chatting.`;
    }

    return {
      canAccess,
      reason,
      plan: user.plan || "free",
      used: currentCount,
      limit,
      remaining: Math.max(0, limit - currentCount),
      isPaidUser,
    };
  },
});

export const getUserEmailPreference = query({
  handler: async (ctx): Promise<{ email_notifications: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { email_notifications: true }; // Default to enabled
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      return { email_notifications: true }; // Default to enabled
    }

    const preferences = await ctx.db
      .query("user_preferences")
      .withIndex("by_user", (q) => q.eq("user_id", user.tokenIdentifier))
      .unique();

    return {
      email_notifications: preferences?.email_notifications ?? true // Default to enabled
    };
  },
});

export const updateEmailNotifications = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, { enabled }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    // Check if user preferences exist
    const existingPrefs = await ctx.db
      .query("user_preferences")
      .withIndex("by_user", (q) => q.eq("user_id", user.tokenIdentifier))
      .unique();

    const now = Date.now();

    if (existingPrefs) {
      // Update existing preferences
      await ctx.db.patch(existingPrefs._id, {
        email_notifications: enabled,
        updated_at: now,
      });
    } else {
      // Create new preferences record
      await ctx.db.insert("user_preferences", {
        user_id: user.tokenIdentifier,
        email_notifications: enabled,
        created_at: now,
        updated_at: now,
      });
    }

    return { success: true, enabled };
  },
});

// System status check - comprehensive quota and subscription debugging
export const getSystemStatus = query({
  handler: async (ctx): Promise<any> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { error: "Not authenticated" };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      return { error: "User not found" };
    }

    // Get subscription verification
    let subscriptionStatus = null;
    if (user.plan !== "free") {
      subscriptionStatus = await ctx.runQuery(api.users.verifyActiveSubscription, { userId: user.tokenIdentifier });
    }

    // Get current quota status
    const userQuota: any = await ctx.runQuery(api.users.getUserQuota, {});

    // Get all user summaries to count them manually
    const summaries = await ctx.db
      .query("summaries")
      .withIndex("by_user", (q) => q.eq("user_id", user.tokenIdentifier))
      .collect();

    return {
      user: {
        id: user._id,
        tokenIdentifier: user.tokenIdentifier,
        email: user.email,
        plan: user.plan,
        summary_count: user.summary_count || 0,
        search_count: user.search_count || 0,
        quota_reset_date: user.quota_reset_date,
      },
      subscription: subscriptionStatus,
      currentQuota: userQuota,
      actualSummaryCount: summaries.length,
      summaryMismatch: (user.summary_count || 0) !== summaries.length,
      debugInfo: {
        userFound: !!user,
        planType: user.plan,
        hasSubscriptionCheck: user.plan !== "free",
        subscriptionActive: subscriptionStatus?.hasActiveSubscription,
        quotaLogicPath: user.plan !== "free" && !subscriptionStatus?.hasActiveSubscription ? "subscription-failed" : "normal-flow"
      },
      systemRules: {
        freeTrialLimits: "5 summaries, 10 searches (ONE-TIME signup benefit only)",
        freeTrialPolicy: "After free trial exhausted, user MUST upgrade to continue using service",
        noFreeRenewals: "Free users NEVER get quota resets - must pay to continue",
        paidUserRequirement: "Active subscription required for all paid features",
        quotaResetPolicy: "Only paid users with active subscriptions get monthly resets",
        strictEnforcement: "No service access without payment after free trial used"
      },
      timestamp: new Date().toISOString()
    };
  },
});
