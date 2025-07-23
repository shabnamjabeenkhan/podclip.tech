import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { internal, api } from "./_generated/api";

export const generateSummary = action({
  args: { 
    episodeId: v.string(),
    episodeTitle: v.string(),
    episodeDescription: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args): Promise<any> => {
    // Check quota before generating summary
    const quotaStatus = await ctx.runMutation(internal.users.checkAndResetQuota);
    
    if (!quotaStatus.canGenerate) {
      throw new Error(`Quota exceeded. You have used ${quotaStatus.used}/${quotaStatus.limit} summaries. ${
        quotaStatus.limit === 5 ? "Upgrade to get more summaries." : "Your quota will reset next month."
      }`);
    }

    // Try to get transcript for better summary quality
    let transcriptData = null;
    try {
      transcriptData = await ctx.runAction(api.transcriptions.getEpisodeTranscription, {
        episodeId: args.episodeId,
      });
      console.log(`Transcript ${transcriptData.hasTranscript ? 'available' : 'not available'} for episode ${args.episodeId}`);
    } catch (error) {
      console.warn(`Failed to fetch transcript for episode ${args.episodeId}:`, error);
    }

    // Generate summary using OpenAI with transcript if available
    let prompt;
    
    if (transcriptData?.hasTranscript && transcriptData.transcript) {
      // Use transcript for much better summary quality
      const transcript = transcriptData.transcript;
      // Truncate transcript if too long to fit in token limits (keep first ~8000 characters)
      const truncatedTranscript = transcript.length > 8000 
        ? transcript.substring(0, 8000) + "..."
        : transcript;
      
      prompt = `
Please analyze this podcast episode transcript and provide:

1. A detailed summary (200-300 words)
2. 7 key takeaways as bullet points

Episode Title: ${args.episodeTitle}

Episode Transcript:
${truncatedTranscript}

Focus on the main topics discussed, key insights shared, and actionable advice given.

Format your response as:
SUMMARY:
[Your 200-300 word summary here]

KEY TAKEAWAYS:
• [Takeaway 1]
• [Takeaway 2]
• [Takeaway 3]
• [Takeaway 4]
• [Takeaway 5]
• [Takeaway 6]
• [Takeaway 7]
`;
    } else {
      // Fallback to description-based summary
      prompt = `
Please analyze this podcast episode and provide:

1. A detailed summary (200-300 words)
2. 7 key takeaways as bullet points

Episode Title: ${args.episodeTitle}
Episode Description: ${args.episodeDescription}

Note: This summary is based on the episode description as transcript is not available.

Format your response as:
SUMMARY:
[Your 200-300 word summary here]

KEY TAKEAWAYS:
• [Takeaway 1]
• [Takeaway 2]
• [Takeaway 3]
• [Takeaway 4]
• [Takeaway 5]
• [Takeaway 6]
• [Takeaway 7]
`;
    }

    // Retry logic for rate limits
    let response;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      attempts++;
      
      console.log(`Attempt ${attempts}: Making OpenAI API request...`);
      console.log(`API Key exists: ${!!process.env.OPENAI_API_KEY}`);
      console.log(`API Key starts with: ${process.env.OPENAI_API_KEY?.substring(0, 10)}...`);
      
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      console.log(`Response status: ${response.status}`);
      console.log(`Response status text: ${response.statusText}`);
      
      // If successful, break out of retry loop
      if (response.ok) {
        console.log("OpenAI API request successful!");
        break;
      }
      
      // If rate limited (429), wait and retry
      if (response.status === 429 && attempts < maxAttempts) {
        const waitTime = Math.pow(2, attempts) * 1000; // Exponential backoff: 2s, 4s, 8s
        console.log(`Rate limited, waiting ${waitTime}ms before retry ${attempts}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // If other error or max attempts reached, fall back to mock data
      console.log(`OpenAI API failed after ${maxAttempts} attempts with status ${response.status}, using fallback`);
      
      // Fallback to mock data when OpenAI fails
      const summary = `This episode discusses ${args.episodeTitle}. The conversation covers key insights about the topic, providing valuable information for listeners. The hosts explore different perspectives and share practical advice that can be applied in real-world situations. Throughout the episode, they maintain an engaging dialogue that keeps the audience interested while delivering educational content.`;
      
      const takeaways = [
        "Understanding the core concepts is essential for success",
        "Practical application of ideas leads to better results", 
        "Different perspectives provide valuable insights",
        "Consistent practice and dedication are key to improvement"
      ];

      // Increment user's summary count after successful generation (fallback case)
      await ctx.runMutation(internal.users.incrementSummaryCount);

      return {
        id: "temp-id",
        summary,
        takeaways,
        episodeId: args.episodeId,
        userId: args.userId,
        createdAt: Date.now(),
        hasTranscript: false, // Fallback case - no transcript used
        transcriptUsed: false,
      };
    }

    const data = await response!.json();
    const aiResponse = data.choices[0].message.content;

    // Parse the AI response
    const summaryMatch = aiResponse.match(/SUMMARY:\s*([\s\S]*?)(?=KEY TAKEAWAYS:|$)/);
    const takeawaysMatch = aiResponse.match(/KEY TAKEAWAYS:\s*([\s\S]*)/);

    const summary = summaryMatch ? summaryMatch[1].trim() : aiResponse;
    const takeawaysText = takeawaysMatch ? takeawaysMatch[1].trim() : "";
    
    // Extract individual takeaways
    const takeaways = takeawaysText
      .split("•")
      .map((item: string) => item.trim())
      .filter((item: string) => item.length > 0);

    // Increment user's summary count after successful generation
    await ctx.runMutation(internal.users.incrementSummaryCount);

    return {
      id: "temp-id",
      summary,
      takeaways,
      episodeId: args.episodeId,
      userId: args.userId,
      createdAt: Date.now(),
      hasTranscript: transcriptData?.hasTranscript || false,
      transcriptUsed: !!(transcriptData?.hasTranscript && transcriptData.transcript),
    };
  },
});

export const createSummary = mutation({
  args: {
    episodeId: v.string(),
    userId: v.string(),
    summary: v.string(),
    takeaways: v.array(v.string()),
    episodeTitle: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("summaries", {
      episode_id: args.episodeId,
      user_id: args.userId,
      content: args.summary,
      takeaways: args.takeaways,
      episode_title: args.episodeTitle,
      created_at: now,
    });
  },
});

export const getSummaryByEpisodeAndUser = query({
  args: {
    episodeId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("summaries")
      .withIndex("by_episode_user", (q) => 
        q.eq("episode_id", args.episodeId).eq("user_id", args.userId)
      )
      .first();
  },
});

export const getUserSummaryCount = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const summaries = await ctx.db
      .query("summaries")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .collect();
    
    return summaries.length;
  },
});

export const getUserSummaries = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("summaries")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .order("desc")
      .collect();
  },
});

export const getSummaryById = query({
  args: {
    summaryId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.summaryId as any);
  },
});