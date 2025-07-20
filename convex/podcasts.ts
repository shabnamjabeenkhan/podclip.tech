import { v } from "convex/values";
import { action } from "./_generated/server";

export const searchPodcasts = action({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const response = await fetch(
      `https://listen-api.listennotes.com/api/v2/search?q=${args.query}&type=podcast`,
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

export const getPodcastEpisodes = action({
  args: { podcastId: v.string() },
  handler: async (ctx, args) => {
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