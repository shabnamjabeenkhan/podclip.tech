import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini client
export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }

  return new GoogleGenerativeAI(apiKey);
}

// Function to detect podcast genre based on title, description, and/or transcript
function detectPodcastGenre(episodeTitle: string, episodeDescription?: string, transcript?: string): 'actionable' | 'entertainment' {
  const entertainmentGenres = [
    'comedy', 'entertainment', 'casual', 'conversation', 'chat', 'talk show',
    'humor', 'funny', 'joke', 'laughter', 'improv', 'stand-up', 'comedian',
    'sports', 'gaming', 'pop culture', 'celebrity', 'gossip', 'news', 'current events',
    'story', 'storytelling', 'narrative', 'fiction', 'drama', 'mystery',
    'music', 'art', 'culture', 'lifestyle', 'relationships', 'dating',
    'true crime', 'history', 'documentary', 'interview', 'recap', 'review',
    'political', 'politics', 'piers morgan', 'charlie kirk', 'debate', 'controversy',
    'social issues', 'cultural', 'society', 'discussion', 'opinion', 'commentary'
  ];

  const actionableGenres = [
    'business', 'marketing', 'entrepreneurship', 'startup', 'personal development',
    'self-help', 'self help', 'health', 'fitness', 'leadership', 'career', 'education', 'learning',
    'finance', 'investing', 'productivity', 'management', 'coaching', 'motivation',
    'success', 'growth', 'strateg', 'innovation', 'technology business', 'sales',
    'tutorial', 'how-to', 'how to', 'guide', 'tips', 'advice', 'framework', 'method'
  ];

  // Use title, description, and first part of transcript (if available) for analysis
  const transcriptSample = transcript ? transcript.substring(0, 1000) : '';
  const combinedText = `${episodeTitle} ${episodeDescription || ''} ${transcriptSample}`.toLowerCase();

  // Check for entertainment keywords first (more specific)
  const hasEntertainmentKeywords = entertainmentGenres.some(genre => {
    const keywords = genre.split(' ');
    return keywords.some(keyword => {
      // Use word boundaries to avoid false positives like "art" matching in "strategies"
      const wordRegex = new RegExp(`\\b${keyword}\\b`, 'i');
      return wordRegex.test(combinedText);
    });
  });

  // If entertainment keywords found, return entertainment
  if (hasEntertainmentKeywords) {
    return 'entertainment';
  }

  // Check if any actionable genre keywords are present
  const hasActionableKeywords = actionableGenres.some(genre => {
    const keywords = genre.split(' ');
    return keywords.some(keyword => {
      // Use word boundaries for most keywords, but allow partial matching for "strateg" prefix
      if (keyword === 'strateg') {
        return combinedText.includes(keyword);
      }
      const wordRegex = new RegExp(`\\b${keyword}\\b`, 'i');
      return wordRegex.test(combinedText);
    });
  });

  // Default to entertainment if no actionable keywords found
  return hasActionableKeywords ? 'actionable' : 'entertainment';
}

// Function to transcribe audio using Gemini
export async function transcribeAudioWithGemini(audioUrl: string): Promise<{
  transcript: string;
  success: boolean;
  error?: string;
}> {
  const genAI = getGeminiClient();

  // Use Gemini 2.0 Flash model for transcription
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    generationConfig: {
      temperature: 0.1, // Lower temperature for more accurate transcription
      maxOutputTokens: 8192,
    },
  });

  try {
    // Fetch the audio file
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');

    // Determine MIME type based on URL or default to mp3
    let mimeType = 'audio/mpeg';
    if (audioUrl.includes('.wav')) mimeType = 'audio/wav';
    else if (audioUrl.includes('.m4a')) mimeType = 'audio/mp4';
    else if (audioUrl.includes('.ogg')) mimeType = 'audio/ogg';

    const prompt = `
Please transcribe this audio file completely and accurately.
Provide only the spoken text without any additional commentary, timestamps, or formatting.
The transcript should capture all words spoken in the audio.
`;

    const result = await model.generateContent([
      {
        text: prompt
      },
      {
        inlineData: {
          data: audioBase64,
          mimeType: mimeType
        }
      }
    ]);

    const response_text = result.response.text();

    return {
      transcript: response_text.trim(),
      success: true
    };

  } catch (error) {
    console.error('Gemini transcription error:', error);
    return {
      transcript: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown transcription error'
    };
  }
}

// Generate summary using Gemini 2.0 Flash with full transcript
export async function generateSummaryWithGemini(
  transcript: string,
  episodeTitle: string,
  episodeDescription?: string,
  audioUrl?: string,
  ultraStrictMode: boolean = false,
  shouldGenerateInsights: boolean = false
) {
  const genAI = getGeminiClient();

  // Use Gemini 2.0 Flash model - supports up to 1M tokens
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    generationConfig: {
      temperature: 0.7,
      topP: 0.8,
      maxOutputTokens: 8192,
    },
  });

  // Handle missing description by using Gemini transcription if needed
  let finalTranscript = transcript;
  let finalDescription = episodeDescription;

  // If description is missing or very short, and we have audio URL, try Gemini transcription
  if ((!episodeDescription || episodeDescription.trim().length < 50) && audioUrl && transcript.length < 500) {
    console.log('Description missing or too short, attempting Gemini transcription...');
    try {
      const transcriptionResult = await transcribeAudioWithGemini(audioUrl);

      if (transcriptionResult.success && transcriptionResult.transcript.length > 100) {
        console.log(`Gemini transcription successful: ${transcriptionResult.transcript.length} characters`);
        finalTranscript = transcriptionResult.transcript;
        // Create a description from the first part of the transcript
        finalDescription = transcriptionResult.transcript.substring(0, 300) + '...';
      } else {
        console.log(`Gemini transcription failed or too short: ${transcriptionResult.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error during Gemini transcription:', error);
    }
  }

  // Log transcript analysis before processing
  const transcriptWordCount = finalTranscript.split(/\s+/).filter((word: string) => word.length > 0).length;
  console.log(`🔍 GEMINI INPUT ANALYSIS:`);
  console.log(`📊 Transcript: ${transcriptWordCount} words, ${finalTranscript.length} characters`);
  console.log(`📝 Title: "${episodeTitle}"`);
  console.log(`📋 Description: "${finalDescription?.substring(0, 100) || 'None'}..."`);

  // Detect genre using title, description, and transcript
  const genre = detectPodcastGenre(episodeTitle, finalDescription, finalTranscript);
  const isActionableGenre = genre === 'actionable';

  console.log(`🎯 Genre detected: ${genre} (actionable: ${isActionableGenre})`);
  console.log(`💡 Insights generation: ${shouldGenerateInsights} (user choice overrides genre detection)`);

  if (transcriptWordCount < 2000) {
    console.log(`⚠️ GEMINI WARNING: Short transcript (${transcriptWordCount} words) may produce brief summaries`);
  }

  if (ultraStrictMode) {
    console.log(`🚨 ULTRA-STRICT MODE ENABLED: Maximum word count enforcement`);
  }

  // If we still can't determine genre after transcription, default to entertainment format
  // but without actionable insights
  const useDefaultFormat = !episodeDescription && !finalDescription;

  const strictnessPrefix = ultraStrictMode ? `
🚨 ULTRA-STRICT MODE: This is your FINAL ATTEMPT. You MUST generate EXACTLY 150-200 words or this will be considered a failure.

COUNT EVERY SINGLE WORD. Your summary MUST have:
- MINIMUM 150 words (count them!)
- MAXIMUM 200 words (count them!)
- If you write less than 150 words, you have FAILED
- If you write more than 200 words, you have FAILED

WORD COUNT VERIFICATION: After writing your summary, COUNT THE WORDS to ensure it's 150-200 words.

` : '';

  const prompt = shouldGenerateInsights && !useDefaultFormat ? `${strictnessPrefix}
You are a podcast summarizer that analyzes the episode's genre and adapts your output accordingly. This episode appears to be in a business/productivity/educational genre.

🚨 ULTRA-CRITICAL ACCURACY INSTRUCTION:
1. READ EVERY SINGLE WORD of the transcript below from START TO FINISH
2. ANALYZE THE COMPLETE EPISODE CONTENT - do not skim or skip sections
3. VERIFY your takeaways reflect content from THROUGHOUT the episode (beginning, middle, and end)
4. ENSURE each takeaway accurately represents what was ACTUALLY SAID in the transcript
5. Only generate takeaways based on DIRECT CONTENT from the transcript - no assumptions

TRANSCRIPT ANALYSIS REQUIREMENT:
- Read every word of the transcript below before proceeding
- The transcript contains the COMPLETE episode content
- Extract takeaways from the ENTIRE episode, not just the beginning
- Ensure your summary reflects the full scope of discussion

Generate a detailed, comprehensive summary that is EXACTLY 150-200 words (count your words carefully!) and exactly seven key takeaways highlighting important or useful points from across the ENTIRE episode.

CRITICAL: Your summary MUST be between 150-200 words. Do not write shorter summaries. Include specific details, examples, insights, and juicy discussion points from the COMPLETE episode.

Episode Title: ${episodeTitle}
${finalDescription ? `Episode Description: ${finalDescription}` : ''}

COMPLETE Episode Transcript (READ ENTIRELY BEFORE PROCEEDING):
${finalTranscript}

Format your response EXACTLY as:
SUMMARY:
[Write EXACTLY 150-200 words - count them! Include specific details, examples, key insights, interesting stories, important quotes, and juicy discussion points from the episode. Make it comprehensive and detailed, not generic.]

KEY TAKEAWAYS:
• First key takeaway highlighting important or useful point
• Second important insight that listeners should know
• Third actionable strategy or framework mentioned
• Fourth valuable concept or principle discussed
• Fifth noteworthy observation or data point
• Sixth compelling story or example shared
• Seventh memorable quote or final thought

ACTIONABLE INSIGHTS:
**Action 1: [Specific action or recommendation inspired by the content]**
Context: [The reason or context for this suggestion - why this matters based on episode content]
Application: [If relevant, an example or scenario of how this could be applied in real life, related to the episode's topic or audience]
Resources: [Any specific tools, books, apps, websites, or resources mentioned in the episode]

**Action 2: [Specific action or recommendation inspired by the content]**
Context: [The reason or context for this suggestion - why this matters based on episode content]
Application: [If relevant, an example or scenario of how this could be applied in real life, related to the episode's topic or audience]
Resources: [Any specific tools, books, apps, websites, or resources mentioned in the episode]

**Action 3: [Specific action or recommendation inspired by the content]**
Context: [The reason or context for this suggestion - why this matters based on episode content]
Application: [If relevant, an example or scenario of how this could be applied in real life, related to the episode's topic or audience]
Resources: [Any specific tools, books, apps, websites, or resources mentioned in the episode]

GROWTH STRATEGY:
[2-3 sentences outlining strategic approaches, frameworks, or methodologies discussed that can drive growth, improvement, or success in business, career, or personal development]

KEY INSIGHT:
[1-2 sentences highlighting the most important revelation, principle, or "aha moment" from the episode that provides significant value or changes perspective]

REALITY CHECK:
[1-2 sentences addressing potential challenges, misconceptions, or important considerations that listeners should be aware of when implementing the discussed strategies or insights]
` : `${strictnessPrefix}
You are a podcast summarizer that analyzes the episode's genre and adapts your output accordingly. ${useDefaultFormat ? 'Genre could not be determined - defaulting to general format.' : 'This episode appears to be entertainment/general content (comedy, fiction, sports, news, etc).'}

🚨 ULTRA-CRITICAL ACCURACY INSTRUCTION:
1. READ EVERY SINGLE WORD of the transcript below from START TO FINISH
2. ANALYZE THE COMPLETE EPISODE CONTENT - do not skim or skip sections
3. VERIFY your takeaways reflect content from THROUGHOUT the episode (beginning, middle, and end)
4. ENSURE each takeaway accurately represents what was ACTUALLY SAID in the transcript
5. Only generate takeaways based on DIRECT CONTENT from the transcript - no assumptions

TRANSCRIPT ANALYSIS REQUIREMENT:
- Read every word of the transcript below before proceeding
- The transcript contains the COMPLETE episode content
- Extract takeaways from the ENTIRE episode, not just the beginning
- Ensure your summary reflects the full scope of the conversation

Generate only a detailed, comprehensive summary that is EXACTLY 150-200 words (count your words carefully!) and exactly seven key takeaways focused on the most interesting, entertaining, and important moments from across the ENTIRE episode.

CRITICAL: Your summary MUST be between 150-200 words. Do not write shorter summaries. Include specific details, entertaining moments, interesting quotes, funny stories, and juicy discussion points from the COMPLETE episode.

Episode Title: ${episodeTitle}
${finalDescription ? `Episode Description: ${finalDescription}` : ''}

COMPLETE Episode Transcript (READ ENTIRELY BEFORE PROCEEDING):
${finalTranscript}

CRITICAL REQUIREMENTS:
- DO NOT generate an "Actionable Insights" section
- DO NOT output sections titled "Growth Strategy", "Reality Check", or "Key Insight"
- Focus on entertainment value, interesting moments, and key lessons rather than actionable advice

Format your response EXACTLY as:
SUMMARY:
[Write EXACTLY 150-200 words - count them! Focus on the most interesting moments, entertainment value, funny stories, key discussions, memorable quotes, and noteworthy content. Include specific details and juicy discussion points. Make it engaging and informative without focusing on actionable advice.]

KEY TAKEAWAYS:
• First key takeaway focused on interesting or entertaining moment/lesson
• Second important insight or memorable moment from the episode
• Third noteworthy observation or discussion point
• Fourth compelling story, example, or interesting revelation
• Fifth entertaining moment or valuable perspective shared
• Sixth notable quote, joke, or memorable exchange
• Seventh final thought or standout moment from the episode
`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    console.log("🤖 GEMINI RAW RESPONSE (first 500 chars):", text.substring(0, 500));

    // Parse the response to extract summary, takeaways, and actionable insights
    const summaryMatch = text.match(/SUMMARY:\s*([\s\S]*?)(?=KEY TAKEAWAYS:|$)/);
    const takeawaysMatch = text.match(/KEY TAKEAWAYS:\s*([\s\S]*?)(?=ACTIONABLE INSIGHTS:|$)/);
    const actionableInsightsMatch = text.match(/ACTIONABLE INSIGHTS:\s*([\s\S]*?)(?=GROWTH STRATEGY:|$)/);
    const growthStrategyMatch = text.match(/GROWTH STRATEGY:\s*([\s\S]*?)(?=KEY INSIGHT:|$)/);
    const keyInsightMatch = text.match(/KEY INSIGHT:\s*([\s\S]*?)(?=REALITY CHECK:|$)/);
    const realityCheckMatch = text.match(/REALITY CHECK:\s*([\s\S]*?)(?=$)/);

    const summary = summaryMatch?.[1]?.trim() || text;
    const takeawaysText = takeawaysMatch?.[1]?.trim() || '';

    console.log("🎯 TAKEAWAYS RAW TEXT:", takeawaysText);
    console.log("🎯 TAKEAWAYS SPLIT BY NEWLINE:", takeawaysText.split('\n'));

    const actionableInsightsText = actionableInsightsMatch?.[1]?.trim() || '';
    const growthStrategyText = growthStrategyMatch?.[1]?.trim() || '';
    const keyInsightText = keyInsightMatch?.[1]?.trim() || '';
    const realityCheckText = realityCheckMatch?.[1]?.trim() || '';

    // Parse takeaways into array
    const takeaways = takeawaysText
      .split('\n')
      .filter(line => line.trim().startsWith('•'))
      .map(line => line.replace(/^•\s*/, '').trim())
      .filter(takeaway => takeaway.length > 0);

    console.log("🎯 PARSED TAKEAWAYS COUNT:", takeaways.length);
    console.log("🎯 PARSED TAKEAWAYS:", takeaways);

    // Fallback: If we don't have exactly 7 takeaways, try alternative parsing
    let finalTakeaways = takeaways;
    if (finalTakeaways.length !== 7) {
      console.log("⚠️ TAKEAWAY COUNT MISMATCH! Expected 7, got:", finalTakeaways.length);

      // Try parsing with numbered list (1. 2. 3. etc.)
      const numberedTakeaways = takeawaysText
        .split('\n')
        .filter(line => /^\d+\./.test(line.trim()))
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(takeaway => takeaway.length > 0);

      console.log("🔄 TRYING NUMBERED PARSING:", numberedTakeaways.length, numberedTakeaways);

      if (numberedTakeaways.length === 7) {
        finalTakeaways = numberedTakeaways;
        console.log("✅ FIXED WITH NUMBERED PARSING!");
      } else {
        // Try parsing with dash/hyphen (- takeaway)
        const dashedTakeaways = takeawaysText
          .split('\n')
          .filter(line => line.trim().startsWith('-'))
          .map(line => line.replace(/^-\s*/, '').trim())
          .filter(takeaway => takeaway.length > 0);

        console.log("🔄 TRYING DASHED PARSING:", dashedTakeaways.length, dashedTakeaways);

        if (dashedTakeaways.length === 7) {
          finalTakeaways = dashedTakeaways;
          console.log("✅ FIXED WITH DASHED PARSING!");
        } else {
          // Last resort: split by lines and take first 7 non-empty lines
          const lineTakeaways = takeawaysText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .slice(0, 7);

          console.log("🔄 TRYING LINE PARSING:", lineTakeaways.length, lineTakeaways);

          if (lineTakeaways.length >= 4) {
            finalTakeaways = lineTakeaways;
            console.log("✅ FIXED WITH LINE PARSING!");
          }
        }
      }
    }

    console.log("🎯 FINAL TAKEAWAYS COUNT:", finalTakeaways.length);
    console.log("🎯 FINAL TAKEAWAYS:", finalTakeaways);

    // Parse actionable insights into structured format when user requested them (not just for actionable genres)
    console.log("🔍 ACTIONABLE INSIGHTS PARSING:");
    console.log("  shouldGenerateInsights:", shouldGenerateInsights);
    console.log("  useDefaultFormat:", useDefaultFormat);
    console.log("  actionableInsightsText length:", actionableInsightsText.length);
    console.log("  actionableInsightsText preview:", actionableInsightsText.substring(0, 200) + "...");

    const actionableInsights = (shouldGenerateInsights && !useDefaultFormat) ?
      actionableInsightsText
        .split(/\*\*Action \d+:/)
        .slice(1) // Remove empty first element
        .map(insight => {
          const lines = insight.trim().split('\n').filter(line => line.trim());
          const action = lines[0]?.replace(/\*\*$/, '') || '';
          const context = lines.find(line => line.startsWith('Context:'))?.replace('Context: ', '') || '';
          const application = lines.find(line => line.startsWith('Application:'))?.replace('Application: ', '') || '';
          const resources = lines.find(line => line.startsWith('Resources:'))?.replace('Resources: ', '') || '';

          return {
            action: action.trim(),
            context: context.trim(),
            application: application.trim(),
            resources: resources.trim()
          };
        })
        .filter(insight => insight.action.length > 0) : [];

    console.log("🎉 FINAL ACTIONABLE INSIGHTS COUNT:", actionableInsights.length);
    console.log("🎉 FINAL ACTIONABLE INSIGHTS:", actionableInsights);

    return {
      summary,
      takeaways: finalTakeaways,
      actionableInsights,
      growthStrategy: shouldGenerateInsights ? growthStrategyText : undefined,
      keyInsight: shouldGenerateInsights ? keyInsightText : undefined,
      realityCheck: shouldGenerateInsights ? realityCheckText : undefined,
      model: 'gemini-2.0-flash-exp',
      fullTranscriptProcessed: true
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error(`Gemini summary generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}