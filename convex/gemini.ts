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

  // Use default format only when user hasn't explicitly requested actionable insights
  // and we can't determine the genre from available information
  const useDefaultFormat = !shouldGenerateInsights && !episodeDescription && !finalDescription;

  const strictnessPrefix = ultraStrictMode ? `
🚨 ULTRA-STRICT MODE: This is your FINAL ATTEMPT. You MUST generate EXACTLY 150-200 words or this will be considered a failure.

COUNT EVERY SINGLE WORD. Your summary MUST have:
- MINIMUM 150 words (count them!)
- MAXIMUM 200 words (count them!)
- If you write less than 150 words, you have FAILED
- If you write more than 200 words, you have FAILED

WORD COUNT VERIFICATION: After writing your summary, COUNT THE WORDS to ensure it's 150-200 words.

` : '';

  const prompt = shouldGenerateInsights ? `${strictnessPrefix}
You are an expert podcast summariser.
Your output is valid ONLY if it follows the enforced structure below.
Any deviation (wrong sectioning, missing timestamps, wrong counts, or transcript-like copying) is INVALID and must be regenerated.

### Required Sections (with headings):
1. **Main Summary**
   - Provide a 150-200 words of the entire episode.
   - No timestamps in this section.
2. **Key Takeaways**
   - Must include exactly **7 numbered takeaways**, in chronological order.
   - Each takeaway must begin with a placeholder timestamp [TIMESTAMP] - DO NOT guess timestamps
   - Format for each item:
     1. [TIMESTAMP] [1–2 sentence distilled insight]
   - No transcript-like copying. Insights must be summarised in standalone, valuable terms.
3. **Actionable Insights**
   - Must include exactly **5 actionable insights** (not 7).
   - Derive each insight directly from the content and themes of the chosen episode.
   - For each actionable insight, display the information in three separate sections:
     • Actionable Insight: Present the specific instruction based on episode content
     • Why this matters: Brief explanation of the benefit or reason for the action
     • Real-life example: Practical scenario demonstrating application of the insight (must not simply repeat the original instruction—add new context or detail)
   - Format for each item:
     1. **Actionable Insight**: [Specific instruction based on episode content]
        **Why this matters**: [Brief explanation of the benefit or reason]
        **Real-life example**: [Practical scenario with new context, not repeating the instruction]

### Debugging Self-Check (before final output):
- Did I structure the response into **3 sections with headings**: Main Summary, Key Takeaways, Actionable Insights?
- Are there exactly **7 Key Takeaways**, each starting with a **jumpable timestamp** in [hh:mm:ss] format?
- Are there exactly **5 Actionable Insights**, practical and useful, not vague?
- Did I avoid transcript-like copying?
If ANY condition is not met, regenerate until fully compliant.

Episode Title: ${episodeTitle}
${finalDescription ? `Episode Description: ${finalDescription}` : ''}

COMPLETE Episode Transcript (READ ENTIRELY BEFORE PROCEEDING):
${finalTranscript}
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

**Main Summary**
[Write EXACTLY 150-200 words - count them! Focus on the most interesting moments, entertainment value, funny stories, key discussions, memorable quotes, and noteworthy content. Include specific details and juicy discussion points. Make it engaging and informative without focusing on actionable advice.]

**Key Takeaways**
1. [TIMESTAMP] First key takeaway focused on interesting or entertaining moment/lesson
2. [TIMESTAMP] Second important insight or memorable moment from the episode
3. [TIMESTAMP] Third noteworthy observation or discussion point
4. [TIMESTAMP] Fourth compelling story, example, or interesting revelation
5. [TIMESTAMP] Fifth entertaining moment or valuable perspective shared
6. [TIMESTAMP] Sixth notable quote, joke, or memorable exchange
7. [TIMESTAMP] Seventh final thought or standout moment from the episode
`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    console.log("🤖 GEMINI RAW RESPONSE (first 500 chars):", text.substring(0, 500));

    // Parse the response to extract the structured format - support both ** and ### formats
    const mainSummaryMatch = text.match(/(?:\*\*Main Summary\*\*|### Main Summary)\s*([\s\S]*?)(?=(?:\*\*Key Takeaways\*\*|### Key Takeaways)|$)/);
    const keyTakeawaysMatch = text.match(/(?:\*\*Key Takeaways\*\*|### Key Takeaways)\s*([\s\S]*?)(?=(?:\*\*Actionable Insights\*\*|### Actionable Insights)|$)/);
    const actionableInsightsMatch = text.match(/(?:\*\*Actionable Insights\*\*|### Actionable Insights)\s*([\s\S]*?)(?=$)/);

    const summary = mainSummaryMatch?.[1]?.trim() || text;
    const takeawaysText = keyTakeawaysMatch?.[1]?.trim() || '';
    const actionableInsightsText = actionableInsightsMatch?.[1]?.trim() || '';

    console.log("🎯 NEW FORMAT TAKEAWAYS RAW TEXT:", takeawaysText);
    console.log("🎯 NEW FORMAT ACTIONABLE INSIGHTS RAW TEXT:", actionableInsightsText);
    console.log("🎯 ACTIONABLE INSIGHTS LENGTH:", actionableInsightsText.length);
    console.log("🎯 SHOULD GENERATE INSIGHTS:", shouldGenerateInsights);

    // Parse numbered takeaways with timestamps: 1. [hh:mm:ss] ...
    const takeaways: string[] = [];
    const numberedTakeawayPattern = /(\d+)\.\s*\[([^\]]+)\]\s*(.*?)(?=\n\d+\.|$)/gs;

    console.log("🔍 REGEX PATTERN:", numberedTakeawayPattern.source);
    console.log("🔍 TAKEAWAYS TEXT LENGTH:", takeawaysText.length);
    console.log("🔍 TAKEAWAYS PREVIEW:", takeawaysText.substring(0, 200));

    let match;
    while ((match = numberedTakeawayPattern.exec(takeawaysText)) !== null) {
      const [, number, timestamp, keyTakeaway] = match;

      console.log(`🎯 PARSING TAKEAWAY ${number}: ${timestamp}`);
      console.log(`🎯 KEY TAKEAWAY: ${keyTakeaway.trim()}`);

      // Store takeaway with timestamp
      const takeawayWithTimestamp = `[${timestamp}] ${keyTakeaway.trim()}`;
      takeaways.push(takeawayWithTimestamp);
    }

    // Parse actionable insights with structured format: Action, Why this matters, Real-life example
    const actionableInsights: Array<{
      action: string;
      context: string;
      application: string;
      resources: string;
    }> = [];

    // Parse actionable insights with three-part structure: Actionable Insight, Why this matters, Real-life example
    // More robust pattern to handle multiline content and variations in formatting
    const insightPattern = /(\d+)\.\s*\*\*Actionable Insight\*\*:\s*([\s\S]*?)\s*\*\*Why this matters\*\*:\s*([\s\S]*?)\s*\*\*Real-life example\*\*:\s*([\s\S]*?)(?=\n\d+\.\s*\*\*Actionable Insight\*\*|$)/g;
    let insightMatch;
    while ((insightMatch = insightPattern.exec(actionableInsightsText)) !== null) {
      const [, number, actionableInsight, whyMatters, realLifeExample] = insightMatch;

      console.log(`🎯 PARSING ACTIONABLE INSIGHT ${number}:`);
      console.log(`  Actionable Insight: ${actionableInsight.trim()}`);
      console.log(`  Why this matters: ${whyMatters.trim()}`);
      console.log(`  Real-life example: ${realLifeExample.trim()}`);

      actionableInsights.push({
        action: actionableInsight.trim(),
        context: whyMatters.trim(),
        application: realLifeExample.trim(),
        resources: ''
      });
    }

    // Fallback to simple format if structured format doesn't match
    if (actionableInsights.length === 0 && actionableInsightsText.length > 0) {
      console.log("⚠️ Structured format not found, falling back to simple format parsing");
      const fallbackPattern = /(\d+)\.\s*(?:Actionable Insight:\s*)?(.*?)(?=\n\d+\.|$)/gs;
      let fallbackMatch;
      while ((fallbackMatch = fallbackPattern.exec(actionableInsightsText)) !== null) {
        const [, number, insight] = fallbackMatch;

        console.log(`🎯 FALLBACK PARSING ACTIONABLE INSIGHT ${number}: ${insight.trim()}`);

        actionableInsights.push({
          action: insight.trim(),
          context: `Actionable insight ${number}`,
          application: insight.trim(),
          resources: ''
        });
      }
    }

    console.log("🎯 PARSED TAKEAWAYS COUNT:", takeaways.length);
    console.log("🎯 PARSED TAKEAWAYS:", takeaways);
    console.log("🎯 PARSED ACTIONABLE INSIGHTS COUNT:", actionableInsights.length);

    // Use the parsed takeaways and actionable insights from new format
    const finalTakeaways = takeaways;
    const finalActionableInsights = actionableInsights;

    if (finalTakeaways.length !== 7) {
      console.log("⚠️ TAKEAWAY COUNT MISMATCH! Expected 7, got:", finalTakeaways.length);
      console.log("✅ Using new format with quality over quantity approach");
    }

    if (finalActionableInsights.length !== 5) {
      console.log("⚠️ ACTIONABLE INSIGHTS COUNT MISMATCH! Expected 5, got:", finalActionableInsights.length);
    }

    console.log("🎯 FINAL TAKEAWAYS COUNT:", finalTakeaways.length);
    console.log("🎯 FINAL TAKEAWAYS:", finalTakeaways);
    console.log("🎯 FINAL ACTIONABLE INSIGHTS COUNT:", finalActionableInsights.length);

    return {
      summary,
      takeaways: finalTakeaways,
      actionableInsights: finalActionableInsights,
      growthStrategy: undefined, // Removed in new format
      keyInsight: undefined, // Removed in new format
      realityCheck: undefined, // Removed in new format
      model: 'gemini-2.0-flash-exp',
      fullTranscriptProcessed: true
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error(`Gemini summary generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}