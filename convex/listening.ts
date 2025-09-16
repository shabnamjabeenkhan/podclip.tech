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
    
    console.log("🎧 trackListeningStart called with:", {
      episodeId: args.episodeId,
      userId: identity.subject,
      episodeTitle: args.episodeTitle
    });

    // Ensure podcast exists
    const existingPodcast = await ctx.db
      .query("podcasts")
      .withIndex("by_podcast_id", (q) => q.eq("podcast_id", args.podcastId))
      .unique();

    if (!existingPodcast) {
      console.log("📻 Creating new podcast:", args.podcastTitle);
      await ctx.db.insert("podcasts", {
        podcast_id: args.podcastId,
        title: args.podcastTitle,
        description: "", // We don't have description from audio player
        thumbnail: args.episodeThumbnail || "",
      });
    }

    // Ensure episode exists
    const existingEpisode = await ctx.db
      .query("episodes")
      .withIndex("by_episode_id", (q) => q.eq("episode_id", args.episodeId))
      .unique();

    if (!existingEpisode) {
      console.log("📺 Creating new episode:", args.episodeTitle);
      await ctx.db.insert("episodes", {
        episode_id: args.episodeId,
        podcast_id: args.podcastId,
        title: args.episodeTitle,
        description: "", // We don't have description from audio player
        audio_url: args.audioUrl,
      });
    }

    // Check if user has listened to this episode before
    const existingHistory = await ctx.db
      .query("listening_history")
      .withIndex("by_episode_user", (q) => 
        q.eq("episode_id", args.episodeId).eq("user_id", identity.subject)
      )
      .unique();

    if (existingHistory) {
      console.log("🔄 Updating existing listening history");
      // Update existing record
      await ctx.db.patch(existingHistory._id, {
        last_played_at: now,
        episode_title: args.episodeTitle, // Update in case title changed
        podcast_title: args.podcastTitle,
        episode_thumbnail: args.episodeThumbnail,
      });
      return existingHistory._id;
    } else {
      console.log("✨ Creating new listening history record");
      // Create new listening history record
      const historyId = await ctx.db.insert("listening_history", {
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
      console.log("✅ Created listening history with ID:", historyId);
      return historyId;
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

    console.log("📊 updateListeningProgress called with:", {
      episodeId: args.episodeId,
      currentTime: args.currentTime,
      listenedDuration: args.listenedDuration
    });

    const historyRecord = await ctx.db
      .query("listening_history")
      .withIndex("by_episode_user", (q) => 
        q.eq("episode_id", args.episodeId).eq("user_id", identity.subject)
      )
      .unique();

    if (historyRecord) {
      const completed = args.currentTime >= (historyRecord.duration * 0.95); // 95% completion
      console.log("🔄 Updating progress - completed:", completed, "position:", args.currentTime);

      await ctx.db.patch(historyRecord._id, {
        last_position: args.currentTime,
        listened_duration: Math.max(historyRecord.listened_duration, args.listenedDuration),
        completed,
        last_played_at: Date.now(),
      });
      console.log("✅ Progress updated successfully");
    } else {
      console.log("❌ No history record found for episode:", args.episodeId);
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
    
    console.log("🎵 getRecentlyPlayed called for user:", identity.subject);

    const results = await ctx.db
      .query("listening_history")
      .withIndex("by_user_last_played", (q) => 
        q.eq("user_id", identity.subject)
      )
      .order("desc")
      .take(limit);
      
    console.log("🎵 Found", results.length, "recently played episodes");
    
    return results;
  },
});

// Get listening stats for dashboard
export const getListeningStats = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      // Return default stats for unauthenticated users
      return {
        totalListeningTime: 0,
        averageListeningTime: 0,
        totalSessions: 0,
        currentWeekTime: 0,
        lastWeekTime: 0,
        weekOverWeekGrowth: 0,
      };
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