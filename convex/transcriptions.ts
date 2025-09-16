import { v } from "convex/values";
import { action, mutation, query, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { transcribeAudio, formatTimestamp, type DeepgramWord } from "./deepgram";

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

// Action to transcribe episode using Deepgram
export const transcribeEpisodeWithDeepgram = action({
  args: { 
    episodeId: v.string(),
    audioUrl: v.string(),
    forceRetranscribe: v.optional(v.boolean())
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    transcript?: string;
    hasTimestamps: boolean;
    wordCount?: number;
    confidence?: number;
    duration?: number;
    error?: string;
  }> => {
    console.log(`🎙️ Starting Deepgram transcription for episode: ${args.episodeId}`);
    
    try {
      // Check if we already have a Deepgram transcription (unless forcing retranscribe)
      if (!args.forceRetranscribe) {
        const existing = await ctx.runQuery(api.transcriptions.getCachedTranscriptionWithTimestamps, {
          episodeId: args.episodeId,
        });
        
        if (existing && existing.source === "deepgram" && existing.hasTimestamps) {
          console.log(`✅ Using existing Deepgram transcription for episode ${args.episodeId}`);
          return {
            success: true,
            transcript: existing.transcript || undefined,
            hasTimestamps: true,
            wordCount: existing.wordCount,
            confidence: existing.confidence,
            duration: existing.duration,
          };
        }
      }

      // Validate audio URL
      if (!args.audioUrl || !args.audioUrl.startsWith('http')) {
        throw new Error("Invalid audio URL provided");
      }

      // Transcribe with Deepgram
      const deepgramResult = await transcribeAudio(args.audioUrl);
      
      if (!deepgramResult?.transcript?.transcript) {
        throw new Error("No transcript received from Deepgram");
      }

      // Handle Convex array size limit (8192 items max) before storing
      const MAX_TIMESTAMPS = 8000; // Leave some buffer
      let optimizedWords = deepgramResult.transcript.words;
      
      if (deepgramResult.transcript.words.length > MAX_TIMESTAMPS) {
        console.log(`⚠️ Episode ${args.episodeId} has ${deepgramResult.transcript.words.length} word timestamps, reducing to ${MAX_TIMESTAMPS} for storage`);
        
        // Sample timestamps evenly across the episode to maintain coverage
        const step = Math.floor(deepgramResult.transcript.words.length / MAX_TIMESTAMPS);
        optimizedWords = deepgramResult.transcript.words.filter((_, index) => index % step === 0).slice(0, MAX_TIMESTAMPS);
        
        console.log(`✅ Optimized to ${optimizedWords.length} timestamps (every ${step}th word)`);
      }

      // Store transcription with optimized timestamps
      await ctx.runMutation(internal.transcriptions.storeDeepgramTranscription, {
        episodeId: args.episodeId,
        transcript: deepgramResult.transcript.transcript,
        wordTimestamps: optimizedWords.map(word => ({
          word: word.word,
          start: word.start,
          end: word.end,
          confidence: word.confidence,
        })),
        confidence: deepgramResult.transcript.confidence,
        duration: deepgramResult.metadata.duration,
      });

      console.log(`✅ Deepgram transcription completed for episode ${args.episodeId}: ${deepgramResult.transcript.words.length} original words, ${optimizedWords.length} stored`);

      return {
        success: true,
        transcript: deepgramResult.transcript.transcript,
        hasTimestamps: true,
        wordCount: optimizedWords.length,
        confidence: deepgramResult.transcript.confidence,
        duration: deepgramResult.metadata.duration,
      };

    } catch (error: any) {
      console.error(`❌ Deepgram transcription failed for episode ${args.episodeId}:`, error);
      
      return {
        success: false,
        hasTimestamps: false,
        error: error.message || "Unknown transcription error",
      };
    }
  },
});

// Query to get cached transcription with timestamps
export const getCachedTranscriptionWithTimestamps = query({
  args: { episodeId: v.string() },
  handler: async (ctx, args): Promise<{
    episodeId: string;
    transcript: string | null;
    hasTranscript: boolean;
    hasTimestamps: boolean;
    wordTimestamps?: DeepgramWord[];
    confidence?: number;
    duration?: number;
    wordCount?: number;
    source?: string;
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
      hasTimestamps: !!transcription.word_timestamps && transcription.word_timestamps.length > 0,
      wordTimestamps: transcription.word_timestamps || undefined,
      confidence: transcription.confidence,
      duration: transcription.duration,
      wordCount: transcription.word_timestamps?.length || 0,
      source: transcription.source,
      updatedAt: transcription.updated_at,
    };
  },
});

// Internal mutation to store Deepgram transcription
export const storeDeepgramTranscription = internalMutation({
  args: {
    episodeId: v.string(),
    transcript: v.string(),
    wordTimestamps: v.array(v.object({
      word: v.string(),
      start: v.number(),
      end: v.number(),
      confidence: v.number(),
    })),
    confidence: v.number(),
    duration: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check if transcription already exists
    const existing = await ctx.db
      .query("transcriptions")
      .withIndex("by_episode_id", (q) => q.eq("episode_id", args.episodeId))
      .first();
    
    const transcriptionData = {
      transcript: args.transcript,
      has_transcript: true,
      word_timestamps: args.wordTimestamps,
      confidence: args.confidence,
      duration: args.duration,
      updated_at: now,
      source: "deepgram",
    };
    
    if (existing) {
      // Update existing transcription
      await ctx.db.patch(existing._id, transcriptionData);
      console.log(`✅ Updated Deepgram transcription for episode ${args.episodeId}`);
    } else {
      // Create new transcription record
      await ctx.db.insert("transcriptions", {
        episode_id: args.episodeId,
        created_at: now,
        ...transcriptionData,
      });
      console.log(`✅ Stored new Deepgram transcription for episode ${args.episodeId}`);
    }
  },
});