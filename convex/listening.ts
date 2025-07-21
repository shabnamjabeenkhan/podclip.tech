import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Track when user starts playing an episode
export const trackListeningStart = mutation({
  args: {
    episodeId: v.string(),
    podcastId: v.string(),
    episodeTitle: v.string(),
    podcastTitle: v.string(),
    episodeThumbnail: v.optional(v.string()),
    audioUrl: v.string(),
    duration: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();

    // Check if user has listened to this episode before
    const existingHistory = await ctx.db
      .query("listening_history")
      .withIndex("by_episode_user", (q) => 
        q.eq("episode_id", args.episodeId).eq("user_id", identity.subject)
      )
      .unique();

    if (existingHistory) {
      // Update existing record
      await ctx.db.patch(existingHistory._id, {
        last_played_at: now,
        episode_title: args.episodeTitle, // Update in case title changed
        podcast_title: args.podcastTitle,
        episode_thumbnail: args.episodeThumbnail,
      });
      return existingHistory._id;
    } else {
      // Create new listening history record
      return await ctx.db.insert("listening_history", {
        user_id: identity.subject,
        episode_id: args.episodeId,
        podcast_id: args.podcastId,
        episode_title: args.episodeTitle,
        podcast_title: args.podcastTitle,
        episode_thumbnail: args.episodeThumbnail,
        audio_url: args.audioUrl,
        duration: args.duration,
        listened_duration: 0,
        last_position: 0,
        completed: false,
        started_at: now,
        last_played_at: now,
      });
    }
  },
});

// Update listening progress
export const updateListeningProgress = mutation({
  args: {
    episodeId: v.string(),
    currentTime: v.number(),
    listenedDuration: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const historyRecord = await ctx.db
      .query("listening_history")
      .withIndex("by_episode_user", (q) => 
        q.eq("episode_id", args.episodeId).eq("user_id", identity.subject)
      )
      .unique();

    if (historyRecord) {
      const completed = args.currentTime >= (historyRecord.duration * 0.95); // 95% completion

      await ctx.db.patch(historyRecord._id, {
        last_position: args.currentTime,
        listened_duration: Math.max(historyRecord.listened_duration, args.listenedDuration),
        completed,
        last_played_at: Date.now(),
      });
    }
  },
});

// Get user's recently played episodes
export const getRecentlyPlayed = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const limit = args.limit || 10;

    return await ctx.db
      .query("listening_history")
      .withIndex("by_user_last_played", (q) => 
        q.eq("user_id", identity.subject)
      )
      .order("desc")
      .take(limit);
  },
});

// Get listening stats for dashboard
export const getListeningStats = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const allHistory = await ctx.db
      .query("listening_history")
      .withIndex("by_user", (q) => q.eq("user_id", identity.subject))
      .collect();

    const totalListened = allHistory.reduce((sum, record) => sum + record.listened_duration, 0);
    const completedEpisodes = allHistory.filter(record => record.completed).length;
    const uniquePodcasts = new Set(allHistory.map(record => record.podcast_id)).size;

    // Calculate listening time in hours and minutes
    const hours = Math.floor(totalListened / 3600);
    const minutes = Math.floor((totalListened % 3600) / 60);

    return {
      totalEpisodes: allHistory.length,
      completedEpisodes,
      uniquePodcasts,
      totalListenedSeconds: totalListened,
      totalListenedFormatted: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
    };
  },
});

// Get listening history for a specific episode
export const getEpisodeListeningHistory = query({
  args: {
    episodeId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    return await ctx.db
      .query("listening_history")
      .withIndex("by_episode_user", (q) => 
        q.eq("episode_id", args.episodeId).eq("user_id", identity.subject)
      )
      .unique();
  },
});