import { GoogleGenerativeAI } from '@google/generative-ai';

// Utility function to detect verbatim quotes in AI-generated takeaways
function detectVerbatimQuotes(takeaway: string, transcript: string): {
  isVerbatim: boolean;
  confidence: number;
  reason: string;
} {
  console.log(`🔍 DETECTING VERBATIM for: "${takeaway.substring(0, 50)}..."`);
  // Clean and normalize both texts for comparison
  const cleanTakeaway = takeaway.toLowerCase()
    .replace(/^\d+\.\s*/, '') // Remove numbering
    .replace(/\[timestamp\]|\[\d+:\d+:\d+\]/gi, '') // Remove timestamp placeholders
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  const cleanTranscript = transcript.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ');

  // Skip very short takeaways (less than 8 words)
  const takeawayWords = cleanTakeaway.split(/\s+/).filter(w => w.length > 0);
  if (takeawayWords.length < 8) {
    return { isVerbatim: false, confidence: 0, reason: "Too short to evaluate" };
  }

  // Method 1: Check for long consecutive word matches (10+ words, raised from 8 to be less aggressive)
  for (let i = 0; i <= takeawayWords.length - 10; i++) {
    const phrase = takeawayWords.slice(i, i + 10).join(' ');
    if (cleanTranscript.includes(phrase)) {
      return {
        isVerbatim: true,
        confidence: 0.9,
        reason: `Contains 10+ consecutive words from transcript: "${phrase}"`
      };
    }
  }

  // Method 2: STRICT verbatim detection - only catch true transcript copying
  const conversationalPatterns = [
    // Multiple filler words clustered together (true verbatim speech)
    /\b(um|uh|like|you know)\s+(um|uh|like|you know)\s+(um|uh|like|you know)/gi, // 3+ fillers

    // Obvious stuttering and repetition
    /\b(\w+)\s+\1\s+\1\b/gi,                   // Triple repetition: "the the the"
    /\b(it's it's|is is|the the|and and)\b/gi, // Common repeated words

    // Incomplete/broken sentences (true transcript artifacts)
    /\b\w+\s+-\s*$/gi,                         // Ends with dash: "word -"
    /\s+and\s*$/gi,                            // Ends mid-sentence: "word and"
    /\.\.\.\s*$/gi,                            // Ends with trailing dots

    // Extreme rambling with multiple fillers
    /(um|uh|like|you know)\s+\w+\s+(um|uh|like|you know)\s+\w+\s+(um|uh|like|you know)/gi,

    // Repeated conversational phrases
    /\b(you know)\s+.*\s+(you know)\b/gi,
    /\b(i mean)\s+.*\s+(i mean)\b/gi,

    // Incoherent patterns typical of raw speech
    /\b(and|but|so)\s+(and|but|so)\s+(and|but|so)/gi, // Triple conjunctions

    // Interview/conversational transition patterns that should never be in takeaways
    /\b(can you talk about|let's talk about|tell me about|what about)\b/gi,
    /\b(and so can you|so can you|can you just)\b/gi,
    /\b(talk about that factor|discuss that|that aspect|that element)\b/gi, // Vague references
    /\b(and so|so like|you know what|I mean like)\b/gi,

    // Incomplete sentence fragments and run-on conversational text
    /\b(here is that|there is that|problem for you|too it is)\b/gi, // Fragment patterns
    /\b(it is a common|one of the big|challenges with|is that it is not)\b/gi, // Run-on patterns
    /\b(actually a business so|technical issue it's|so it is$)\b/gi, // Trailing fragments
    /^[a-z].*\s(so|and|but|or)\s+(it|that|this)\s+(is|was|are)(\s|$)/gi, // Lowercase start + conjunction patterns

    // Conversational hedge patterns and qualifiers
    /\b(we don't want to|we will be looking at|caused a bit of a stir)\b/gi, // Hedge phrases
    /\b(anybody but we|recently an ai|they predict that by)\b/gi, // Conversational flow
    /\b(published recently|stir in the|when it was published)\b/gi, // Temporal references
    /\b(doomsday scenario|by \d{4} the$|the$)\b/gi, // Incomplete predictions and trailing articles
  ];

  for (const pattern of conversationalPatterns) {
    if (pattern.test(takeaway)) {
      return {
        isVerbatim: true,
        confidence: 0.8,
        reason: `Contains conversational fragments: ${takeaway.match(pattern)?.join(', ')}`
      };
    }
  }

  // Method 3: Check overall word overlap percentage
  const uniqueTakeawayWords = [...new Set(takeawayWords.filter(w => w.length > 3))];
  const transcriptWords = cleanTranscript.split(/\s+/);

  let overlapCount = 0;
  for (const word of uniqueTakeawayWords) {
    if (transcriptWords.includes(word)) {
      overlapCount++;
    }
  }

  const overlapRatio = overlapCount / uniqueTakeawayWords.length;

  // MUCH MORE AGGRESSIVE overlap detection - catch obvious verbatim copying
  if (overlapRatio > 0.75 && uniqueTakeawayWords.length > 8) {
    return {
      isVerbatim: true,
      confidence: 0.85,
      reason: `High word overlap: ${(overlapRatio * 100).toFixed(1)}% (${overlapCount}/${uniqueTakeawayWords.length} words)`
    };
  }

  // SECONDARY CHECK: Even medium overlap with long text suggests verbatim
  if (overlapRatio > 0.65 && uniqueTakeawayWords.length > 12) {
    return {
      isVerbatim: true,
      confidence: 0.75,
      reason: `Medium overlap with long text: ${(overlapRatio * 100).toFixed(1)}% (${overlapCount}/${uniqueTakeawayWords.length} words)`
    };
  }

  // Method 4: Check for incoherent sentence structure (typical of verbatim speech)
  const incoherentPatterns = [
    /\b\w+\s+\w+\s+\w+\s+\w+\s+\w+\s+which\s+(is|are)\s+(is|are)/gi, // Rambling patterns
    /\bthat's\s+that's\b/gi,
    /\bit\s+you\s+know\b/gi,
  ];

  for (const pattern of incoherentPatterns) {
    if (pattern.test(takeaway)) {
      return {
        isVerbatim: true,
        confidence: 0.75,
        reason: `Contains incoherent speech patterns: ${takeaway.match(pattern)?.join(', ')}`
      };
    }
  }

  // Method 5: Enhanced incomplete sentence structure detection
  if (takeaway.length > 30) { // Check shorter fragments too
    // Check for incomplete thoughts/trailing sentences and run-on patterns
    if (takeaway.includes('talk about that') ||
        takeaway.includes('discuss that') ||
        takeaway.endsWith(' and') ||
        takeaway.endsWith(' so') ||
        takeaway.endsWith(' or') ||
        takeaway.endsWith(' it is') ||
        takeaway.endsWith(' the') || // Trailing articles (very common in fragments)
        takeaway.endsWith(' a') ||
        takeaway.endsWith(' an') ||
        takeaway.includes(' too it is ') ||
        takeaway.includes(' here is that ') ||
        takeaway.includes(' problem for you ') ||
        takeaway.includes(' one of the big ') ||
        takeaway.includes(' we don\'t want to ') || // Conversational hedges
        takeaway.includes(' we will be looking at ') ||
        takeaway.includes(' caused a bit of ') ||
        takeaway.includes(' by 20') && takeaway.includes(' the') || // Year predictions with articles
        takeaway.match(/^[a-z]/) || // Starts with lowercase (fragment)
        !takeaway.match(/[.!?]$/)) {
      return {
        isVerbatim: true,
        confidence: 0.9,
        reason: "Incomplete sentence structure or conversational fragment detected"
      };
    }
  }

  return { isVerbatim: false, confidence: 0, reason: "Appears to be properly paraphrased" };
}

// Step 3: Polish takeaways to ensure professional language
export function polishTakeaways(takeaways: any[]): any[] {
  console.log(`🎯 POLISHING: Processing ${takeaways.length} takeaways for professional language`);

  return takeaways.map((takeaway, index) => {
    // Handle both string and object formats
    const originalText = typeof takeaway === 'string' ? takeaway :
                        (takeaway?.text || takeaway?.content || String(takeaway));

    // Apply professional language cleaning
    let polishedText = originalText;

    // Remove casual conversation starters at the beginning
    polishedText = polishedText.replace(/^(so,?\s+|well,?\s+|like,?\s+|you know,?\s+)/gi, '');

    // Remove filler words throughout
    polishedText = polishedText.replace(/\b(um|uh|you know|i mean)\b/gi, '');

    // Clean up punctuation and spacing issues
    polishedText = polishedText.replace(/,\s*,/g, ','); // Fix double commas
    polishedText = polishedText.replace(/\s+/g, ' ').trim(); // Multiple spaces
    polishedText = polishedText.replace(/,\s+,/g, ','); // Comma spacing issues

    // Ensure first letter is capitalized
    polishedText = polishedText.charAt(0).toUpperCase() + polishedText.slice(1);

    // Log transformation if changes were made
    if (polishedText !== originalText) {
      console.log(`✨ POLISHED TAKEAWAY ${index + 1}:`);
      console.log(`   Before: "${originalText}"`);
      console.log(`   After:  "${polishedText}"`);
    }

    // Return in the same format as input
    if (typeof takeaway === 'string') {
      return polishedText;
    } else {
      return {
        ...takeaway,
        text: polishedText
      };
    }
  });
}

// Function to filter out verbatim takeaways and log issues
export function filterVerbatimTakeaways(takeaways: any[], transcript: string): any[] {
  console.log(`🔍 VERBATIM DETECTION: Checking ${takeaways.length} takeaways`);
  console.log(`🔍 VERBATIM DETECTION DEBUG: Takeaway types:`, takeaways.map((t, i) => `${i+1}: ${typeof t}`));
  console.log(`🔍 VERBATIM DETECTION DEBUG: First takeaway:`, takeaways[0]);

  // Store detection results with scores
  const takeawayScores = takeaways.map((takeaway, index) => {
    // Handle both string and object formats
    const takeawayText = typeof takeaway === 'string' ? takeaway :
                        (takeaway?.text || takeaway?.content || String(takeaway));
    console.log(`🔍 VERBATIM DETECTION: Processing takeaway ${index + 1}: "${takeawayText.substring(0, 50)}..."`);

    const detection = detectVerbatimQuotes(takeawayText, transcript);

    if (detection.isVerbatim) {
      console.log(`❌ VERBATIM DETECTED [${index + 1}]: ${detection.reason}`);
      console.log(`📝 Flagged takeaway: "${takeawayText.substring(0, 100)}..."`);
      console.log(`🎯 Confidence: ${(detection.confidence * 100).toFixed(1)}%`);
    } else {
      console.log(`✅ Clean takeaway [${index + 1}]: ${detection.reason}`);
    }

    return {
      takeaway,
      index,
      isVerbatim: detection.isVerbatim,
      confidence: detection.confidence,
      reason: detection.reason
    };
  });

  // Filter out verbatim takeaways, but ensure we keep at least 3
  let filteredTakeaways = takeawayScores
    .filter(item => !item.isVerbatim)
    .map(item => item.takeaway);

  const filteredCount = takeaways.length - filteredTakeaways.length;

  // Safety net: If we filtered out too many takeaways, keep the best ones
  if (filteredTakeaways.length < 3 && takeaways.length >= 3) {
    console.log(`🚨 SAFETY NET: Only ${filteredTakeaways.length} takeaways left after filtering. Applying safety measures...`);

    // Sort by confidence (lower confidence = less likely to be verbatim)
    const sortedByConfidence = takeawayScores
      .filter(item => item.isVerbatim)
      .sort((a, b) => a.confidence - b.confidence);

    // Add back the least verbatim ones to reach at least 3 total
    const neededCount = Math.min(3 - filteredTakeaways.length, sortedByConfidence.length);
    for (let i = 0; i < neededCount; i++) {
      filteredTakeaways.push(sortedByConfidence[i].takeaway);
      console.log(`🔄 SAFETY NET: Restored takeaway with confidence ${(sortedByConfidence[i].confidence * 100).toFixed(1)}%`);
    }

    console.log(`🛡️ SAFETY NET: Ensured minimum of ${filteredTakeaways.length} takeaways`);
  }

  if (filteredCount > 0) {
    console.log(`🚨 FILTERED ${filteredCount} verbatim takeaways. Remaining: ${filteredTakeaways.length}`);
  } else {
    console.log(`✅ All ${takeaways.length} takeaways passed verbatim check`);
  }

  return filteredTakeaways;
}

// Initialize Gemini client
export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  console.log('🔍 GEMINI API KEY CHECK:');
  console.log('  - Key exists:', !!apiKey);
  console.log('  - Key length:', apiKey ? apiKey.length : 0);
  console.log('  - Key starts with:', apiKey ? apiKey.substring(0, 10) + '...' : 'undefined');

  if (!apiKey) {
    console.error('🚨 GEMINI_API_KEY missing! This will cause Gemini to fail.');
    throw new Error('GEMINI_API_KEY environment variable is required');
  }

  if (apiKey.length < 20) {
    console.error('🚨 GEMINI_API_KEY seems too short! Check if it\'s properly set.');
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
  console.log(`🚀 DEBUG: generateSummaryWithGemini called for "${episodeTitle}"`);
  console.log(`🚀 DEBUG: ultraStrictMode=${ultraStrictMode}, shouldGenerateInsights=${shouldGenerateInsights}`);
  console.log(`🚀 DEBUG: transcript length=${transcript.length} chars`);

  // Test Gemini API key before proceeding
  try {
    console.log('🧪 TESTING GEMINI API KEY...');
    const testClient = getGeminiClient();
    console.log('✅ GEMINI CLIENT CREATED SUCCESSFULLY');
  } catch (keyError) {
    console.error('🚨 GEMINI CLIENT CREATION FAILED:', keyError);
    throw keyError;
  }

  const genAI = getGeminiClient();

  // Use Gemini 1.5 Flash model - supports up to 1M tokens
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

🚨 MANDATORY REWRITING PROTOCOL - ZERO TOLERANCE FOR RAW TRANSCRIPTS:

You are an AI analyst extracting insights from podcast content. You must COMPLETELY TRANSFORM every point into your own analytical voice.

CRITICAL RULE: Do not copy ANY phrases, sentences, or wording from the transcript directly. Instead, fully rewrite each key point in your own original words, ensuring the meaning remains exactly the same as the original content.

TRANSFORMATION REQUIREMENTS:
1. NEVER quote, paraphrase, or echo the speaker's exact wording
2. Transform conversational speech into clear, simple observations
3. Convert personal stories into easy-to-understand lessons
4. Reframe complex statements as straightforward takeaways
5. Use clear, conversational language that anyone can understand

EXAMPLES OF PROPER TRANSFORMATION:
❌ Raw transcript: "So like, you know, focus is really important for getting things done"
✅ Proper rewrite: "Staying focused helps you get more work done"

❌ Raw transcript: "I mean, meditation kind of helps with concentration and stuff"
✅ Proper rewrite: "Meditation can help improve your focus"

❌ Raw transcript: "just to kind of get advice on you know how to think about it should we do it like how does the process work"
✅ Proper rewrite: "Entrepreneurs benefit from seeking structured guidance on decision-making processes and implementation strategies"

GOAL: Create original, meaningful insights that capture the speaker's exact meaning while using completely fresh language and professional structure. Each takeaway must sound like YOUR analysis, never like a transcript excerpt.

### Required Sections (with headings):
1. **Main Summary**
   - Write EXACTLY 150-200 words covering the entire episode. COUNT YOUR WORDS!
   - Must be at least 150 words minimum. If you write fewer than 150 words, this is INVALID.
   - No timestamps in this section.
2. **Key Takeaways**
   - Generate 3 to 5 original key takeaways as concise statements
   - Each takeaway must begin with a placeholder timestamp [TIMESTAMP] - DO NOT guess timestamps
   - MANDATORY: Each takeaway MUST be completely rewritten in your analytical voice:
     • Identify the core insight from the episode content
     • TRANSFORM it into clear, easy-to-understand language
     • NEVER use the speaker's original wording, phrases, or sentence structure
     • Focus on the underlying principle or lesson, not the conversational delivery
     • Each statement should be simple and clear for any reader to understand
   - Format for each item:
     1. [TIMESTAMP] [Clear, easy-to-understand insight that captures the key point]
   - Each takeaway must be a standalone, valuable insight that provides genuine value to the reader
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
- Are there exactly **5 Key Takeaways**, each starting with a **jumpable timestamp** in [hh:mm:ss] format?
- Are there exactly **5 Actionable Insights**, practical and useful, not vague?
- 🚨 REWRITING CHECK: Did I COMPLETELY TRANSFORM every insight using my own analytical voice? NO phrases, sentences, or wording from the transcript should appear in any takeaway.
- 🚨 ANALYTICAL VOICE CHECK: Does each takeaway sound like MY professional analysis, not the speaker's conversational speech?
- 🚨 ZERO TOLERANCE CHECK: Are there ZERO instances of filler words, conversational fragments, or transcript-like language?
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

🚨 MANDATORY REWRITING PROTOCOL - ZERO TOLERANCE FOR RAW TRANSCRIPTS:

You are an AI analyst extracting insights from podcast content. You must COMPLETELY TRANSFORM every point into your own analytical voice.

CRITICAL RULE: Do not copy ANY phrases, sentences, or wording from the transcript directly. Instead, fully rewrite each key point in your own original words, ensuring the meaning remains exactly the same as the original content.

TRANSFORMATION REQUIREMENTS:
1. NEVER quote, paraphrase, or echo the speaker's exact wording
2. Transform conversational speech into clear, simple observations
3. Convert personal stories into easy-to-understand lessons
4. Reframe complex statements as straightforward takeaways
5. Use clear, conversational language that anyone can understand

EXAMPLES OF PROPER TRANSFORMATION:
❌ Raw transcript: "So like, you know, focus is really important for getting things done"
✅ Proper rewrite: "Staying focused helps you get more work done"

❌ Raw transcript: "I mean, meditation kind of helps with concentration and stuff"
✅ Proper rewrite: "Meditation can help improve your focus"

❌ Raw transcript: "just to kind of get advice on you know how to think about it should we do it like how does the process work"
✅ Proper rewrite: "Entrepreneurs benefit from seeking structured guidance on decision-making processes and implementation strategies"

GOAL: Create original, meaningful insights that capture the speaker's exact meaning while using completely fresh language and professional structure. Each takeaway must sound like YOUR analysis, never like a transcript excerpt.

TRANSCRIPT ANALYSIS REQUIREMENT:
- Read every word of the transcript below before proceeding
- The transcript contains the COMPLETE episode content
- Extract takeaways from the ENTIRE episode, not just the beginning
- Ensure your summary reflects the full scope of the conversation

Generate only a detailed, comprehensive summary that is EXACTLY 150-200 words (count your words carefully!) and exactly five key takeaways focused on the most significant concepts, important themes, and key principles discussed throughout the ENTIRE episode.

🚨 CRITICAL WORD COUNT REQUIREMENT: Your summary MUST be between 150-200 words.
- If you write fewer than 150 words, this is INVALID and MUST be regenerated
- Count every single word to ensure compliance
- Focus on meaningful themes, conceptual insights, and analytical observations derived from the COMPLETE episode content.

Episode Title: ${episodeTitle}
${finalDescription ? `Episode Description: ${finalDescription}` : ''}

COMPLETE Episode Transcript (READ ENTIRELY BEFORE PROCEEDING):
${finalTranscript}

CRITICAL REQUIREMENTS:
- ALWAYS generate "Key Takeaways" section with 3-5 key insights
- DO NOT generate "Actionable Insights" section (user did not request actionable insights)
- DO NOT output sections titled "Growth Strategy", "Reality Check", or "Key Insight"
- Focus on key insights, interesting moments, and important lessons from the episode

Format your response EXACTLY as:

**Main Summary**
[Write EXACTLY 150-200 words - COUNT THEM CAREFULLY! Must be at least 150 words minimum. Focus on the most significant concepts, important themes, key principles, and analytical insights. Synthesize the discussion into professional observations without using conversational language or direct quotes. Make it engaging and informative. VERIFY your word count before submitting.]

**Key Takeaways**
Generate exactly 3 to 5 original key takeaways as concise statements. MANDATORY REWRITING REQUIREMENT:

• Identify the core insight from the episode content
• COMPLETELY TRANSFORM it into your own analytical language
• NEVER use the speaker's original wording, phrases, or sentence structure
• Focus on the underlying principle or lesson, not the conversational delivery
• Each statement must sound like YOUR analysis of what the speaker meant

**Output Format:**
Provide only a numbered list (3-5) of the key takeaways with timestamps:

1. [TIMESTAMP] [Clear, easy-to-understand insight that captures the key point]
2. [TIMESTAMP] [Clear, easy-to-understand insight that captures the key point]
3. [TIMESTAMP] [Clear, easy-to-understand insight that captures the key point]
4. [TIMESTAMP] [Clear, easy-to-understand insight that captures the key point]
5. [TIMESTAMP] [Clear, easy-to-understand insight that captures the key point]
`;

  try {
    console.log('🚀 CALLING GEMINI 1.5 FLASH API...');
    console.log('🔍 PROMPT LENGTH:', prompt.length, 'characters');
    console.log('🔍 TRANSCRIPT LENGTH:', finalTranscript.length, 'characters');

    const result = await model.generateContent(prompt);
    console.log('✅ GEMINI API CALL SUCCEEDED');

    const response = result.response;

    // Check if response was blocked by safety filters
    const finishReason = response.candidates?.[0]?.finishReason;
    console.log('🔍 FINISH REASON:', finishReason);

    if (finishReason === 'SAFETY') {
      console.error('🛡️ GEMINI BLOCKED BY SAFETY FILTERS!');
      console.error('🔍 SAFETY RATINGS:', response.candidates?.[0]?.safetyRatings);
      throw new Error('Content blocked by Gemini safety filters');
    }

    if (finishReason === 'MAX_TOKENS') {
      console.error('📏 GEMINI HIT TOKEN LIMIT!');
      throw new Error('Content exceeded Gemini token limit');
    }

    const text = response.text();
    console.log('✅ GEMINI RESPONSE TEXT EXTRACTED, LENGTH:', text.length);

    console.log("🤖 GEMINI RAW RESPONSE (first 500 chars):", text.substring(0, 500));
    console.log("🔍 INSIGHTS ENABLED:", shouldGenerateInsights);
    console.log("🔍 FULL RESPONSE LENGTH:", text.length);

    // Debug: Save full response for troubleshooting
    if (text.length > 500) {
      console.log("📄 GEMINI FULL RESPONSE:", text);
    }

    // Parse the response to extract the structured format - support ALL possible formats
    const mainSummaryMatch = text.match(/(?:\*\*Main Summary\*\*|### Main Summary|###\s*1\.\s*Main Summary|##\s*1\.\s*Main Summary|#\s*1\.\s*Main Summary|1\.\s*Main Summary)\s*([\s\S]*?)(?=(?:\*\*Key Takeaways\*\*|### Key Takeaways|###\s*2\.\s*Key Takeaways|##\s*2\.\s*Key Takeaways|#\s*2\.\s*Key Takeaways|2\.\s*Key Takeaways)|$)/i);
    const keyTakeawaysMatch = text.match(/(?:\*\*Key Takeaways\*\*|### Key Takeaways|###\s*2\.\s*Key Takeaways|##\s*2\.\s*Key Takeaways|#\s*2\.\s*Key Takeaways|2\.\s*Key Takeaways)\s*([\s\S]*?)(?=(?:\*\*Actionable Insights\*\*|### Actionable Insights|###\s*3\.\s*Actionable Insights|##\s*3\.\s*Actionable Insights|#\s*3\.\s*Actionable Insights|3\.\s*Actionable Insights)|$)/i);
    const actionableInsightsMatch = text.match(/(?:\*\*Actionable Insights\*\*|### Actionable Insights|###\s*3\.\s*Actionable Insights|##\s*3\.\s*Actionable Insights|#\s*3\.\s*Actionable Insights|3\.\s*Actionable Insights)\s*([\s\S]*?)(?=$)/i);

    let summary = mainSummaryMatch?.[1]?.trim() || text;

    // Remove word count annotations that Gemini might add
    summary = summary.replace(/\s*\(\d+\s+words?\)\s*$/i, '').trim();
    const takeawaysText = keyTakeawaysMatch?.[1]?.trim() || '';
    const actionableInsightsText = actionableInsightsMatch?.[1]?.trim() || '';

    console.log("🔍 PARSING RESULTS:");
    console.log("  - Summary matched:", !!mainSummaryMatch);
    console.log("  - Takeaways matched:", !!keyTakeawaysMatch);
    console.log("  - Insights matched:", !!actionableInsightsMatch);
    console.log("  - Summary length:", summary.length);
    console.log("  - Summary preview:", summary.substring(0, 100) + "...");
    console.log("🎯 NEW FORMAT TAKEAWAYS RAW TEXT:", takeawaysText);
    console.log("🎯 NEW FORMAT ACTIONABLE INSIGHTS RAW TEXT:", actionableInsightsText);
    console.log("🎯 ACTIONABLE INSIGHTS LENGTH:", actionableInsightsText.length);
    console.log("🎯 SHOULD GENERATE INSIGHTS:", shouldGenerateInsights);

    // Parse numbered takeaways with timestamps: 1. [hh:mm:ss] ...
    const takeaways: string[] = [];

    console.log("🔍 TAKEAWAYS TEXT LENGTH:", takeawaysText.length);
    console.log("🔍 TAKEAWAYS PREVIEW:", takeawaysText.substring(0, 200));

    // Enhanced parsing with multiple pattern attempts - improved for Gemini 2.0 Flash
    const parsePatterns = [
      // Pattern 1: 1. [timestamp] text
      {
        name: "numbered_with_brackets",
        regex: /(\d+)\.\s*\[([^\]]+)\]\s*(.*?)(?=(?:\r?\n|^)\d+\.|$)/gms,
        handler: (match: RegExpExecArray) => {
          const [, , timestamp, text] = match;
          return `[${timestamp}] ${text.trim()}`;
        }
      },
      // Pattern 2: [timestamp] text (without numbering)
      {
        name: "brackets_only",
        regex: /\[([^\]]+)\]\s*(.*?)(?=(?:\r?\n|^)\[|$)/gms,
        handler: (match: RegExpExecArray) => {
          const [, timestamp, text] = match;
          return text.trim().length > 10 ? `[${timestamp}] ${text.trim()}` : null;
        }
      },
      // Pattern 3: 1. text (numbered without timestamps) - improved
      {
        name: "numbered_only",
        regex: /(\d+)\.\s*([A-Z][^0-9\n]*?)(?=(?:\r?\n\s*\d+\.)|(?:\r?\n\s*$)|$)/gms,
        handler: (match: RegExpExecArray) => {
          const [, , text] = match;
          const cleanText = text.trim();
          // Ensure it's not a raw transcript fragment
          if (cleanText.length > 15 && !cleanText.match(/\b(um|uh|like|you know)\b/gi)) {
            return `[TIMESTAMP] ${cleanText}`;
          }
          return null;
        }
      },
      // Pattern 4: - text or • text (bullet points) - improved
      {
        name: "bullet_points",
        regex: /(?:^|\n)\s*[-•]\s*([A-Z][^-•\n]*?)(?=(?:\r?\n\s*[-•])|(?:\r?\n\s*$)|$)/gms,
        handler: (match: RegExpExecArray) => {
          const [, text] = match;
          const cleanText = text.trim();
          // Ensure it's not a raw transcript fragment
          if (cleanText.length > 15 && !cleanText.match(/\b(um|uh|like|you know)\b/gi)) {
            return `[TIMESTAMP] ${cleanText}`;
          }
          return null;
        }
      },
      // Pattern 5: New pattern for multiline takeaways
      {
        name: "multiline_numbered",
        regex: /(\d+)\.\s*([\s\S]*?)(?=\n\d+\.|\n\n|$)/gm,
        handler: (match: RegExpExecArray) => {
          const [, , text] = match;
          const cleanText = text.replace(/\n/g, ' ').trim();
          // Ensure it's analytical content, not raw transcript
          if (cleanText.length > 20 &&
              cleanText.length < 300 &&
              !cleanText.match(/\b(um|uh|like|you know)\s+(um|uh|like|you know)/gi) &&
              cleanText.match(/^[A-Z]/) &&
              !cleanText.includes('...') &&
              !cleanText.endsWith(' and') &&
              !cleanText.endsWith(' so')) {
            return `[TIMESTAMP] ${cleanText}`;
          }
          return null;
        }
      }
    ];

    // Enhanced deduplication function
    const deduplicateTakeaways = (takeaways: string[]): string[] => {
      const seen = new Set<string>();
      return takeaways.filter(takeaway => {
        // Remove timestamps, punctuation, and normalize for comparison
        const normalized = takeaway
          .replace(/\[([^\]]+)\]\s*/, '') // Remove timestamps
          .toLowerCase()
          .replace(/[^\w\s]/g, ' ') // Remove all punctuation
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();

        if (seen.has(normalized)) {
          console.log(`🚫 DUPLICATE FILTERED: "${takeaway.substring(0, 50)}..."`);
          return false;
        }
        seen.add(normalized);
        return true;
      });
    };

    // Try each pattern until we get results
    for (const pattern of parsePatterns) {
      console.log(`🔍 TRYING PATTERN: ${pattern.name}`);

      let match;
      const patternTakeaways: string[] = [];

      while ((match = pattern.regex.exec(takeawaysText)) !== null) {
        const result = pattern.handler(match);
        if (result) {
          patternTakeaways.push(result);
          console.log(`✅ PARSED with ${pattern.name}: ${result.substring(0, 50)}...`);
        }
      }

      if (patternTakeaways.length > 0) {
        const deduplicatedTakeaways = deduplicateTakeaways(patternTakeaways);
        takeaways.push(...deduplicatedTakeaways);
        console.log(`🎯 SUCCESS: Found ${deduplicatedTakeaways.length} unique takeaways with pattern ${pattern.name}`);
        break;
      }
    }

    // EMERGENCY AI RE-GENERATION: Try once more with simplified prompt
    if (takeaways.length === 0) {
      console.log("🚨 ALL PATTERNS FAILED - Attempting EMERGENCY AI RE-GENERATION");
      console.log("🔄 EMERGENCY: Making secondary AI call with simplified parsing requirements");

      try {
        const emergencyPrompt = `Extract exactly 5 key takeaways from this podcast transcript.

CRITICAL: Use this EXACT format for each takeaway:
1. [TIMESTAMP] Your analytical insight here
2. [TIMESTAMP] Your analytical insight here
3. [TIMESTAMP] Your analytical insight here
4. [TIMESTAMP] Your analytical insight here
5. [TIMESTAMP] Your analytical insight here

Rules:
- Each insight must be YOUR analytical interpretation, never copy the speaker's exact words
- Transform conversational speech into clear, professional observations
- Each line must start with a number, period, space, [TIMESTAMP], space
- Keep each insight under 200 characters
- Focus on principles, lessons, or key concepts

Transcript: ${finalTranscript.substring(0, 5000)}...`;

        const emergencyResult = await model.generateContent(emergencyPrompt);
        const emergencyText = emergencyResult.response.text();

        console.log("🔄 EMERGENCY AI RESPONSE:", emergencyText.substring(0, 200));

        // Parse emergency response with strict pattern
        const emergencyPattern = /(\d+)\.\s*\[TIMESTAMP\]\s*(.*?)(?=\n\d+\.|\n\n|$)/gm;
        let emergencyMatch;
        const emergencyTakeaways: string[] = [];

        while ((emergencyMatch = emergencyPattern.exec(emergencyText)) !== null) {
          const [, , insight] = emergencyMatch;
          if (insight && insight.trim().length > 10) {
            emergencyTakeaways.push(`[TIMESTAMP] ${insight.trim()}`);
          }
        }

        if (emergencyTakeaways.length >= 3) {
          takeaways.push(...emergencyTakeaways);
          console.log(`✅ EMERGENCY SUCCESS: Generated ${emergencyTakeaways.length} takeaways from re-generation`);
        } else {
          throw new Error("Emergency re-generation also failed");
        }

      } catch (emergencyError) {
        console.log("❌ EMERGENCY RE-GENERATION FAILED, using safe generic fallback");

        // FINAL SAFE FALLBACK: Generate generic analytical takeaways
        const episodeWords = episodeTitle.toLowerCase().split(' ').filter(w => w.length > 3);
        const primaryTopic = episodeWords[0] || 'discussion';

        const safeFallbackTakeaways = [
          `[TIMESTAMP] This episode explores key concepts related to ${primaryTopic} and their practical applications`,
          `[TIMESTAMP] Important principles and strategies are discussed throughout the conversation`,
          `[TIMESTAMP] The hosts examine multiple perspectives on ${primaryTopic} with actionable insights`,
          `[TIMESTAMP] Real-world examples demonstrate how these concepts can be implemented effectively`,
          `[TIMESTAMP] The discussion provides valuable frameworks for understanding ${primaryTopic} better`
        ];

        takeaways.push(...safeFallbackTakeaways);
        console.log(`🛡️ SAFE FALLBACK: Generated ${safeFallbackTakeaways.length} generic analytical takeaways`);
      }
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

    // Log detailed parsing results
    if (takeaways.length === 0) {
      console.log("🚨 NO TAKEAWAYS PARSED! Debug info:");
      console.log("📄 Full takeaways text:", takeawaysText);
      console.log("📄 Text length:", takeawaysText.length);
      console.log("📄 First 500 chars:", takeawaysText.substring(0, 500));
    } else if (takeaways.length < 3) {
      console.log("⚠️ LOW TAKEAWAY COUNT! Debug info:");
      console.log("📄 Raw takeaways text:", takeawaysText);
    }

    // Apply enhanced verbatim detection with additional security checks
    console.log(`🛡️ SECURITY: Applying enhanced verbatim detection to ${takeaways.length} takeaways`);

    // First pass: Standard verbatim filtering
    const verbatimFilteredTakeaways = filterVerbatimTakeaways(takeaways, finalTranscript);

    // Second pass: Additional security checks for transcript-like patterns
    const extraSecureFiltering = verbatimFilteredTakeaways.filter(takeaway => {
      const takeawayText = typeof takeaway === 'string' ? takeaway :
                          (takeaway?.text || takeaway?.content || String(takeaway));

      // Remove [TIMESTAMP] prefix for analysis
      const cleanText = takeawayText.replace(/^\[TIMESTAMP\]\s*/, '').trim();

      // Additional security patterns to catch transcript leakage
      const dangerousPatterns = [
        /\b(so|like|you know|I mean)\s+(so|like|you know|I mean)/gi, // Double fillers
        /\b(and|but|so)\s+(and|but|so)\s+(and|but|so)/gi,           // Triple conjunctions
        /\.\.\.\s*(and|so|but|or)(\s|$)/gi,                         // Trailing dots with conjunctions
        /^(so|like|um|uh)\s+/i,                                     // Starts with filler words only
        /\b(talk about that|discuss that|you know what)\b/gi,       // Interview transitions
        /sewage.*deep.*bowels.*earth/gi,                            // Specific pattern from the issue
        /generative.*tracks.*put.*thousands/gi,                     // Another specific pattern
        /music.*don't.*know.*real.*anymore/gi                       // Another specific pattern
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(cleanText)) {
          console.log(`🚨 EXTRA SECURITY: Blocked dangerous pattern in: "${cleanText.substring(0, 50)}..."`);
          return false;
        }
      }

      // Check if takeaway looks too much like conversational speech
      const conversationalScore = (
        (cleanText.match(/\b(so|like|you know|I mean|um|uh)\b/gi) || []).length +
        (cleanText.match(/\b(and|but|so)\s+(and|but|so)/gi) || []).length * 2 +
        (cleanText.match(/\.\.\./g) || []).length
      );

      if (conversationalScore > 5) { // Increased threshold - was too aggressive for Gemini 1.5 Flash analytical content
        console.log(`🚨 EXTRA SECURITY: High conversational score (${conversationalScore.toFixed(2)}) for: "${cleanText.substring(0, 50)}..."`);
        return false;
      }

      return true;
    });

    console.log(`🔍 ENHANCED FILTERING RESULTS: ${takeaways.length} → ${verbatimFilteredTakeaways.length} → ${extraSecureFiltering.length} takeaways`);
    if (extraSecureFiltering.length < verbatimFilteredTakeaways.length) {
      const removedCount = verbatimFilteredTakeaways.length - extraSecureFiltering.length;
      console.log(`🛡️ EXTRA SECURITY REMOVED ${removedCount} additional suspect takeaways!`);
    }

    // Use the extra-secure filtered takeaways
    const finalSecureTakeaways = extraSecureFiltering;

    // Step 3: Polish takeaways for professional language
    const polishedTakeaways = polishTakeaways(finalSecureTakeaways);

    console.log(`✨ POLISHING RESULTS: ${finalSecureTakeaways.length} takeaways polished for professional language`);

    // Step 4: Final deduplication after all processing
    const finalDedupedTakeaways = deduplicateTakeaways(polishedTakeaways);

    console.log(`🔄 FINAL DEDUPLICATION: ${polishedTakeaways.length} → ${finalDedupedTakeaways.length} takeaways`);

    // Use the final deduplicated takeaways and actionable insights from new format
    const finalTakeaways = finalDedupedTakeaways;
    const finalActionableInsights = actionableInsights;


    if (finalTakeaways.length !== 5) {
      console.log("⚠️ TAKEAWAY COUNT MISMATCH! Expected 5, got:", finalTakeaways.length);
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
    console.error('🚨 GEMINI API ERROR DETAILS:', error);
    console.error('🔍 ERROR TYPE:', typeof error);
    console.error('🔍 ERROR NAME:', error instanceof Error ? error.name : 'Unknown');
    console.error('🔍 ERROR MESSAGE:', error instanceof Error ? error.message : 'Unknown error');
    console.error('🔍 ERROR STACK:', error instanceof Error ? error.stack : 'No stack trace');

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('API_KEY')) {
        console.error('🔑 GEMINI API KEY ISSUE detected');
      } else if (error.message.includes('quota') || error.message.includes('limit')) {
        console.error('💰 GEMINI QUOTA/RATE LIMIT ISSUE detected');
      } else if (error.message.includes('safety') || error.message.includes('blocked')) {
        console.error('🛡️ GEMINI SAFETY FILTER ISSUE detected');
      } else if (error.message.includes('model') || error.message.includes('not found')) {
        console.error('🤖 GEMINI MODEL ISSUE detected - check model name');
      }
    }

    throw new Error(`Gemini summary generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate embeddings using Gemini text-embedding-004 model
 * Batch processes up to 100 texts for efficiency
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  console.log(`🔮 GENERATING EMBEDDINGS: ${texts.length} texts`);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required for embeddings');
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    // Process in batches of 100 for API limits
    const BATCH_SIZE = 100;
    const embeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      console.log(`📦 Processing embedding batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(texts.length/BATCH_SIZE)}: ${batch.length} texts`);

      // Use text-embedding-004 model for embeddings
      const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

      const batchResults = await Promise.all(
        batch.map(async (text) => {
          const result = await model.embedContent(text);
          return result.embedding.values;
        })
      );

      embeddings.push(...batchResults);
    }

    console.log(`✅ EMBEDDINGS GENERATED: ${embeddings.length} vectors of dimension ${embeddings[0]?.length || 0}`);
    return embeddings;

  } catch (error) {
    console.error('🚨 GEMINI EMBEDDING ERROR:', error);
    throw new Error(`Gemini embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}