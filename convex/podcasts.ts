import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

export const searchPodcasts = action({
  args: {
    query: v.string(),
    offset: v.optional(v.number()),
    limit: v.optional(v.number()),
    isPagination: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    console.log('🔍 searchPodcasts called with:', {
      query: args.query,
      offset: args.offset,
      isPagination: args.isPagination,
      willCheckQuota: !args.isPagination
    });

    // Only count quota for new searches, not pagination
    if (!args.isPagination) {
      console.log('💰 Running quota check for new search');
      await ctx.runMutation(internal.users.checkUserAccessAndQuota, {
        featureType: "search"
      });
    } else {
      console.log('📄 Skipping quota check for pagination');
    }
    const offset = args.offset || 0;
    const limit = Math.min(args.limit || 10, 10); // Cap at 10 results per page (API maximum)
    
    const url = `https://listen-api.listennotes.com/api/v2/search?q=${encodeURIComponent(args.query)}&type=podcast&safe_mode=0&offset=${offset}&page_size=${limit}&len_min=0`;
    
    console.log("=== API PARAMETERS DEBUG ===");
    console.log("Query:", args.query);
    console.log("Offset:", offset);
    console.log("Limit/page_size:", limit);
    console.log("Full URL:", url);
    console.log("===========================");
    
    const apiKey = process.env.LISTEN_NOTES_API_KEY ?? process.env.LISTEN_API_KEY;
    if (!apiKey) {
      throw new Error("Listen Notes API key missing. Set LISTEN_NOTES_API_KEY or LISTEN_API_KEY.");
    }

    const response = await fetch(url, {
      headers: {
        "X-ListenAPI-Key": apiKey,
      },
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Search results: ${data.results?.length || 0} podcasts returned, offset: ${offset}, total: ${data.total || 0}`);
    console.log(`Has next_offset: ${data.next_offset !== undefined ? data.next_offset : 'undefined'}`);

    // Additional logging for debugging pagination issues
    if (offset > 0 && (!data.results || data.results.length === 0)) {
      console.warn(`⚠️ No results returned for offset ${offset} but total is ${data.total}. This may indicate API pagination issues.`);
    }

    // Only increment search count for new searches, not pagination
    if (!args.isPagination) {
      console.log('💰 Incrementing search count for new search');
      await ctx.runMutation(internal.users.incrementSearchCount);
    } else {
      console.log('📄 Skipping search count increment for pagination');
    }

    return {
        ...data,
        pagination: {
          offset,
          limit,
          total: data.total || 0,
          hasNext:
            typeof data.next_offset === "number" &&
            data.next_offset >= 0 &&
            (data.results?.length || 0) > 0 &&
            (offset + (data.results?.length || 0)) < (data.total || 0),
          hasPrev: offset > 0,
          nextOffset: data.next_offset,
          currentPage: Math.floor(offset / limit) + 1,
          totalPages: Math.ceil((data.total || 0) / limit)
        }
      };
  },
});

export const getPodcastEpisodes = action({
  args: { 
    podcastId: v.string(),
    nextEpisodePubDate: v.optional(v.number())
  },
  handler: async (_, args) => {
    let url = `https://listen-api.listennotes.com/api/v2/podcasts/${args.podcastId}?sort=recent_first`;
    
    // Add pagination parameter if provided
    if (args.nextEpisodePubDate) {
      url += `&next_episode_pub_date=${args.nextEpisodePubDate}`;
    }
    
    const apiKey = process.env.LISTEN_NOTES_API_KEY ?? process.env.LISTEN_API_KEY;
    if (!apiKey) {
      throw new Error("Listen Notes API key missing. Set LISTEN_NOTES_API_KEY or LISTEN_API_KEY.");
    }
    const response = await fetch(url, {
      headers: {
        "X-ListenAPI-Key": apiKey,
      },
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Podcast episodes: ${data.episodes?.length || 0} episodes returned for podcast ${args.podcastId}${args.nextEpisodePubDate ? `, next_episode_pub_date: ${args.nextEpisodePubDate}` : ''}`);
    
    return {
      ...data,
      pagination: {
        hasNext: data.next_episode_pub_date !== null,
        hasPrev: args.nextEpisodePubDate !== undefined,
        nextEpisodePubDate: data.next_episode_pub_date,
        currentEpisodePubDate: args.nextEpisodePubDate,
        total: data.total_episodes || 0,
        currentCount: data.episodes?.length || 0
      }
    };
  },
});

export const searchEpisodes = action({
  args: { 
    query: v.string(),
    offset: v.optional(v.number()),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    // STRICT quota and subscription check before searching episodes
    await ctx.runMutation(internal.users.checkUserAccessAndQuota, { 
      featureType: "search" 
    });
    
    const offset = args.offset || 0;
    const limit = Math.min(args.limit || 10, 10); // Cap at 10 results per page (API maximum)
    
    const apiKey = process.env.LISTEN_NOTES_API_KEY ?? process.env.LISTEN_API_KEY;
    if (!apiKey) {
      throw new Error("Listen Notes API key missing. Set LISTEN_NOTES_API_KEY or LISTEN_API_KEY.");
    }
    const response = await fetch(
      `https://listen-api.listennotes.com/api/v2/search?q=${encodeURIComponent(args.query)}&type=episode&safe_mode=0&offset=${offset}&page_size=${limit}`,
      {
        headers: {
          "X-ListenAPI-Key": apiKey,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Episode search results: ${data.results?.length || 0} episodes returned, offset: ${offset}, total: ${data.total || 0}`);
    
    // Increment search count after successful episode search
    await ctx.runMutation(internal.users.incrementSearchCount);
    
      return {
        ...data,
        pagination: {
          offset,
          limit,
          total: data.total || 0,
          hasNext:
            typeof data.next_offset === "number" && data.next_offset >= 0,
          hasPrev: offset > 0,
          nextOffset: data.next_offset,
          currentPage: Math.floor(offset / limit) + 1,
          totalPages: Math.ceil((data.total || 0) / limit)
        }
      };
  },
});

export const getEpisodeTranscript = action({
  args: { episodeId: v.string() },
  handler: async (_, args) => {
    console.log(`Fetching transcript for episode: ${args.episodeId}`);
    
    const apiKey = process.env.LISTEN_NOTES_API_KEY ?? process.env.LISTEN_API_KEY;
    if (!apiKey) {
      throw new Error("Listen Notes API key missing. Set LISTEN_NOTES_API_KEY or LISTEN_API_KEY.");
    }
    const response = await fetch(
      `https://listen-api.listennotes.com/api/v2/episodes/${args.episodeId}`,
      {
        headers: {
          "X-ListenAPI-Key": apiKey,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Listen Notes provides transcript in the 'transcript' field
    // Some episodes might not have transcripts available
    const transcript = data.transcript || null;
    
    console.log(`Transcript ${transcript ? 'found' : 'not available'} for episode ${args.episodeId}`);
    
    return {
      episodeId: args.episodeId,
      transcript,
      hasTranscript: !!transcript,
      episodeTitle: data.title,
      episodeDescription: data.description,
      episodeAudio: data.audio,
      episodeDuration: data.audio_length_sec,
    };
  },
});