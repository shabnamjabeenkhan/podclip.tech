import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table: Clerk user ID, plan, summary count, Notion token (optional)
  users: defineTable({
    tokenIdentifier: v.string(), // Clerk user ID
    plan: v.optional(v.string()), // "free" | "monthly" | "lifetime"
    summary_count: v.optional(v.number()), // Number of summaries generated
    quota_reset_date: v.optional(v.number()), // For monthly subscribers, timestamp of next reset
    notion_token: v.optional(v.string()), // Notion API token (optional)
    notion_workspace_id: v.optional(v.string()), // Notion workspace ID
    notion_workspace_name: v.optional(v.string()), // Notion workspace name
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
  }).index("by_token", ["tokenIdentifier"]),

  // Subscriptions table: Polar.sh subscription data (recurring payments)
  subscriptions: defineTable({
    userId: v.string(), // Clerk user ID
    polarId: v.string(), // Polar.sh subscription ID
    status: v.string(), // "active" | "cancelled" | "revoked"
    plan: v.optional(v.string()), // "monthly" | "lifetime"
    polarPriceId: v.optional(v.string()),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    interval: v.optional(v.string()),
    metadata: v.optional(v.any()),
    customFieldData: v.optional(v.any()),
    customerId: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    canceledAt: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    endedAt: v.optional(v.number()),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    customerCancellationReason: v.optional(v.string()),
    customerCancellationComment: v.optional(v.string()),
    created_at: v.optional(v.number()),
    updated_at: v.optional(v.number()),
  })
    .index("userId", ["userId"])
    .index("polarId", ["polarId"]),

  // One-time payments table: For lifetime access purchases
  payments: defineTable({
    userId: v.string(), // Clerk user ID
    polarOrderId: v.string(), // Polar.sh order ID
    polarProductId: v.string(), // Polar.sh product ID
    polarPriceId: v.string(), // Polar.sh price ID
    status: v.string(), // "pending" | "confirmed" | "refunded" | "disputed"
    plan: v.string(), // Always "lifetime" for one-time payments
    amount: v.number(), // Payment amount in cents
    currency: v.string(), // Currency code (e.g., "USD")
    customerId: v.string(), // Polar.sh customer ID
    metadata: v.optional(v.any()), // Additional metadata from Polar
    customFieldData: v.optional(v.any()), // Custom field data
    confirmedAt: v.optional(v.number()), // When payment was confirmed
    refundedAt: v.optional(v.number()), // When payment was refunded (if applicable)
    created_at: v.number(), // Timestamp
    updated_at: v.number(), // Last update timestamp
  })
    .index("userId", ["userId"])
    .index("polarOrderId", ["polarOrderId"])
    .index("status", ["status"]),

  // Webhook events table
  webhookEvents: defineTable({
    id: v.optional(v.string()),
    type: v.string(),
    data: v.any(),
    processed: v.optional(v.boolean()),
    polarEventId: v.optional(v.string()),
    createdAt: v.optional(v.any()),
    modifiedAt: v.optional(v.any()),
    created_at: v.optional(v.number()),
    // Deduplication fields
    webhookId: v.optional(v.string()), // Unique webhook ID from Polar
    processingStatus: v.optional(v.string()), // "processing" | "completed" | "failed"
    processedAt: v.optional(v.number()), // When processing completed
    errorMessage: v.optional(v.string()), // Error details if failed
  }).index("by_webhook_id", ["webhookId"])
    .index("by_type_status", ["type", "processingStatus"]),

  // Podcasts table: Listen Notes podcast metadata
  podcasts: defineTable({
    podcast_id: v.string(), // Listen Notes podcast ID
    title: v.string(),
    description: v.string(),
    thumbnail: v.string(),
    // tags: v.optional(v.array(v.string())), // For future use
  }).index("by_podcast_id", ["podcast_id"]),

  // Episodes table: Listen Notes episode metadata
  episodes: defineTable({
    episode_id: v.string(), // Listen Notes episode ID
    podcast_id: v.string(), // Reference to podcasts.podcast_id
    title: v.string(),
    description: v.string(),
    audio_url: v.string(),
    // tags: v.optional(v.array(v.string())), // For future use
  })
    .index("by_episode_id", ["episode_id"])
    .index("by_podcast_id", ["podcast_id"]),

  // Episode transcriptions: Cached transcripts from Listen Notes API
  transcriptions: defineTable({
    episode_id: v.string(), // Listen Notes episode ID
    transcript: v.optional(v.string()), // Full transcript text (null if not available)
    has_transcript: v.boolean(), // Whether transcript is available
    created_at: v.number(), // When transcript was fetched
    updated_at: v.number(), // Last time transcript was checked
    source: v.optional(v.string()), // Source of transcript (e.g., "listen_notes")
  })
    .index("by_episode_id", ["episode_id"]),

  // Summaries table: AI-generated summaries and takeaways
  summaries: defineTable({
    episode_id: v.string(), // Reference to episodes.episode_id
    user_id: v.string(), // Reference to users.tokenIdentifier
    content: v.string(), // Summary text
    takeaways: v.array(v.string()), // Array of key takeaways
    created_at: v.number(), // Timestamp
    episode_title: v.optional(v.string()), // Cache episode title for display
    podcast_title: v.optional(v.string()), // Cache podcast title for display
    tags: v.optional(v.array(v.string())), // User-defined tags
    is_favorite: v.optional(v.boolean()), // User favorite flag
  })
    .index("by_episode_user", ["episode_id", "user_id"])
    .index("by_user", ["user_id"])
    .index("by_user_created", ["user_id", "created_at"]),

  // Listening history table: Track what users have played
  listening_history: defineTable({
    user_id: v.string(), // Reference to users.tokenIdentifier
    episode_id: v.string(), // Reference to episodes.episode_id
    podcast_id: v.string(), // Reference to podcasts.podcast_id
    episode_title: v.string(), // Cache for display
    podcast_title: v.string(), // Cache for display
    episode_thumbnail: v.optional(v.string()), // Cache thumbnail
    audio_url: v.string(), // Audio URL
    duration: v.number(), // Total episode duration in seconds
    listened_duration: v.number(), // How much user listened in seconds
    last_position: v.number(), // Last playback position in seconds
    completed: v.boolean(), // Whether user finished the episode
    started_at: v.number(), // When user started listening
    last_played_at: v.number(), // Last time user played this episode
  })
    .index("by_user", ["user_id"])
    .index("by_user_last_played", ["user_id", "last_played_at"])
    .index("by_episode_user", ["episode_id", "user_id"]),

  // User preferences table: Dashboard settings and preferences
  user_preferences: defineTable({
    user_id: v.string(), // Reference to users.tokenIdentifier
    dashboard_layout: v.optional(v.string()), // "grid" | "list"
    default_playback_speed: v.optional(v.number()), // 0.5 to 3.0
    auto_play_next: v.optional(v.boolean()), // Auto play next episode
    favorite_podcasts: v.optional(v.array(v.string())), // Array of podcast IDs
    preferred_summary_length: v.optional(v.string()), // "short" | "medium" | "long"
    email_notifications: v.optional(v.boolean()), // Email notification preference
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_user", ["user_id"]),

  // Chat sessions: AI conversations about specific episodes
  chat_sessions: defineTable({
    user_id: v.string(), // Reference to users.tokenIdentifier
    episode_id: v.string(), // Reference to episodes.episode_id
    summary_id: v.optional(v.string()), // Reference to summaries table
    title: v.string(), // Chat session title (auto-generated)
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_user", ["user_id"])
    .index("by_user_episode", ["user_id", "episode_id"])
    .index("by_episode", ["episode_id"]),

  // Chat messages: Individual messages in chat sessions
  chat_messages: defineTable({
    session_id: v.string(), // Reference to chat_sessions
    user_id: v.string(), // Reference to users.tokenIdentifier
    role: v.string(), // "user" | "assistant" | "system"
    content: v.string(), // Message content
    created_at: v.number(),
  })
    .index("by_session", ["session_id"])
    .index("by_session_created", ["session_id", "created_at"])
    .index("by_user", ["user_id"]),

  // (Optional) Notion tokens table for future extensibility
  // notion_tokens: defineTable({
  //   user_id: v.string(),
  //   access_token: v.string(),
  //   created_at: v.number(),
  // }),

  // ---
  // Document-level access control and relationships:
  // - Only allow users to access their own summaries (filter by user_id)
  // - Summaries reference both episode_id and user_id for efficient lookup
  // - podcasts/episodes are public, but can be filtered by podcast_id/episode_id
  // - Chat sessions and messages are user-specific and filtered by user_id
});
