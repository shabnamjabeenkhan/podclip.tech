import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Create a new chat session for an episode
export const createChatSession = mutation({
  args: {
    userId: v.string(),
    episodeId: v.string(),
    summaryId: v.optional(v.string()),
    episodeTitle: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const title = `Chat about: ${args.episodeTitle.substring(0, 50)}${args.episodeTitle.length > 50 ? '...' : ''}`;
    
    const sessionId = await ctx.db.insert("chat_sessions", {
      user_id: args.userId,
      episode_id: args.episodeId,
      summary_id: args.summaryId,
      title,
      created_at: now,
      updated_at: now,
    });

    return sessionId;
  },
});

// Get or create a chat session for an episode
export const getOrCreateChatSession = mutation({
  args: {
    userId: v.string(),
    episodeId: v.string(),
    summaryId: v.optional(v.string()),
    episodeTitle: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if a session already exists for this user and episode
    const existingSession = await ctx.db
      .query("chat_sessions")
      .withIndex("by_user_episode", (q) =>
        q.eq("user_id", args.userId).eq("episode_id", args.episodeId)
      )
      .first();

    if (existingSession) {
      return existingSession._id;
    }

    // Create new session
    const now = Date.now();
    const title = `Chat about: ${args.episodeTitle.substring(0, 50)}${args.episodeTitle.length > 50 ? '...' : ''}`;
    
    const sessionId = await ctx.db.insert("chat_sessions", {
      user_id: args.userId,
      episode_id: args.episodeId,
      summary_id: args.summaryId,
      title,
      created_at: now,
      updated_at: now,
    });

    return sessionId;
  },
});

// Add a message to a chat session
export const addMessage = mutation({
  args: {
    sessionId: v.string(),
    userId: v.string(),
    role: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Add the message
    const messageId = await ctx.db.insert("chat_messages", {
      session_id: args.sessionId,
      user_id: args.userId,
      role: args.role,
      content: args.content,
      created_at: now,
    });

    // Update session's updated_at timestamp
    await ctx.db.patch(args.sessionId as Id<"chat_sessions">, {
      updated_at: now,
    });

    return messageId;
  },
});

// Get chat messages for a session
export const getChatMessages = query({
  args: {
    sessionId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify the session belongs to the user
    const session = await ctx.db.get(args.sessionId as Id<"chat_sessions">);
    if (!session || session.user_id !== args.userId) {
      throw new Error("Unauthorized access to chat session");
    }

    return await ctx.db
      .query("chat_messages")
      .withIndex("by_session_created", (q) => q.eq("session_id", args.sessionId))
      .collect();
  },
});

// Get user's chat sessions
export const getUserChatSessions = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chat_sessions")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .order("desc")
      .collect();
  },
});

// Get chat session details with summary context
export const getChatSession = query({
  args: {
    sessionId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<"chat_sessions">);
    if (!session || session.user_id !== args.userId) {
      return null;
    }

    // Get the associated summary if it exists
    let summary = null;
    if (session.summary_id) {
      summary = await ctx.db.get(session.summary_id as Id<"summaries">);
    }

    return {
      ...session,
      summary,
    };
  },
});

// Delete a chat session (and all its messages)
export const deleteChatSession = mutation({
  args: {
    sessionId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify ownership
    const session = await ctx.db.get(args.sessionId as Id<"chat_sessions">);
    if (!session || session.user_id !== args.userId) {
      throw new Error("Unauthorized access to chat session");
    }

    // Delete all messages in the session
    const messages = await ctx.db
      .query("chat_messages")
      .withIndex("by_session", (q) => q.eq("session_id", args.sessionId))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Delete the session
    await ctx.db.delete(args.sessionId as Id<"chat_sessions">);
  },
});