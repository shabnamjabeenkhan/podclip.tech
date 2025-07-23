import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

// Get transcript from database (cached) or fetch from API if not available
export const getEpisodeTranscription = action({
  args: { episodeId: v.string() },
  handler: async (ctx, args): Promise<{
    episodeId: string;
    transcript: string | null;
    hasTranscript: boolean;
    updatedAt?: number;
    episodeTitle?: string;
    episodeDescription?: string;
    episodeAudio?: string;
    episodeDuration?: number;
  }> => {
    console.log(`Getting transcription for episode: ${args.episodeId}`);
    
    // First check if we have a cached transcription
    const cached: {
      episodeId: string;
      transcript: string | null;
      hasTranscript: boolean;
      updatedAt: number;
    } | null = await ctx.runQuery(api.transcriptions.getCachedTranscription, {
      episodeId: args.episodeId,
    });
    
    if (cached) {
      console.log(`Using cached transcription for episode ${args.episodeId}`);
      return cached;
    }
    
    console.log(`Fetching new transcription for episode ${args.episodeId}`);
    
    // Fetch from Listen Notes API
    const episodeData: {
      episodeId: string;
      transcript: string | null;
      hasTranscript: boolean;
      episodeTitle: string;
      episodeDescription: string;
      episodeAudio: string;
      episodeDuration: number;
    } = await ctx.runAction(api.podcasts.getEpisodeTranscript, {
      episodeId: args.episodeId,
    });
    
    // Cache the transcription result
    await ctx.runMutation(api.transcriptions.cacheTranscription, {
      episodeId: args.episodeId,
      transcript: episodeData.transcript || undefined,
      hasTranscript: episodeData.hasTranscript,
    });
    
    return episodeData;
  },
});

// Query to get cached transcription
export const getCachedTranscription = query({
  args: { episodeId: v.string() },
  handler: async (ctx, args): Promise<{
    episodeId: string;
    transcript: string | null;
    hasTranscript: boolean;
    updatedAt: number;
  } | null> => {
    const transcription = await ctx.db
      .query("transcriptions")
      .withIndex("by_episode_id", (q) => q.eq("episode_id", args.episodeId))
      .first();
    
    if (!transcription) {
      return null;
    }
    
    return {
      episodeId: transcription.episode_id,
      transcript: transcription.transcript || null,
      hasTranscript: transcription.has_transcript,
      updatedAt: transcription.updated_at,
    };
  },
});

// Mutation to cache transcription
export const cacheTranscription = mutation({
  args: {
    episodeId: v.string(),
    transcript: v.optional(v.string()),
    hasTranscript: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check if transcription already exists
    const existing = await ctx.db
      .query("transcriptions")
      .withIndex("by_episode_id", (q) => q.eq("episode_id", args.episodeId))
      .first();
    
    if (existing) {
      // Update existing transcription
      await ctx.db.patch(existing._id, {
        transcript: args.transcript,
        has_transcript: args.hasTranscript,
        updated_at: now,
      });
      
      console.log(`Updated cached transcription for episode ${args.episodeId}`);
    } else {
      // Create new transcription record
      await ctx.db.insert("transcriptions", {
        episode_id: args.episodeId,
        transcript: args.transcript,
        has_transcript: args.hasTranscript,
        created_at: now,
        updated_at: now,
        source: "listen_notes",
      });
      
      console.log(`Cached new transcription for episode ${args.episodeId}`);
    }
  },
});

// Query to check if transcription exists and is recent (for cache invalidation)
export const shouldRefreshTranscription = query({
  args: { episodeId: v.string() },
  handler: async (ctx, args) => {
    const transcription = await ctx.db
      .query("transcriptions")
      .withIndex("by_episode_id", (q) => q.eq("episode_id", args.episodeId))
      .first();
    
    if (!transcription) {
      return true; // No transcription cached, should fetch
    }
    
    // Check if transcription is older than 7 days (in case new transcripts become available)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const shouldRefresh = transcription.updated_at < sevenDaysAgo;
    
    return shouldRefresh;
  },
});