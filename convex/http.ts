import { httpRouter } from "convex/server";
import { paymentWebhook } from "./subscriptions";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

import { resend } from "./sendEmails";

export const chat = httpAction(async (ctx, req) => {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": req.headers.get("Origin") || process.env.FRONTEND_URL || "http://localhost:5173",
        }
      });
    }
    
    // Extract the `messages` and optional context from the body of the request
    const { messages, episodeId, summaryId, userId } = await req.json();

  let systemMessage = "You are a helpful AI assistant for discussing podcast episodes.";

  // If episode-specific context is provided, enhance the system message
  if (episodeId && summaryId && userId) {
    try {
      // Get the summary for context
      const summaryResult = await ctx.runQuery(api.summaries.getSummaryById, { summaryId });
      
      // Type-check to ensure we have a summary with the expected properties
      if (summaryResult && 'user_id' in summaryResult && 'content' in summaryResult && 'takeaways' in summaryResult && summaryResult.user_id === userId) {
        systemMessage = `You are a helpful AI assistant discussing a specific podcast episode with a user. 

Episode: ${summaryResult.episode_title}
Podcast: ${summaryResult.podcast_title || 'Unknown Podcast'}

Summary: ${summaryResult.content}

Key Takeaways:
${summaryResult.takeaways.map((takeaway: string, i: number) => `${i + 1}. ${takeaway}`).join('\n')}

Please help the user discuss this episode, answer questions about the content, explore the topics in more depth, provide additional insights, or relate the content to other topics. Be conversational, insightful, and helpful. You can reference specific points from the summary and takeaways in your responses.`;
      }
    } catch (error) {
      console.error("Error loading episode context:", error);
      // Continue without context if there's an error
    }
  }

  // Prepare messages with system context
  const contextualMessages = [
    { role: "system", content: systemMessage },
    ...messages
  ];

  const result = streamText({
    model: openai("gpt-3.5-turbo"), // Using gpt-3.5-turbo for cost efficiency
    messages: contextualMessages,
    maxTokens: 800,
    temperature: 0.7,
    async onFinish({ text }) {
      // Store the conversation if we have session context
      if (userId && episodeId) {
        try {
          // Find or create a chat session for this episode
          const sessionId = await ctx.runMutation(api.chat.getOrCreateChatSession, {
            userId,
            episodeId,
            summaryId,
            episodeTitle: messages.find((m: any) => m.role === 'system')?.episodeTitle || 'Episode Chat'
          });

          // Store the user message and AI response
          const userMessage = messages[messages.length - 1];
          if (userMessage && userMessage.role === 'user') {
            await ctx.runMutation(api.chat.addMessage, {
              sessionId: sessionId.toString(),
              userId,
              role: "user",
              content: userMessage.content,
            });

            await ctx.runMutation(api.chat.addMessage, {
              sessionId: sessionId.toString(), 
              userId,
              role: "assistant",
              content: text,
            });
          }
        } catch (error) {
          console.error("Error storing chat messages:", error);
          // Continue even if storage fails
        }
      }
    },
  });

  // Get the origin from the request or use a default
  const origin = req.headers.get("Origin") || process.env.FRONTEND_URL || "http://localhost:5173";
  
  // Respond with the stream
  return result.toDataStreamResponse({
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS", 
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
      Vary: "origin",
    },
  });
  
  } catch (error) {
    console.error("Chat error:", error);
    const origin = req.headers.get("Origin") || process.env.FRONTEND_URL || "http://localhost:5173";
    return new Response(JSON.stringify({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": origin,
      }
    });
  }
});

const http = httpRouter();

http.route({
  path: "/api/chat",
  method: "POST",
  handler: chat,
});

http.route({
  path: "/api/chat",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => {
    // Make sure the necessary headers are present
    // for this to be a valid pre-flight request
    const headers = request.headers;
    if (
      headers.get("Origin") !== null &&
      headers.get("Access-Control-Request-Method") !== null &&
      headers.get("Access-Control-Request-Headers") !== null
    ) {
      const origin = headers.get("Origin") || process.env.FRONTEND_URL || "http://localhost:5173";
      return new Response(null, {
        headers: new Headers({
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Max-Age": "86400",
        }),
      });
    } else {
      return new Response();
    }
  }),
});

http.route({
  path: "/api/auth/webhook",
  method: "POST",
  handler: httpAction(async (_, request) => {
    // Make sure the necessary headers are present
    // for this to be a valid pre-flight request
    const headers = request.headers;
    if (
      headers.get("Origin") !== null &&
      headers.get("Access-Control-Request-Method") !== null &&
      headers.get("Access-Control-Request-Headers") !== null
    ) {
      return new Response(null, {
        headers: new Headers({
          "Access-Control-Allow-Origin": "http://localhost:5173",
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Max-Age": "86400",
        }),
      });
    } else {
      return new Response();
    }
  }),
});

http.route({
  path: "/payments/webhook",
  method: "POST",
  handler: paymentWebhook,
});

http.route({
  path: "/resend-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    return await resend.handleResendEventWebhook(ctx, req);
  }),
});

// Log that routes are configured
console.log("HTTP routes configured");

// Convex expects the router to be the default export of `convex/http.js`.
export default http;
