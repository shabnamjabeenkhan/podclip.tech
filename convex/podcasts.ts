import { v } from "convex/values";
import { action } from "./_generated/server";

export const searchPodcasts = action({
  args: { query: v.string() },
  handler: async (_, args) => {
    // Note: Free Listen Notes API plan is limited to 10 results per request
    const response = await fetch(
      `https://listen-api.listennotes.com/api/v2/search?q=${encodeURIComponent(args.query)}&type=podcast&safe_mode=0`,
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
    console.log(`Search results: ${data.results?.length || 0} podcasts returned (Free plan limit: 10)`);
    
    return data;
  },
});

export const getPodcastEpisodes = action({
  args: { podcastId: v.string() },
  handler: async (_, args) => {
    const response = await fetch(
      `https://listen-api.listennotes.com/api/v2/podcasts/${args.podcastId}`,
      {
        headers: {
          "X-ListenAPI-Key": process.env.LISTEN_NOTES_API_KEY!,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    return await response.json();
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