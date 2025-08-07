import { v } from "convex/values";
import { action } from "./_generated/server";

export const searchPodcasts = action({
  args: { 
    query: v.string(),
    offset: v.optional(v.number()),
    limit: v.optional(v.number())
  },
  handler: async (_, args) => {
    const offset = args.offset || 0;
    const limit = Math.min(args.limit || 20, 50); // Cap at 50 results per page
    
    const response = await fetch(
      `https://listen-api.listennotes.com/api/v2/search?q=${encodeURIComponent(args.query)}&type=podcast&safe_mode=0&offset=${offset}&len_max=${limit}`,
      {
        headers: {
          "X-ListenAPI-Key": process.env.LISTEN_NOTES_API_KEY!,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Search results: ${data.results?.length || 0} podcasts returned, offset: ${offset}, total: ${data.total || 0}`);
    
    return {
      ...data,
      pagination: {
        offset,
        limit,
        total: data.total || 0,
        hasNext: data.next_offset !== null && data.next_offset !== undefined,
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
    
    const response = await fetch(url, {
      headers: {
        "X-ListenAPI-Key": process.env.LISTEN_NOTES_API_KEY!,
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
  handler: async (_, args) => {
    const offset = args.offset || 0;
    const limit = Math.min(args.limit || 20, 50); // Cap at 50 results per page
    
    const response = await fetch(
      `https://listen-api.listennotes.com/api/v2/search?q=${encodeURIComponent(args.query)}&type=episode&safe_mode=0&offset=${offset}&len_max=${limit}`,
      {
        headers: {
          "X-ListenAPI-Key": process.env.LISTEN_NOTES_API_KEY!,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Episode search results: ${data.results?.length || 0} episodes returned, offset: ${offset}, total: ${data.total || 0}`);
    
    return {
      ...data,
      pagination: {
        offset,
        limit,
        total: data.total || 0,
        hasNext: data.next_offset !== null && data.next_offset !== undefined,
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
    
    const response = await fetch(
      `https://listen-api.listennotes.com/api/v2/episodes/${args.episodeId}`,
      {
        headers: {
          "X-ListenAPI-Key": process.env.LISTEN_NOTES_API_KEY!,
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