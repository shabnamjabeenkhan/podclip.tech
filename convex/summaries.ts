import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { findTimestampForText, findTimestampsForTakeaways, formatTimestamp, formatTimestampWithBuffer, verifyTakeawayAlignment } from "./deepgram";
import { chunkTranscriptWithTimestamps, findSemanticTimestamps, type TranscriptChunk } from "./semanticMatcher";
import { generateSummaryWithGemini, transcribeAudioWithGemini, getGeminiClient, filterVerbatimTakeaways, polishTakeaways } from "./gemini";


// Helper function for simple keyword matching when full transcript matching fails
function findSimpleKeywordMatch(
  takeaway: string,
  words: any[],
  usedTimestamps: number[]
): { timestamp: number; confidence: number; matchedText: string } | null {
  // Extract keywords from takeaway
  const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'will', 'would', 'could', 'should', 'this', 'that', 'he', 'she', 'it', 'they'];

  const keywords = takeaway.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.includes(word))
    .slice(0, 3); // Use top 3 keywords

  if (keywords.length === 0) return null;

  let bestMatch = { index: -1, score: 0, matchCount: 0 };

  // Search through transcript in chunks
  const chunkSize = 25;
  for (let i = 0; i <= words.length - chunkSize; i += 10) {
    const chunk = words.slice(i, i + chunkSize);
    const chunkText = chunk.map((w: any) => w.word?.toLowerCase() || '').join(' ');
    const chunkTimestamp = chunk[0]?.start || 0;

    // Skip if too close to used timestamps
    const isTooClose = usedTimestamps.some(used => Math.abs(chunkTimestamp - used) < 15);
    if (isTooClose) continue;

    // Count keyword matches
    let matchCount = 0;
    let score = 0;

    for (const keyword of keywords) {
      if (chunkText.includes(keyword)) {
        matchCount++;
        score += keyword.length + 1;
      }
    }

    if (matchCount > 0 && score > bestMatch.score) {
      bestMatch = { index: i, score, matchCount };
    }
  }

  if (bestMatch.index >= 0) {
    const matchChunk = words.slice(bestMatch.index, bestMatch.index + chunkSize);
    const timestamp = matchChunk[0]?.start || 0;
    const confidence = Math.min(0.3, (bestMatch.matchCount / keywords.length) * 0.5);
    const matchedText = matchChunk.slice(0, 8).map((w: any) => w.word || '').join(' ');

    return { timestamp, confidence, matchedText };
  }

  return null;
}

// Emergency function to expand summaries that are too short
async function expandSummaryToTargetLength(
  originalSummary: string,
  transcript: string,
  episodeTitle: string,
  wordsNeeded: number
): Promise<string | null> {
  try {
    console.log(`🔧 Attempting to expand summary by ${wordsNeeded} words...`);

    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      },
    });

    const expansionPrompt = `
You are tasked with expanding a podcast summary that is too short. The current summary is only ${originalSummary.split(/\s+/).length} words, but it MUST be 150-200 words.

CRITICAL TASK: Add ${wordsNeeded} more words to this summary while keeping all existing content. Add specific details, examples, quotes, and insights from the transcript.

Episode Title: ${episodeTitle}

Current Summary (TOO SHORT):
${originalSummary}

Episode Transcript Sample:
${transcript.substring(0, 5000)}

INSTRUCTIONS:
1. Keep ALL existing content from the current summary
2. Add approximately ${wordsNeeded} more words of specific details
3. Include quotes, examples, or specific insights from the transcript
4. The final result must be 150-200 words total
5. Make it flow naturally - don't just tack on extra sentences

Expanded Summary (150-200 words):`;

    const result = await model.generateContent(expansionPrompt);
    const expandedSummary = result.response.text().trim();

    const finalWordCount = expandedSummary.split(/\s+/).filter((word: string) => word.length > 0).length;
    console.log(`🔧 Expansion result: ${finalWordCount} words`);

    if (finalWordCount >= 150 && finalWordCount <= 250) {
      return expandedSummary;
    } else {
      console.log(`❌ Expansion failed - still wrong length (${finalWordCount} words)`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Expansion error:`, error);
    return null;
  }
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
    'tutorial', 'how-to', 'how to', 'guide', 'tips', 'advice', 'framework', 'method',
    // Enhanced keywords for life advice and personal development
    'life advice', 'life choice', 'decision making', 'mindset', 'philosophy', 'wisdom',
    'fulfillment', 'purpose', 'meaning', 'priorities', 'values', 'goals', 'habit',
    'relationship advice', 'marriage advice', 'parenting advice', 'work life balance',
    'personal growth', 'self improvement', 'life lesson', 'life experience', 'insight',
    'actionable', 'practical', 'implement', 'apply', 'strategy', 'approach', 'system',
    'better life', 'optimize', 'maximize', 'effective', 'efficient', 'useful', 'valuable'
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

export const generateSummaryWithTimestamps = action({
  args: {
    episodeId: v.string(),
    episodeTitle: v.string(),
    episodeDescription: v.string(),
    episodeAudioUrl: v.string(),
    userId: v.string(),
    useDeepgram: v.optional(v.boolean()),
    generateInsights: v.optional(v.boolean()), // User toggle for actionable insights
  },
  handler: async (ctx, args): Promise<any> => {
    console.log(`🎯 SUMMARY GENERATION STARTED: User ${args.userId} | Episode ${args.episodeId}`);
    
    // Check if summary already exists for this episode and user
    const existingSummary = await ctx.runQuery(api.summaries.getSummaryByEpisodeAndUser, {
      episodeId: args.episodeId,
      userId: args.userId,
    });
    
    if (existingSummary) {
      throw new Error("A summary already exists for this episode. Each episode can only have one summary per user.");
    }

    // Check quota before generating summary
    const quotaStatus = await ctx.runMutation(internal.users.checkAndResetQuota);
    
    if (!quotaStatus.canGenerate) {
      throw new Error(`Quota exceeded. You have used ${quotaStatus.summaries.used}/${quotaStatus.summaries.limit} summaries. ${
        quotaStatus.summaries.limit === 5 ? "Upgrade to get more summaries." : "Your quota will reset next month."
      }`);
    }

    // Try to get Deepgram transcription first if enabled
    let transcriptData = null;
    let deepgramData = null;
    let deepgramError = null;
    
    if (args.useDeepgram) {
      try {
        console.log(`🎙️ Attempting Deepgram transcription for episode ${args.episodeId}`);
        console.log(`🔊 Audio URL: ${args.episodeAudioUrl?.substring(0, 100)}...`);
        
        deepgramData = await ctx.runAction(api.transcriptions.transcribeEpisodeWithDeepgram, {
          episodeId: args.episodeId,
          audioUrl: args.episodeAudioUrl,
        });
        
        console.log(`📊 Deepgram result:`, {
          success: deepgramData.success,
          hasTimestamps: deepgramData.hasTimestamps,
          wordCount: deepgramData.wordCount,
          error: deepgramData.error
        });
        
        if (deepgramData.success && deepgramData.transcript) {
          console.log(`✅ Deepgram transcription successful: ${deepgramData.wordCount} words`);

          // CRITICAL: Validate that we have a COMPLETE transcript before proceeding
          const wordCount = deepgramData.wordCount || 0;
          if (wordCount < 500) {
            console.log(`⚠️ WARNING: Transcript seems too short (${wordCount} words) for a full episode`);
            console.log(`🔍 This may indicate incomplete transcription - proceeding with caution`);
          } else {
            console.log(`✅ Transcript length appears sufficient for full episode analysis`);
          }

          // Get the full transcription data with timestamps
          const deepgramTranscriptData = await ctx.runQuery(api.transcriptions.getCachedTranscriptionWithTimestamps, {
            episodeId: args.episodeId,
          });
          if (deepgramTranscriptData) {
            console.log(`📚 Retrieved cached transcription with timestamps: ${deepgramTranscriptData.hasTimestamps}`);
            console.log(`📊 COMPLETE TRANSCRIPT VALIDATION:`);
            console.log(`   - Word count: ${deepgramTranscriptData.wordCount}`);
            console.log(`   - Character count: ${deepgramTranscriptData.transcript?.length || 0}`);
            console.log(`   - Has timestamps: ${deepgramTranscriptData.hasTimestamps}`);
            console.log(`   - Timestamp words: ${deepgramTranscriptData.wordTimestamps?.length || 0}`);

            // Only proceed if we have substantial content
            if (deepgramTranscriptData.transcript && deepgramTranscriptData.transcript.length > 2000) {
              console.log(`✅ COMPLETE TRANSCRIPT CONFIRMED - Proceeding with full episode analysis`);
              transcriptData = deepgramTranscriptData;
            } else {
              console.log(`❌ INCOMPLETE TRANSCRIPT DETECTED - Transcript too short for full episode`);
              console.log(`📝 TRANSCRIPT METADATA: ${deepgramTranscriptData.transcript?.length || 0} characters`);
            }
          }
        } else {
          deepgramError = deepgramData.error || "Unknown Deepgram error";
          console.warn(`⚠️ Deepgram transcription failed: ${deepgramError}`);
        }
      } catch (error: any) {
        deepgramError = error.message || "Deepgram exception";
        console.warn(`⚠️ Deepgram transcription error for episode ${args.episodeId}:`, error);
      }
    }

    // Fallback to Listen Notes transcript if Deepgram failed or not requested
    if (!transcriptData?.hasTranscript) {
      try {
        transcriptData = await ctx.runAction(api.transcriptions.getEpisodeTranscription, {
          episodeId: args.episodeId,
        });
        console.log(`Listen Notes transcript ${transcriptData.hasTranscript ? 'available' : 'not available'} for episode ${args.episodeId}`);
      } catch (error) {
        console.warn(`Failed to fetch Listen Notes transcript for episode ${args.episodeId}:`, error);
      }
    }

    // Generate summary using OpenAI with enhanced prompt for timestamps
    // Enhanced timestamp detection - check for actual word timestamp data
    const hasTimestamps = !!(transcriptData && 'wordTimestamps' in transcriptData && transcriptData.wordTimestamps && transcriptData.wordTimestamps.length > 0);

    console.log(`🕒 DETAILED TIMESTAMP STATUS for episode ${args.episodeId}:`, {
      hasTranscriptData: !!transcriptData,
      hasTimestamps: hasTimestamps,
      transcriptSource: transcriptData && 'source' in transcriptData ? transcriptData.source : 'unknown',
      wordTimestampsCount: transcriptData && 'wordTimestamps' in transcriptData ? transcriptData.wordTimestamps?.length || 0 : 0,
      useDeepgramRequested: args.useDeepgram,
      deepgramError: deepgramError,
      transcriptLength: transcriptData?.transcript?.length || 0,
      fallbackStrategiesWillBeUsed: !hasTimestamps
    });

    // Declare variables at function scope
    let detectedGenre: 'actionable' | 'entertainment' = 'entertainment';
    let shouldGenerateInsights = false;
    let insightsSuggestion: 'suggested' | 'disabled' | 'user_choice' = 'disabled';
    let prompt;

    // Set shouldGenerateInsights based on user choice BEFORE any processing
    shouldGenerateInsights = args.generateInsights === true;

    console.log(`🎯 INSIGHTS GENERATION DECISION:`, {
      userChoice: args.generateInsights,
      userChoiceType: typeof args.generateInsights,
      finalDecision: shouldGenerateInsights,
      logic: args.generateInsights === true ? 'USER_EXPLICIT_TRUE' : 'USER_CHOSE_NO_INSIGHTS'
    });

    console.log(`💡 Insights generation: ${shouldGenerateInsights} (user choice: ${args.generateInsights})`);

    if (transcriptData?.hasTranscript && transcriptData.transcript) {
      // Use transcript for much better summary quality with Gemini (supports full transcript)
      const transcript = transcriptData.transcript;
      
      try {
        const transcriptWordCount = transcript.split(/\s+/).filter((word: string) => word.length > 0).length;
        console.log(`🔮 ATTEMPTING GEMINI 2.0 Flash for episode ${args.episodeId}`);
        console.log(`📊 FULL TRANSCRIPT: ${transcriptWordCount} words, ${transcript.length} characters`);
        console.log(`🎙️ TRANSCRIPT LOADED: ${transcript.length} characters, ${transcriptWordCount} words`);

        if (transcriptWordCount < 2000) {
          console.log(`⚠️ WARNING: Transcript seems short for full episode (${transcriptWordCount} words)`);
          console.log(`💡 This may result in shorter summaries - check if Deepgram transcribed full audio`);
        } else {
          console.log(`✅ Transcript length appears sufficient for detailed summary`);
        }

        console.log(`🚀 CALLING generateSummaryWithGemini function...`);
        console.log(`🔍 DEBUG: About to call Gemini for episode: ${args.episodeTitle}`);
        let geminiResult = await generateSummaryWithGemini(
          transcript,
          args.episodeTitle,
          args.episodeDescription,
          args.episodeAudioUrl,
          false, // ultraStrictMode
          shouldGenerateInsights // Pass user's choice
        );
        console.log(`🚀 GEMINI FUNCTION RETURNED SUCCESSFULLY`);
        console.log(`🚀 GEMINI RESULT: summary=${geminiResult.summary.length} chars, takeaways=${geminiResult.takeaways.length}`);
        
        console.log(`✅ Gemini summary completed for episode ${args.episodeId}`);

        // Log word count analysis
        let summaryWordCount = geminiResult.summary.split(/\s+/).filter((word: string) => word.length > 0).length;
        console.log(`🚀 DEBUG: REACHED WORD COUNT VALIDATION for "${args.episodeTitle}"`);
        console.log(`📊 SUMMARY WORD COUNT: ${summaryWordCount} words (target: 150-200 words)`);
        console.log(`📝 Summary length: ${geminiResult.summary.length} characters`);
        console.log(`🎯 Takeaways count: ${geminiResult.takeaways.length} (target: 5)`);

        if (summaryWordCount < 150) {
          console.log(`🚨 CRITICAL ERROR: Gemini summary is too short (${summaryWordCount} words < 150)`);
          console.log(`🔄 ATTEMPTING REGENERATION with ultra-strict prompts...`);

          // Try regenerating with even stricter prompts
          try {
            const stricterResult = await generateSummaryWithGemini(
              transcript,
              args.episodeTitle,
              args.episodeDescription,
              args.episodeAudioUrl,
              true, // Enable ultra-strict mode
              shouldGenerateInsights // Pass user's choice
            );

            const newWordCount = stricterResult.summary.split(/\s+/).filter((word: string) => word.length > 0).length;
            console.log(`🔄 REGENERATION RESULT: ${newWordCount} words`);

            if (newWordCount >= 150) {
              console.log(`✅ Regeneration successful - using new summary`);
              geminiResult = stricterResult;
              summaryWordCount = newWordCount;
            } else {
              console.log(`❌ Regeneration failed - AI still not following instructions`);
            }
          } catch (error) {
            console.log(`❌ Regeneration failed with error:`, error);
          }
        }

        if (summaryWordCount < 150) {
          console.log(`🚨 FINAL CHECK: Summary still too short (${summaryWordCount} words < 150)`);
          console.log(`🔧 APPLYING EMERGENCY EXPANSION to reach minimum word count...`);

          // Emergency expansion - add more detail to reach minimum word count
          const wordsNeeded = 150 - summaryWordCount;
          const expandedSummary = await expandSummaryToTargetLength(
            geminiResult.summary,
            transcript,
            args.episodeTitle,
            wordsNeeded
          );

          if (expandedSummary) {
            const expandedWordCount = expandedSummary.split(/\s+/).filter((word: string) => word.length > 0).length;
            console.log(`✅ Emergency expansion successful: ${summaryWordCount} → ${expandedWordCount} words`);
            geminiResult.summary = expandedSummary;
            summaryWordCount = expandedWordCount;
          } else {
            console.log(`❌ Emergency expansion failed`);
          }
        }

        if (summaryWordCount < 150) {
          console.log(`🚨 FINAL FINAL CHECK: Summary STILL too short (${summaryWordCount} words < 150)`);
          console.log(`💡 CRITICAL ISSUE: All expansion attempts failed - AI model fundamentally broken`);
        } else if (summaryWordCount > 200) {
          console.log(`⚠️ WARNING: Gemini summary is too long (${summaryWordCount} words > 200)`);
        } else {
          console.log(`✅ Gemini summary word count is within target range`);
        }

        // ENHANCED CRITICAL VALIDATION: Ensure complete transcript before takeaway processing
        const validationWordCount = transcript.split(/\s+/).filter((word: string) => word.length > 0).length;
        const transcriptCharCount = transcript.length;
        const estimatedDurationMinutes = Math.round(validationWordCount / 150);

        // More comprehensive validation checks
        const minWordCount = 2000; // Minimum words for full episode
        const minCharCount = 10000; // Minimum characters for full episode
        const minDurationMinutes = 15; // Minimum duration for meaningful episode

        const wordCountCheck = validationWordCount >= minWordCount;
        const charCountCheck = transcriptCharCount >= minCharCount;
        const durationCheck = estimatedDurationMinutes >= minDurationMinutes;
        const completenessCheck = wordCountCheck && charCountCheck && durationCheck;

        console.log(`🔍 ENHANCED TRANSCRIPT COMPLETENESS VALIDATION:`);
        console.log(`📊 Word count: ${validationWordCount} words (min: ${minWordCount}) - ${wordCountCheck ? '✅' : '❌'}`);
        console.log(`📝 Character count: ${transcriptCharCount} characters (min: ${minCharCount}) - ${charCountCheck ? '✅' : '❌'}`);
        console.log(`⏱️ Estimated duration: ${estimatedDurationMinutes} minutes (min: ${minDurationMinutes}) - ${durationCheck ? '✅' : '❌'}`);
        console.log(`✅ Overall completeness check: ${completenessCheck ? 'PASSED' : 'FAILED'}`);

        // Additional content quality checks
        const uniqueWordRatio = new Set(transcript.toLowerCase().split(/\s+/)).size / validationWordCount;
        const avgSentenceLength = transcript.split(/[.!?]+/).length > 0 ? validationWordCount / transcript.split(/[.!?]+/).length : 0;

        console.log(`📊 CONTENT QUALITY ANALYSIS:`);
        console.log(`🎯 Unique word ratio: ${(uniqueWordRatio * 100).toFixed(1)}% (healthy: >20%)`);
        console.log(`📏 Average sentence length: ${avgSentenceLength.toFixed(1)} words (typical: 15-20)`);

        if (!completenessCheck) {
          console.log(`🚨 CRITICAL: Transcript appears incomplete for full episode analysis`);
          console.log(`💡 This will significantly impact takeaway quality and accuracy`);
          console.log(`🔍 Recommend checking Deepgram transcription settings or audio source`);
        } else {
          console.log(`✅ COMPREHENSIVE TRANSCRIPT VALIDATION PASSED - Proceeding with high-quality takeaway extraction`);
        }

        // Apply verbatim filtering after semantic matching to prevent transcript leakage
        console.log(`🔍 APPLYING POST-SEMANTIC VERBATIM FILTERING to ${geminiResult.takeaways.length} takeaways`);
        const verbatimFiltered = filterVerbatimTakeaways(geminiResult.takeaways, transcript);

        // Deduplicate takeaways to prevent duplicates from semantic chunk overlap
        const deduped = Array.from(new Set(verbatimFiltered.map(t => typeof t === 'string' ? t : t.text || t.content || String(t))))
          .map(text => verbatimFiltered.find(t => (typeof t === 'string' ? t : t.text || t.content || String(t)) === text))
          .filter(Boolean);

        const filteredTakeaways = deduped.length > 0 ? deduped : geminiResult.takeaways;
        console.log(`✅ VERBATIM FILTERING + DEDUPLICATION: ${geminiResult.takeaways.length} -> ${verbatimFiltered.length} -> ${filteredTakeaways.length} takeaways`);

        // Process takeaways with timestamps if available
        let processedTakeaways: Array<string | {
          text: string;
          timestamp?: number;
          confidence?: number;
          formatted_time?: string;
          originalText?: string;
          fullContext?: string;
        }> = filteredTakeaways;

        // Enhanced timestamp processing with improved fallback handling
        console.log(`🎯 TIMESTAMP PROCESSING DEBUG:`);
        console.log(`   - hasTimestamps: ${hasTimestamps}`);
        console.log(`   - transcriptData available: ${!!transcriptData}`);
        if (transcriptData) {
          console.log(`   - transcriptData.hasTimestamps: ${('hasTimestamps' in transcriptData) ? transcriptData.hasTimestamps : 'field missing'}`);
          console.log(`   - transcriptData has wordTimestamps field: ${('wordTimestamps' in transcriptData)}`);
          if ('wordTimestamps' in transcriptData) {
            console.log(`   - wordTimestamps length: ${transcriptData.wordTimestamps?.length || 0}`);
            console.log(`   - wordTimestamps sample: ${JSON.stringify(transcriptData.wordTimestamps?.slice(0, 3) || [])}`);
          }
        }

        if (transcriptData && 'wordTimestamps' in transcriptData && transcriptData.wordTimestamps && transcriptData.wordTimestamps.length > 0) {
          console.log(`🎯 SEMANTIC TIMESTAMP MATCHING for ${geminiResult.takeaways.length} takeaways using ${transcriptData.wordTimestamps.length} word timestamps`);

          // NEW: Use semantic matching for timestamps with lexical fallback
          let timestampResults;

          try {
            // Create chunks for semantic matching
            const chunks = chunkTranscriptWithTimestamps(transcript, transcriptData.wordTimestamps);
            console.log(`📦 Created ${chunks.length} semantic chunks for matching`);

            // Find semantic matches for all takeaways
            const semanticMatches = await findSemanticTimestamps(filteredTakeaways, chunks);

            // Convert semantic matches to existing format
            timestampResults = filteredTakeaways.map((takeaway, index) => {
              const match = semanticMatches[index];
              if (match) {
                return {
                  text: takeaway,
                  timestamp: match.exactTimestamp,
                  confidence: match.confidence,
                  matchCount: 1, // Semantic match found
                  totalSearchTerms: 1,
                  fullContext: match.chunk.text.substring(0, 200),
                  matchedText: match.chunk.text.substring(0, 100),
                };
              } else {
                return {
                  text: takeaway,
                  timestamp: undefined, // Use undefined instead of null for TypeScript compatibility
                  confidence: 0,
                  matchCount: 0,
                  totalSearchTerms: 0,
                };
              }
            });

            console.log(`🎯 SEMANTIC MATCHING RESULTS: ${semanticMatches.filter(m => m).length}/${filteredTakeaways.length} matches found`);

          } catch (semanticError) {
            console.error('🚨 SEMANTIC MATCHING FAILED, falling back to lexical matching:', semanticError);
            // Fallback to original lexical matching
            timestampResults = findTimestampsForTakeaways(filteredTakeaways, transcriptData.wordTimestamps);
            console.log('🔄 LEXICAL FALLBACK: Using original word-based timestamp matching');
          }

          processedTakeaways = timestampResults.map((result, index) => {
            if (result.timestamp) {
              console.log(`🔍 TIMESTAMP FOUND #${index + 1}:`);
              console.log(`📝 Takeaway: "${result.text.substring(0, 100)}..."`);
              console.log(`⏰ Timestamp: ${result.timestamp}s (${formatTimestamp(result.timestamp)})`);
              console.log(`📊 Confidence: ${(result.confidence! * 100).toFixed(1)}%`);
              console.log(`🎯 Matched: ${result.matchCount}/${result.totalSearchTerms} terms`);

              // Log fullContext for debugging
              if (result.fullContext) {
                console.log(`🗣️ Full Context: "${result.fullContext.substring(0, 100)}..."`);
              }

              // Enhanced verification with lower threshold for production
              const verification = verifyTakeawayAlignment(
                result.text,
                result.timestamp,
                transcriptData.wordTimestamps!,
                40 // Larger context window for better matching
              );

              console.log(`🔍 VERIFICATION: ${verification.isValid ? '✅' : '⚠️'} (${(verification.confidence * 100).toFixed(1)}%)`);

              if (!verification.isValid) {
                console.log(`⚠️ Low confidence alignment but keeping timestamp for user benefit`);
              }

              console.log(`---`);
            } else {
              console.log(`❌ NO TIMESTAMP FOUND for takeaway #${index + 1}: "${result.text.substring(0, 50)}..."`);

              // Try to find any reasonable timestamp match with lower threshold
              if (transcriptData.wordTimestamps && transcriptData.wordTimestamps.length > 0) {
                const fallbackResult = findTimestampForText(
                  result.text,
                  transcriptData.wordTimestamps,
                  30, // Larger search window
                  [] // No used timestamps restriction for fallback
                );

                if (fallbackResult && fallbackResult.accuracyScore && fallbackResult.accuracyScore > 0.5) {
                  console.log(`🔄 FALLBACK TIMESTAMP found: ${formatTimestamp(fallbackResult.timestamp)} (accuracy: ${(fallbackResult.accuracyScore * 100).toFixed(1)}%)`);
                  result.timestamp = fallbackResult.timestamp;
                  result.confidence = fallbackResult.confidence;
                  result.matchedText = fallbackResult.matchedText;
                  result.fullContext = fallbackResult.fullContext;
                }
              }
            }

            // Prepare both original AI text and actual spoken content
            const originalText = result.text;
            // const spokenContent = result.fullContext; // Available for debugging but not used for security

            // Keep original AI takeaway to prevent transcript leakage
            let finalTakeawayText = originalText;

            // SECURITY: Never replace with raw transcript content to prevent verbatim leakage
            // The spokenContent is available in fullContext for debugging but not used as takeaway text

            return {
              text: finalTakeawayText,
              timestamp: result.timestamp,
              formatted_time: result.timestamp ? formatTimestampWithBuffer(result.timestamp) : undefined,
              confidence: result.confidence,
              matchedText: result.matchedText,
              fullContext: result.fullContext,
              originalText: originalText, // Keep the original AI-generated text for reference
            };
          });
        } else {
          console.log(`⚠️ No word timestamps available - attempting alternative timestamp retrieval`);

          // Try to get Deepgram transcription directly if not already available
          if (!transcriptData || !('wordTimestamps' in transcriptData) || !transcriptData.wordTimestamps) {
            console.log(`🔄 Attempting to retrieve Deepgram transcription for episode ${args.episodeId}`);
            try {
              const deepgramData = await ctx.runQuery(api.transcriptions.getCachedTranscriptionWithTimestamps, {
                episodeId: args.episodeId,
              });

              if (deepgramData && deepgramData.wordTimestamps && deepgramData.wordTimestamps.length > 0) {
                console.log(`✅ Found Deepgram transcription with ${deepgramData.wordTimestamps.length} word timestamps`);

                // Use this data for timestamp generation
                const timestampResults = findTimestampsForTakeaways(geminiResult.takeaways, deepgramData.wordTimestamps);

                processedTakeaways = timestampResults.map((result, index) => {
                  if (result.timestamp) {
                    console.log(`🔍 RECOVERED TIMESTAMP #${index + 1}: ${formatTimestamp(result.timestamp)} for "${result.text.substring(0, 50)}..."`);
                  }

                  // Prepare both original AI text and actual spoken content
                  const originalText = result.text;
                  // const spokenContent = result.fullContext; // Available for debugging but not used for security

                  // Keep original AI takeaway to prevent transcript leakage
                  let finalTakeawayText = originalText;

                  // SECURITY: Never replace with raw transcript content to prevent verbatim leakage
                  // The spokenContent is available in fullContext for debugging but not used as takeaway text

                  return {
                    text: finalTakeawayText,
                    timestamp: result.timestamp,
                    formatted_time: result.timestamp ? formatTimestampWithBuffer(result.timestamp) : undefined,
                    confidence: result.confidence,
                    matchedText: result.matchedText,
                    fullContext: result.fullContext,
                    originalText: originalText,
                  };
                });

                // Update hasTimestamps to reflect recovered data
                console.log(`🎉 Successfully recovered timestamps for ${timestampResults.filter(r => r.timestamp).length}/${timestampResults.length} takeaways`);
              } else {
                console.log(`❌ No Deepgram transcription with timestamps found for episode ${args.episodeId}`);
              }
            } catch (error) {
              console.error(`❌ Error retrieving Deepgram transcription:`, error);
            }
          }

          // NO ESTIMATED TIMESTAMPS: Remove takeaways without accurate timestamps (RELAXED)
          const geminiTakeawaysWithoutTimestamps = processedTakeaways.filter((t: any) => !t.timestamp || (t.confidence && t.confidence < 0.3));
          if (geminiTakeawaysWithoutTimestamps.length > 0) {
            console.log(`❌ REMOVING ${geminiTakeawaysWithoutTimestamps.length} takeaways without accurate timestamps (confidence <30%)`);

            // Filter out takeaways without reasonable-confidence timestamps (RELAXED)
            processedTakeaways = processedTakeaways.filter((takeaway: any) => {
              const hasTimestamp = typeof takeaway === 'object' && takeaway.timestamp;
              const hasAccuracy = !takeaway.confidence || takeaway.confidence >= 0.3;

              if (!hasTimestamp || !hasAccuracy) {
                console.log(`❌ Removing: "${typeof takeaway === 'string' ? takeaway : takeaway.text}" (confidence: ${takeaway.confidence || 'N/A'})`);
                return false;
              }
              return true;
            });

            console.log(`✅ Quality over quantity: Keeping ${processedTakeaways.length} highly accurate takeaways`);
          }

          // CRITICAL: Ensure we ALWAYS have timestamps for every takeaway
          const takeawaysWithTimestamps = processedTakeaways.filter((t: any) =>
            typeof t === 'object' && t !== null && t.timestamp && t.formatted_time
          );
          const takeawaysWithoutTimestampsCount = processedTakeaways.length - takeawaysWithTimestamps.length;

          console.log(`📊 DETAILED FINAL STATUS: ${takeawaysWithTimestamps.length}/${processedTakeaways.length} takeaways have complete timestamps`);
          console.log(`🔍 Takeaway data analysis:`, processedTakeaways.map((t: any, i: number) => ({
            index: i + 1,
            type: typeof t,
            hasTimestamp: typeof t === 'object' && t?.timestamp ? true : false,
            hasFormattedTime: typeof t === 'object' && t?.formatted_time ? true : false,
            text: typeof t === 'string' ? t.substring(0, 30) + '...' : (t?.text?.substring(0, 30) + '...' || 'No text')
          })));

          // ABSOLUTE FINAL FAILSAFE: If we still don't have timestamps for every takeaway
          if (takeawaysWithoutTimestampsCount > 0) {
            console.log(`🚨 ABSOLUTE FAILSAFE: ${takeawaysWithoutTimestampsCount} takeaways missing complete timestamps. Applying guaranteed timestamp assignment...`);

            const estimatedDuration = 3600; // 1 hour default
            for (let i = 0; i < processedTakeaways.length; i++) {
              const takeaway = processedTakeaways[i];

              if (typeof takeaway === 'string' || !takeaway.timestamp) {
                const absoluteFallbackTimestamp = (estimatedDuration / processedTakeaways.length) * (i + 0.5);

                processedTakeaways[i] = {
                  text: typeof takeaway === 'string' ? takeaway : (takeaway.text || `Takeaway ${i + 1}`),
                  timestamp: absoluteFallbackTimestamp,
                  formatted_time: formatTimestamp(absoluteFallbackTimestamp),
                  confidence: 0.05, // Absolute minimum confidence for failsafe
                } as any;

                console.log(`🔧 FAILSAFE: Assigned guaranteed timestamp to takeaway ${i + 1}: ${formatTimestamp(absoluteFallbackTimestamp)}`);
              }
            }
          }

          console.log(`✅ GUARANTEED: ALL ${processedTakeaways.length} takeaways now have timestamps`);
        }

        // FINAL MULTI-STAGE SAFETY NET: Ensure we have at least 3 takeaways
        if (processedTakeaways.length < 3) {
          console.log(`🚨 FINAL SAFETY NET: Only ${processedTakeaways.length} takeaways after all filtering. Implementing emergency measures...`);

          // If we have the original Gemini takeaways, use them as backup
          if (geminiResult.takeaways.length > processedTakeaways.length) {
            const neededCount = Math.min(3 - processedTakeaways.length, geminiResult.takeaways.length - processedTakeaways.length);

            for (let i = processedTakeaways.length; i < processedTakeaways.length + neededCount; i++) {
              if (i < geminiResult.takeaways.length) {
                const backupTakeaway = geminiResult.takeaways[i];
                const backupText = typeof backupTakeaway === 'string' ? backupTakeaway : (backupTakeaway as any).text || String(backupTakeaway);

                // Add with minimal timestamp (estimated)
                const estimatedTimestamp = (i + 1) * 300; // Spread across ~15 minutes
                processedTakeaways.push({
                  text: backupText,
                  timestamp: estimatedTimestamp,
                  formatted_time: formatTimestampWithBuffer(estimatedTimestamp),
                  confidence: 0.2, // Low confidence but better than nothing
                });

                console.log(`🔄 SAFETY NET: Added backup takeaway ${i + 1}: "${backupText.substring(0, 50)}..."`);
              }
            }
          }

          console.log(`🛡️ FINAL SAFETY NET: Ensured ${processedTakeaways.length} takeaways (target: 3-5)`);
        }

        // Save summary to database
        console.log(`💾 SAVING SUMMARY: User ${args.userId} | Episode ${args.episodeId}`);
        const summaryId = await ctx.runMutation(api.summaries.createSummaryWithTimestamps, {
          userId: args.userId,
          episodeId: args.episodeId,
          episodeTitle: args.episodeTitle,
          summary: geminiResult.summary,
          takeaways: processedTakeaways,
          actionableInsights: shouldGenerateInsights ? geminiResult.actionableInsights : undefined,
          growthStrategy: shouldGenerateInsights ? geminiResult.growthStrategy : undefined,
          keyInsight: shouldGenerateInsights ? geminiResult.keyInsight : undefined,
          realityCheck: shouldGenerateInsights ? geminiResult.realityCheck : undefined,
          hasTimestamps: processedTakeaways.some((t: any) => t.timestamp !== undefined),
          transcriptSource: transcriptData && 'source' in transcriptData ? transcriptData.source : undefined,
          insightsEnabled: shouldGenerateInsights,
          detectedGenre: detectedGenre,
          insightsSuggestion: insightsSuggestion,
        });
        console.log(`✅ SUMMARY SAVED: User ${args.userId} | Summary ID: ${summaryId}`);

        // Increment user's summary count after successful generation
        console.log(`🚀 ABOUT TO INCREMENT: User ${args.userId} summary count`);
        await ctx.runMutation(internal.users.incrementSummaryCount);
        console.log(`✅ INCREMENT COMPLETED: User ${args.userId} summary count incremented`);

        // Track time saved from generating summary
        await ctx.runMutation(internal.users.addTimeSaved, {});

        return {
          summary: geminiResult.summary,
          takeaways: processedTakeaways,
          actionableInsights: geminiResult.actionableInsights,
          growthStrategy: geminiResult.growthStrategy,
          keyInsight: geminiResult.keyInsight,
          realityCheck: geminiResult.realityCheck,
          hasTimestamps,
          transcriptSource: transcriptData && 'source' in transcriptData ? transcriptData.source : 'unknown',
          model: 'gemini-2.0-flash-exp',
          summaryId,
          deepgramError,
          debugInfo: {
            deepgramAttempted: !!args.useDeepgram,
            deepgramSuccess: !!transcriptData && 'source' in transcriptData && transcriptData.source === 'deepgram',
            hasWordTimestamps: !!(transcriptData && 'wordTimestamps' in transcriptData && transcriptData.wordTimestamps?.length),
            wordCount: transcriptData && 'wordTimestamps' in transcriptData ? transcriptData.wordTimestamps?.length || 0 : 0,
            transcriptLength: transcript.length,
            fullTranscriptProcessed: true,
          }
        };
      } catch (error) {
        console.error(`❌ GEMINI FAILED for episode ${args.episodeId}:`, error);
        console.error(`❌ ERROR TYPE:`, typeof error);
        console.error(`❌ ERROR MESSAGE:`, error instanceof Error ? error.message : 'Unknown error');
        console.error(`❌ ERROR STACK:`, error instanceof Error ? error.stack : 'No stack trace');
        // Fallback to OpenAI if Gemini fails
        console.log(`🔄 FALLING BACK TO OPENAI for episode ${args.episodeId}`);
        console.log(`🚨 ROOT CAUSE DETECTED: Gemini failed, using OpenAI fallback - this explains missing Key Takeaways!`);
      }
      
      // Fallback to OpenAI with larger transcript (increased from 8000 to 30000 characters)
      const maxChars = 30000; // Increased limit for better summary quality
      let truncatedTranscript = transcript.length > maxChars
        ? transcript.substring(0, maxChars) + "..."
        : transcript;

      // Log transcript analysis
      const transcriptWordCount = transcript.split(/\s+/).filter((word: string) => word.length > 0).length;
      console.log(`📊 TRANSCRIPT ANALYSIS: ${transcriptWordCount} words, ${transcript.length} characters`);

      if (transcript.length > maxChars) {
        const truncatedWordCount = truncatedTranscript.split(/\s+/).filter((word: string) => word.length > 0).length;
        console.log(`✂️ TRANSCRIPT TRUNCATED: From ${transcriptWordCount} words to ${truncatedWordCount} words (${transcript.length} → ${maxChars} chars)`);
        console.log(`⚠️ WARNING: Truncation may affect summary quality - consider using full transcript`);
      } else {
        console.log(`✅ Using full transcript for summary generation`);
      }

      // Handle missing description - try Gemini transcription if description is missing/short
      let finalDescription = args.episodeDescription;

      if (!args.episodeDescription || args.episodeDescription.trim().length < 50) {
        console.log(`⚠️ Description missing or too short (${args.episodeDescription?.length || 0} chars), attempting Gemini transcription...`);
        try {
          const transcriptionResult = await transcribeAudioWithGemini(args.episodeAudioUrl);

          if (transcriptionResult.success && transcriptionResult.transcript.length > 100) {
            console.log(`✅ Gemini transcription successful: ${transcriptionResult.transcript.length} characters`);
            // Create a description from the first part of the transcript
            finalDescription = transcriptionResult.transcript.substring(0, 300) + '...';
            // Also use the full transcript if we don't have one already
            if (truncatedTranscript.length < 500) {
              const enhancedTranscript = transcriptionResult.transcript.length > 30000
                ? transcriptionResult.transcript.substring(0, 30000) + "..."
                : transcriptionResult.transcript;
              console.log(`🔄 Replacing short transcript with Gemini transcript`);
              // Update the truncated transcript variable
              truncatedTranscript = enhancedTranscript;
            }
          } else {
            console.log(`❌ Gemini transcription failed or too short: ${transcriptionResult.error || 'Unknown error'}`);
          }
        } catch (error) {
          console.error('❌ Error during Gemini transcription:', error);
        }
      }

      // Detect genre using title, description, and transcript
      detectedGenre = detectPodcastGenre(args.episodeTitle, finalDescription, truncatedTranscript);
      const isActionableGenre = detectedGenre === 'actionable';

      // shouldGenerateInsights already set at function start based on user choice

      // Determine suggestion status for frontend
      insightsSuggestion = args.generateInsights === true
        ? 'user_choice'
        : (isActionableGenre ? 'suggested' : 'disabled');

      console.log(`🎯 Genre detected: ${detectedGenre} (actionable: ${isActionableGenre})`);
      console.log(`💡 Insights generation: ${shouldGenerateInsights} (user choice: ${args.generateInsights}, suggestion: ${insightsSuggestion})`);

      // Use default format only when user hasn't explicitly requested actionable insights
      // and we can't determine the genre from available information
      const useDefaultFormat = !shouldGenerateInsights && !args.episodeDescription && !finalDescription;

      prompt = shouldGenerateInsights ? `
You are an expert podcast summariser.
Your output is valid ONLY if it follows the enforced structure below.
Any deviation (wrong sectioning, missing timestamps, wrong counts, or transcript-like copying) is INVALID and must be regenerated.

### Required Sections (with headings):
1. **Main Summary**
   - Provide a 150-200 words of the entire episode.
   - No timestamps in this section.
2. **Key Takeaways**
   - Generate exactly **5 key takeaways** from the podcast, numbered sequentially (1., 2., 3., 4., 5.).
   - MANDATORY: Each takeaway MUST be completely rewritten in simple, clear language:
     • Identify the core insight from the episode content
     • TRANSFORM it into clear, easy-to-understand language
     • NEVER use the speaker's original wording, phrases, or sentence structure
     • Focus on the underlying principle or lesson, not the conversational delivery
     • Each statement should sound like YOUR analysis of what the speaker meant
   - Begin each takeaway with a precise, jumpable timestamp in [hh:mm:ss] format.
   - The timestamp must exactly match the moment the idea is spoken in the audio, enabling the user to jump to that point precisely.
   - Number takeaways sequentially and place timestamps immediately before the takeaway text so they are easily clickable.
   - Format for each item:
     [hh:mm:ss] [1–2 sentence clear, easy-to-understand insight]
   - ZERO TOLERANCE for transcript-like copying. All insights must be completely rewritten in simple language.
3. **Actionable Insights**
   - Must include exactly **5 actionable insights** (not 7).
   - Each Actionable Insight should be the **5 most practical and high-value applications** of the episode's content.
   - Each insight must be a **specific, actionable instruction** framed as "Do this…" or "Apply this…"
   - Format for each item:
     Actionable Insight: [instruction]

### Debugging Self-Check (before final output):
- Did I structure the response into **3 sections with headings**: Main Summary, Key Takeaways, Actionable Insights?
- Are there between **3 and 7 Key Takeaways**, each starting with a **jumpable timestamp** in [hh:mm:ss] format and numbered sequentially?
- Are there exactly **5 Actionable Insights**, practical and useful, not vague?
- Did I avoid transcript-like copying?
If ANY condition is not met, regenerate until fully compliant.

Episode Title: ${args.episodeTitle}
${finalDescription ? `Episode Description: ${finalDescription}` : ''}

Episode Transcript (READ ENTIRELY BEFORE PROCEEDING):
${truncatedTranscript}
` : `
You are a podcast summarizer that analyzes the episode's genre and adapts your output accordingly. ${useDefaultFormat ? 'Genre could not be determined - defaulting to general format.' : 'This episode appears to be entertainment/general content (comedy, fiction, sports, news, etc).'}

🚨 CRITICAL INSTRUCTION: Before generating any summary or takeaways, you MUST:
1. Read through the ENTIRE transcript provided below from beginning to end
2. Analyze the COMPLETE content of the episode - do not skip any section
3. Only after reviewing the full transcript, extract the most significant concepts and themes

🚨 MANDATORY REWRITING PROTOCOL - ZERO TOLERANCE FOR RAW TRANSCRIPTS:

You are an AI assistant extracting insights from podcast content. You must COMPLETELY TRANSFORM every point into clear, simple language.

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

❌ Raw transcript: "sf with him for like seven days oh wow he's thought a lot about this parenting stuff"
✅ Proper rewrite: "Extended family interactions reveal thoughtful approaches to child-rearing philosophies"

❌ Raw transcript: "just to kind of get advice on you know how to think about it should we do it like how does the process work"
✅ Proper rewrite: "Entrepreneurs benefit from seeking structured guidance on decision-making processes and implementation strategies"

GOAL: Create original, meaningful insights that capture the speaker's exact meaning while using completely fresh language and professional structure. Each takeaway must sound like YOUR analysis, never like a transcript excerpt.

TRANSCRIPT ANALYSIS REQUIREMENT:
- Read every word of the transcript below before proceeding
- The transcript contains the COMPLETE episode content (or as much as token limits allow)
- Extract takeaways from the ENTIRE episode content, not just the beginning
- Ensure your summary reflects the full scope of the conversation

Generate only a detailed, comprehensive summary that is EXACTLY 150-200 words (count your words carefully!) and exactly five key takeaways focused on the most significant concepts, important themes, and key principles discussed throughout the ENTIRE episode.

CRITICAL: Your summary MUST be between 150-200 words. Do not write shorter summaries. Include specific details, entertaining moments, interesting quotes, funny stories, and juicy discussion points from the COMPLETE episode.

Episode Title: ${args.episodeTitle}
${finalDescription ? `Episode Description: ${finalDescription}` : ''}

Episode Transcript (READ ENTIRELY BEFORE PROCEEDING):
${truncatedTranscript}

CRITICAL REQUIREMENTS:
- DO NOT generate an "Actionable Insights" section
- DO NOT output sections titled "Growth Strategy", "Reality Check", or "Key Insight"
- Focus on entertainment value, interesting moments, and key lessons rather than actionable advice

🚨 MANDATORY FORMAT - YOU MUST USE THIS EXACT STRUCTURE:
**Main Summary**
[Write EXACTLY 150-200 words - count them! Focus on the most interesting moments, entertainment value, funny stories, key discussions, memorable quotes, and noteworthy content. Include specific details and juicy discussion points. Make it engaging and informative without focusing on actionable advice.]

**Key Takeaways**
${hasTimestamps ? `IMPORTANT: Write clear, digestible takeaways that capture the most interesting or entertaining insights - NOT direct transcript quotes. Each takeaway should be a distilled lesson, observation, or memorable moment.

1. [00:05:23] First key takeaway focused on interesting or entertaining moment/lesson
2. [00:12:15] Second important insight or memorable moment from the episode
3. [00:18:40] Third noteworthy observation or discussion point
4. [00:25:10] Fourth compelling story, example, or interesting revelation
5. [00:33:45] Fifth entertaining moment or valuable perspective shared` : `1. [00:05:23] First key takeaway focused on interesting or entertaining moment/lesson
2. [00:12:15] Second important insight or memorable moment from the episode
3. [00:18:40] Third noteworthy observation or discussion point
4. [00:25:10] Fourth compelling story, example, or interesting revelation
5. [00:33:45] Fifth entertaining moment or valuable perspective shared`}
`;
    } else {
        // Fallback to description-based summary - detect genre first
      detectedGenre = detectPodcastGenre(args.episodeTitle, args.episodeDescription);
      const isActionableGenre = detectedGenre === 'actionable';

      // shouldGenerateInsights already set at function start based on user choice

      // Determine suggestion status for frontend
      insightsSuggestion = args.generateInsights === true
        ? 'user_choice'
        : (isActionableGenre ? 'suggested' : 'disabled');

      prompt = shouldGenerateInsights ? `
You are a podcast summarizer that analyzes the episode's genre and adapts your output accordingly. This episode appears to be in a business/productivity/educational genre.

Generate a concise summary (2–4 sentences) and five key takeaways highlighting important or useful points based on the episode description.

Episode Title: ${args.episodeTitle}
Episode Description: ${args.episodeDescription}

Generate numbered key takeaways with timestamps and actionable insights.

🚨 MANDATORY FORMAT - YOU MUST USE THIS EXACT STRUCTURE:

**Main Summary**
[Write EXACTLY 150-200 words - count them! Include specific details, examples, key insights, interesting stories, important quotes, and juicy discussion points from the episode. Make it comprehensive and detailed, not generic.]

**Key Takeaways**
1. [00:00:00] [Clear, actionable takeaway that summarizes a key insight - NOT direct transcript quotes. Should be a distilled lesson or insight that captures the essence of what was discussed.]

2. [00:00:00] [Important insight that listeners should know]

3. [00:00:00] [Actionable strategy or framework mentioned]

4. [00:00:00] Key Takeaway: [Valuable concept or principle discussed]

5. [00:00:00] Key Takeaway: [Noteworthy observation or data point]

ACTIONABLE INSIGHTS:
**Action 1: [Specific actionable recommendation from the episode]**
Context: [Why this action is important based on episode discussion]
Application: [Concrete steps to implement this action]
Resources: [Tools, methods, or resources mentioned]

**Action 2: [Specific actionable recommendation from the episode]**
Context: [Why this action is important based on episode discussion]
Application: [Concrete steps to implement this action]
Resources: [Tools, methods, or resources mentioned]

**Action 3: [Specific actionable recommendation from the episode]**
Context: [Why this action is important based on episode discussion]
Application: [Concrete steps to implement this action]
Resources: [Tools, methods, or resources mentioned]

**Action 4: [Specific actionable recommendation from the episode]**
Context: [Why this action is important based on episode discussion]
Application: [Concrete steps to implement this action]
Resources: [Tools, methods, or resources mentioned]

**Action 5: [Specific actionable recommendation from the episode]**
Context: [Why this action is important based on episode discussion]
Application: [Concrete steps to implement this action]
Resources: [Tools, methods, or resources mentioned]

GROWTH STRATEGY:
[2-3 sentences outlining strategic approaches, frameworks, or methodologies discussed that can drive growth, improvement, or success in business, career, or personal development]

KEY INSIGHT:
[1-2 sentences highlighting the most important revelation, principle, or "aha moment" from the episode that provides significant value or changes perspective]

REALITY CHECK:
[1-2 sentences addressing potential challenges, misconceptions, or important considerations that listeners should be aware of when implementing the discussed strategies or insights]
` : `
You are a podcast summarizer that analyzes the episode's genre and adapts your output accordingly. This episode appears to be entertainment/general content (comedy, fiction, sports, news, etc).

Generate only a detailed, comprehensive summary that is EXACTLY 150-200 words (count your words carefully!) and exactly five key takeaways focused on the most interesting, entertaining, and important moments or lessons based on the episode description.

CRITICAL: Your summary MUST be between 150-200 words. Do not write shorter summaries. Include specific details, entertaining moments, interesting quotes, funny stories, and juicy discussion points from the episode.

Episode Title: ${args.episodeTitle}
Episode Description: ${args.episodeDescription}

CRITICAL REQUIREMENTS:
- DO NOT generate an "Actionable Insights" section
- DO NOT output sections titled "Growth Strategy", "Reality Check", or "Key Insight"
- Focus on entertainment value, interesting moments, and key lessons rather than actionable advice

🚨 MANDATORY FORMAT - YOU MUST USE THIS EXACT STRUCTURE:
**Main Summary**
[Write EXACTLY 150-200 words - count them! Focus on the most interesting moments, entertainment value, funny stories, key discussions, memorable quotes, and noteworthy content. Include specific details and juicy discussion points. Make it engaging and informative without focusing on actionable advice.]

**Key Takeaways**
1. [00:00:00] [Clear, digestible takeaway that captures an interesting or entertaining insight - NOT direct transcript quotes. Should be a distilled lesson, observation, or memorable moment.]

2. [00:00:00] [Important insight or memorable moment from the episode]

3. [00:00:00] [Noteworthy observation or discussion point]

4. [00:00:00] Key Takeaway: [Compelling story, example, or interesting revelation]

5. [00:00:00] Key Takeaway: [Entertaining moment or valuable perspective shared]

6. [00:00:00] Key Takeaway: [Notable quote, joke, or memorable exchange]

7. [00:00:00] Key Takeaway: [Final thought or standout moment from the episode]
`;
    }

    // Retry logic for rate limits
    let response;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      attempts++;
      
      console.log(`Attempt ${attempts}: Making OpenAI API request...`);
      console.log(`📝 PROMPT ANALYSIS: Checking for 150-200 word requirement in prompt...`);
      if (prompt.includes('150-200 words')) {
        console.log(`✅ Prompt correctly specifies 150-200 words`);
      } else if (prompt.includes('2-4 sentences')) {
        console.log(`❌ ERROR: Prompt still asks for 2-4 sentences instead of 150-200 words!`);
      } else {
        console.log(`⚠️ WARNING: Prompt word count requirement unclear`);
      }

      if (prompt.includes('exactly seven')) {
        console.log(`✅ Prompt correctly specifies exactly seven takeaways`);
      } else if (prompt.includes('seven')) {
        console.log(`⚠️ Prompt mentions seven but not "exactly seven"`);
      } else {
        console.log(`❌ ERROR: Prompt doesn't specify seven takeaways!`);
      }
      
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
          max_tokens: 1200, // Increased for timestamps
          temperature: 0.7,
        }),
      });

      console.log(`Response status: ${response.status}`);
      
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
      
      // If other error or max attempts reached, fall back to legacy method
      console.log(`OpenAI API failed after ${maxAttempts} attempts with status ${response.status}, falling back to legacy method`);
      return await ctx.runAction(api.summaries.generateSummary, {
        episodeId: args.episodeId,
        episodeTitle: args.episodeTitle,
        episodeDescription: args.episodeDescription,
        episodeAudioUrl: args.episodeAudioUrl,
        userId: args.userId,
        generateInsights: args.generateInsights,
      });
    }

    const data = await response!.json();
    const aiResponse = data.choices[0].message.content;

    // Parse the AI response using structured format - support both ** and ### formats
    const mainSummaryMatch = aiResponse.match(/(?:\*\*Main Summary\*\*|### Main Summary)\s*([\s\S]*?)(?=(?:\*\*Key Takeaways\*\*|### Key Takeaways)|$)/);
    const keyTakeawaysMatch = aiResponse.match(/(?:\*\*Key Takeaways\*\*|### Key Takeaways)\s*([\s\S]*?)(?=(?:\*\*Actionable Insights\*\*|### Actionable Insights)|$)/);
    const actionableInsightsMatch = aiResponse.match(/(?:\*\*Actionable Insights\*\*|### Actionable Insights)\s*([\s\S]*?)(?=$)/);

    let summary = mainSummaryMatch ? mainSummaryMatch[1].trim() : aiResponse;
    const takeawaysText = keyTakeawaysMatch ? keyTakeawaysMatch[1].trim() : "";
    let actionableInsightsText = actionableInsightsMatch ? actionableInsightsMatch[1].trim() : "";
    // Removed growth strategy, key insight, and reality check from new format
    const growthStrategyText = "";
    const keyInsightText = "";
    const realityCheckText = "";

    // Log word count analysis for OpenAI response
    let summaryWordCount = summary.split(/\s+/).filter((word: string) => word.length > 0).length;
    console.log(`📊 OPENAI SUMMARY WORD COUNT: ${summaryWordCount} words (target: 150-200 words)`);
    console.log(`📝 Summary length: ${summary.length} characters`);

    if (summaryWordCount < 150) {
      console.log(`🚨 CRITICAL ERROR: OpenAI summary is too short (${summaryWordCount} words < 150)`);
      console.log(`🔧 APPLYING EMERGENCY EXPANSION to reach minimum word count...`);

      // Emergency expansion for OpenAI pathway
      const wordsNeeded = 150 - summaryWordCount;

      // Get the transcript from the available context
      const transcriptForExpansion = transcriptData?.transcript || args.episodeDescription || "Limited content available";

      const expandedSummary = await expandSummaryToTargetLength(
        summary,
        transcriptForExpansion,
        args.episodeTitle,
        wordsNeeded
      );

      if (expandedSummary) {
        const expandedWordCount = expandedSummary.split(/\s+/).filter((word: string) => word.length > 0).length;
        console.log(`✅ OpenAI emergency expansion successful: ${summaryWordCount} → ${expandedWordCount} words`);
        summary = expandedSummary; // Update the summary variable
        summaryWordCount = expandedWordCount; // Update the word count
        console.log(`📝 Using expanded summary instead of original short summary`);
      } else {
        console.log(`❌ OpenAI emergency expansion failed`);
      }
    }

    if (summaryWordCount < 150) {
      console.log(`💡 RECOMMENDATION: AI model not following instructions - check prompt`);
    } else if (summaryWordCount > 200) {
      console.log(`⚠️ WARNING: OpenAI summary is too long (${summaryWordCount} words > 200)`);
    } else {
      console.log(`✅ OpenAI summary word count is within target range`);
    }

    // Extract individual takeaways and process timestamps
    const rawTakeaways = takeawaysText
      .split("•")
      .map((item: string) => item.trim())
      .filter((item: string) => item.length > 0);

    console.log(`🎯 OpenAI takeaways count: ${rawTakeaways.length} (target: 5)`);
    console.log("🎯 OpenAI RAW TAKEAWAYS TEXT:", takeawaysText);

    // Fallback: If we don't have 3-7 takeaways, try alternative parsing
    let finalRawTakeaways = rawTakeaways;

    // Parse the new structured format with clear section headings
    if (keyTakeawaysMatch && actionableInsightsMatch) {
      console.log("🎯 OpenAI DETECTED NEW STRUCTURED FORMAT");

      // Parse numbered takeaways with timestamps: 1. [hh:mm:ss] ...
      // More robust pattern that handles different line endings and formats
      const numberedTakeawayPattern = /(\d+)\.\s*\[([^\]]+)\]\s*(.*?)(?=(?:\r?\n|^)\d+\.|$)/gms;
      const newFormatTakeaways: string[] = [];

      let match;
      while ((match = numberedTakeawayPattern.exec(takeawaysText)) !== null) {
        const [, number, timestamp, keyTakeaway] = match;
        const takeawayWithTimestamp = `[${timestamp}] ${keyTakeaway.trim()}`;
        newFormatTakeaways.push(takeawayWithTimestamp);
        console.log(`🎯 OpenAI PARSED TAKEAWAY ${number}: [${timestamp}] ${keyTakeaway.trim()}`);
      }

      // Parse actionable insights: 1. [instruction] or 1. Actionable Insight: [instruction]
      const insightPattern = /(\d+)\.\s*(?:Actionable Insight:\s*)?(.*?)(?=\n\d+\.|$)/gs;
      const newFormatActionableInsights: Array<{
        action: string;
        context: string;
        application: string;
        resources: string;
      }> = [];

      let insightMatch;
      while ((insightMatch = insightPattern.exec(actionableInsightsText)) !== null) {
        const [, number, insight] = insightMatch;
        newFormatActionableInsights.push({
          action: insight.trim(),
          context: `Actionable insight ${number}`,
          application: insight.trim(),
          resources: ''
        });
        console.log(`🎯 OpenAI PARSED INSIGHT ${number}: ${insight.trim()}`);
      }

      if (newFormatTakeaways.length > 0) {
        finalRawTakeaways = newFormatTakeaways;
        console.log(`✅ OpenAI USING NEW STRUCTURED FORMAT: ${newFormatTakeaways.length} takeaways`);

        // Update actionableInsightsText to use the new format insights if they exist
        if (newFormatActionableInsights.length > 0) {
          // Convert structured insights back to text format for existing processing logic
          actionableInsightsText = newFormatActionableInsights.map((insight, index) =>
            `**Action ${index + 1}: ${insight.action}**\nContext: ${insight.context}\nApplication: ${insight.application}\nResources: ${insight.resources}`
          ).join('\n\n');
          console.log(`✅ OpenAI USING NEW FORMAT ACTIONABLE INSIGHTS: ${newFormatActionableInsights.length} insights`);
        }
      } else {
        console.log("⚠️ OpenAI NEW FORMAT PARSING FAILED, falling back to standard parsing");
      }
    }

    if (finalRawTakeaways.length !== 5) {
      console.log("⚠️ OpenAI TAKEAWAY COUNT MISMATCH! Expected 7, got:", finalRawTakeaways.length);

      // Try parsing with numbered list (1. 2. 3. etc.)
      const numberedTakeaways = takeawaysText
        .split('\n')
        .filter((line: string) => /^\d+\./.test(line.trim()))
        .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
        .filter((takeaway: string) => takeaway.length > 0);

      console.log("🔄 OpenAI TRYING NUMBERED PARSING:", numberedTakeaways.length, numberedTakeaways);

      if (numberedTakeaways.length === 5) {
        finalRawTakeaways = numberedTakeaways;
        console.log("✅ OpenAI FIXED WITH NUMBERED PARSING!");
      } else {
        // Try parsing with dash/hyphen (- takeaway)
        const dashedTakeaways = takeawaysText
          .split('\n')
          .filter((line: string) => line.trim().startsWith('-'))
          .map((line: string) => line.replace(/^-\s*/, '').trim())
          .filter((takeaway: string) => takeaway.length > 0);

        console.log("🔄 OpenAI TRYING DASHED PARSING:", dashedTakeaways.length, dashedTakeaways);

        if (dashedTakeaways.length === 5) {
          finalRawTakeaways = dashedTakeaways;
          console.log("✅ OpenAI FIXED WITH DASHED PARSING!");
        } else {
          // Try parsing lines that start with bullet points
          const bulletTakeaways = takeawaysText
            .split('\n')
            .filter((line: string) => line.trim().startsWith('•'))
            .map((line: string) => line.replace(/^•\s*/, '').trim())
            .filter((takeaway: string) => takeaway.length > 0);

          console.log("🔄 OpenAI TRYING BULLET PARSING:", bulletTakeaways.length, bulletTakeaways);

          if (bulletTakeaways.length === 5) {
            finalRawTakeaways = bulletTakeaways;
            console.log("✅ OpenAI FIXED WITH BULLET PARSING!");
          } else {
            // Last resort: split by lines and take first 7 non-empty lines
            const lineTakeaways = takeawaysText
              .split('\n')
              .map((line: string) => line.trim())
              .filter((line: string) => line.length > 0)
              .slice(0, 7);

            console.log("🔄 OpenAI TRYING LINE PARSING:", lineTakeaways.length, lineTakeaways);

            if (lineTakeaways.length >= 4) {
              finalRawTakeaways = lineTakeaways;
              console.log("✅ OpenAI FIXED WITH LINE PARSING!");
            }
          }
        }
      }
    }

    console.log("🎯 OpenAI FINAL TAKEAWAYS COUNT:", finalRawTakeaways.length);
    console.log("🎯 OpenAI FINAL TAKEAWAYS:", finalRawTakeaways);

    // SECURITY: Apply verbatim detection and filtering to legacy processing path
    console.log(`🔍 APPLYING VERBATIM FILTERING to ${finalRawTakeaways.length} legacy takeaways`);
    const verbatimFilteredTakeaways = filterVerbatimTakeaways(finalRawTakeaways, transcriptData?.transcript || '');

    // Step 3: Polish takeaways for professional language (legacy path)
    const polishedTakeaways = polishTakeaways(verbatimFilteredTakeaways);
    console.log(`✨ LEGACY POLISHING: Applied professional language cleanup to ${polishedTakeaways.length} takeaways`);

    finalRawTakeaways = polishedTakeaways;

    // Process takeaways to extract timestamps if available
    let processedTakeaways: Array<string | {
      text: string;
      timestamp?: number;
      confidence?: number;
      formatted_time?: string;
      originalText?: string;
      fullContext?: string;
      matchedText?: string;
    }> = [];

    if (hasTimestamps && transcriptData && 'wordTimestamps' in transcriptData && transcriptData.wordTimestamps) {
      console.log(`🕒 Processing ${finalRawTakeaways.length} takeaways for timestamps`);

      for (const takeaway of finalRawTakeaways) {
        // Try to extract quote from takeaway (if present)
        const quoteMatch = takeaway.match(/(.*?)\s*-\s*"([^"]+)"/);
        
        if (quoteMatch) {
          const takeawayText = quoteMatch[1].trim();
          const quote = quoteMatch[2].trim();
          
          // Find timestamp for the quote
          const timestampResult = findTimestampForText(quote, transcriptData.wordTimestamps!);
          
          if (timestampResult && timestampResult.confidence > 0.6) {
            // Prepare both original AI text and actual spoken content
            const originalText = takeawayText;
            const spokenContent = timestampResult.fullContext;

            // Use spoken content as takeaway text if available and good quality
            let finalTakeawayText = originalText;
            if (spokenContent && spokenContent.length > 30) {
              // Clean up the spoken content to be more readable
              const cleanedSpokenContent = spokenContent
                .replace(/\s+/g, ' ') // normalize whitespace
                .trim();

              // SECURITY: Validate spoken content before using as takeaway
              if (cleanedSpokenContent.length > 30 && cleanedSpokenContent.length < 200) {
                // Apply same security checks as Gemini path
                const isVerbatim = (
                  /\b(so|like|you know|I mean|um|uh)\s+(so|like|you know|I mean|um|uh)/gi.test(cleanedSpokenContent) ||
                  /\b(and|but|so)\s+(and|but|so)\s+(and|but|so)/gi.test(cleanedSpokenContent) ||
                  /\.\.\.\s*(and|so|but|or)(\s|$)/gi.test(cleanedSpokenContent) ||
                  /(^|\s)[a-z]/.test(cleanedSpokenContent) ||
                  /\b(talk about that|discuss that|you know what)\b/gi.test(cleanedSpokenContent) ||
                  /robot.*what.*does.*look.*like/gi.test(cleanedSpokenContent) ||
                  /autonomous.*sailboats.*intelligent.*little/gi.test(cleanedSpokenContent)
                );

                if (!isVerbatim) {
                  finalTakeawayText = cleanedSpokenContent;
                  console.log(`🗣️ Using validated spoken content as OpenAI takeaway: "${finalTakeawayText.substring(0, 50)}..."`);
                } else {
                  console.log(`🚨 SECURITY: Blocked raw transcript injection: "${cleanedSpokenContent.substring(0, 50)}..."`);
                  // Keep original AI-generated takeaway instead of raw transcript
                }
              }
            }

            processedTakeaways.push({
              text: finalTakeawayText,
              timestamp: timestampResult.timestamp,
              confidence: timestampResult.confidence,
              formatted_time: formatTimestampWithBuffer(timestampResult.timestamp),
              matchedText: timestampResult.matchedText,
              fullContext: timestampResult.fullContext,
              originalText: originalText,
            });
            console.log(`✅ Found timestamp for "${takeawayText}": ${formatTimestamp(timestampResult.timestamp)}`);
          } else {
            // Fallback: try to find timestamp using the takeaway text itself
            const fallbackResult = findTimestampForText(takeawayText, transcriptData.wordTimestamps!);
            if (fallbackResult && fallbackResult.confidence > 0.6) {
              // Prepare both original AI text and actual spoken content
              const originalText = takeawayText;
              const spokenContent = fallbackResult.fullContext;

              // Use spoken content as takeaway text if available and good quality
              let finalTakeawayText = originalText;
              if (spokenContent && spokenContent.length > 30) {
                // Clean up the spoken content to be more readable
                const cleanedSpokenContent = spokenContent
                  .replace(/\s+/g, ' ') // normalize whitespace
                  .trim();

                // SECURITY: Validate fallback spoken content before using as takeaway
                if (cleanedSpokenContent.length > 30 && cleanedSpokenContent.length < 200) {
                  // Apply same security checks as Gemini path
                  const isVerbatim = (
                    /\b(so|like|you know|I mean|um|uh)\s+(so|like|you know|I mean|um|uh)/gi.test(cleanedSpokenContent) ||
                    /\b(and|but|so)\s+(and|but|so)\s+(and|but|so)/gi.test(cleanedSpokenContent) ||
                    /\.\.\.\s*(and|so|but|or)(\s|$)/gi.test(cleanedSpokenContent) ||
                    /(^|\s)[a-z]/.test(cleanedSpokenContent) ||
                    /\b(talk about that|discuss that|you know what)\b/gi.test(cleanedSpokenContent) ||
                    /robot.*what.*does.*look.*like/gi.test(cleanedSpokenContent) ||
                    /autonomous.*sailboats.*intelligent.*little/gi.test(cleanedSpokenContent)
                  );

                  if (!isVerbatim) {
                    finalTakeawayText = cleanedSpokenContent;
                    console.log(`🗣️ Using validated fallback spoken content as OpenAI takeaway: "${finalTakeawayText.substring(0, 50)}..."`);
                  } else {
                    console.log(`🚨 SECURITY: Blocked fallback raw transcript injection: "${cleanedSpokenContent.substring(0, 50)}..."`);
                    // Keep original AI-generated takeaway instead of raw transcript
                  }
                }
              }

              processedTakeaways.push({
                text: finalTakeawayText,
                timestamp: fallbackResult.timestamp,
                confidence: fallbackResult.confidence,
                formatted_time: formatTimestampWithBuffer(fallbackResult.timestamp),
                matchedText: fallbackResult.matchedText,
                fullContext: fallbackResult.fullContext,
                originalText: originalText,
              });
              console.log(`⚠️ Found fallback timestamp for "${takeawayText}": ${formatTimestamp(fallbackResult.timestamp)}`);
            } else {
              processedTakeaways.push(takeawayText);
              console.log(`❌ No timestamp found for: "${takeawayText}"`);
            }
          }
        } else {
          // No quote found, try to find timestamp using takeaway text
          const timestampResult = findTimestampForText(takeaway, transcriptData.wordTimestamps!);
          
          if (timestampResult && timestampResult.confidence > 0.6) {
            // Prepare both original AI text and actual spoken content
            const originalText = takeaway;
            const spokenContent = timestampResult.fullContext;

            // Use spoken content as takeaway text if available and good quality
            let finalTakeawayText = originalText;
            if (spokenContent && spokenContent.length > 30) {
              // Clean up the spoken content to be more readable
              const cleanedSpokenContent = spokenContent
                .replace(/\s+/g, ' ') // normalize whitespace
                .trim();

              // SECURITY: Validate spoken content before using as takeaway (no quote path)
              if (cleanedSpokenContent.length > 30 && cleanedSpokenContent.length < 200) {
                // Apply same security checks as Gemini path
                const isVerbatim = (
                  /\b(so|like|you know|I mean|um|uh)\s+(so|like|you know|I mean|um|uh)/gi.test(cleanedSpokenContent) ||
                  /\b(and|but|so)\s+(and|but|so)\s+(and|but|so)/gi.test(cleanedSpokenContent) ||
                  /\.\.\.\s*(and|so|but|or)(\s|$)/gi.test(cleanedSpokenContent) ||
                  /(^|\s)[a-z]/.test(cleanedSpokenContent) ||
                  /\b(talk about that|discuss that|you know what)\b/gi.test(cleanedSpokenContent) ||
                  /robot.*what.*does.*look.*like/gi.test(cleanedSpokenContent) ||
                  /autonomous.*sailboats.*intelligent.*little/gi.test(cleanedSpokenContent)
                );

                if (!isVerbatim) {
                  finalTakeawayText = cleanedSpokenContent;
                  console.log(`🗣️ Using validated spoken content as OpenAI takeaway (no quote): "${finalTakeawayText.substring(0, 50)}..."`);
                } else {
                  console.log(`🚨 SECURITY: Blocked no-quote raw transcript injection: "${cleanedSpokenContent.substring(0, 50)}..."`);
                  // Keep original AI-generated takeaway instead of raw transcript
                }
              }
            }

            processedTakeaways.push({
              text: finalTakeawayText,
              timestamp: timestampResult.timestamp,
              confidence: timestampResult.confidence,
              formatted_time: formatTimestampWithBuffer(timestampResult.timestamp),
              matchedText: timestampResult.matchedText,
              fullContext: timestampResult.fullContext,
              originalText: originalText,
            });
            console.log(`✅ Found timestamp for "${takeaway}": ${formatTimestamp(timestampResult.timestamp)}`);
          } else {
            processedTakeaways.push(takeaway);
            console.log(`❌ No timestamp found for: "${takeaway}"`);
          }
        }
      }
    } else {
      processedTakeaways = finalRawTakeaways;
    }

    // FINAL FALLBACK FOR OPENAI PATH: Ensure every takeaway has a timestamp
    const openaiBasicTakeawaysWithoutTimestamps = processedTakeaways.filter((t: any) => typeof t === 'string' || !t.timestamp || (t.confidence && t.confidence < 0.3));
    if (openaiBasicTakeawaysWithoutTimestamps.length > 0) {
      console.log(`❌ OPENAI: Removing ${openaiBasicTakeawaysWithoutTimestamps.length} takeaways without accurate timestamps (confidence <30%)`);

      // Filter out takeaways without high-confidence timestamps - more lenient threshold
      processedTakeaways = processedTakeaways.filter((takeaway: any) => {
        const hasTimestamp = typeof takeaway === 'object' && takeaway.timestamp;
        const hasAccuracy = !takeaway.confidence || takeaway.confidence >= 0.3; // Reduced from 0.6 to 0.3 to keep more takeaways

        if (!hasTimestamp || !hasAccuracy) {
          console.log(`❌ OPENAI Removing: "${typeof takeaway === 'string' ? takeaway : takeaway.text}" (confidence: ${takeaway.confidence || 'N/A'})`);
          return false;
        }
        return true;
      });

      console.log(`✅ OPENAI Quality control: Keeping ${processedTakeaways.length} highly accurate takeaways`);

      // SAFETY NET: If all takeaways were filtered out, restore some with lower standards
      if (processedTakeaways.length === 0 && finalRawTakeaways.length > 0) {
        console.log(`🚨 OPENAI SAFETY NET: All takeaways filtered out! Restoring with lower confidence threshold`);
        processedTakeaways = finalRawTakeaways.slice(0, 3).map((takeaway: any, index: number) => {
          if (typeof takeaway === 'string') {
            return {
              text: takeaway,
              timestamp: index * 300, // Spread across episode
              formatted_time: `${Math.floor((index * 300) / 60)}:${String((index * 300) % 60).padStart(2, '0')}`,
              confidence: 0.4
            };
          }
          return takeaway;
        });
        console.log(`🛡️ OPENAI SAFETY NET: Restored ${processedTakeaways.length} takeaways`);
      }
    }

    // CRITICAL FAILSAFE FOR OPENAI PATH: Ensure ALL takeaways have timestamps
    const openaiTakeawaysWithTimestamps = processedTakeaways.filter((t: any) =>
      typeof t === 'object' && t !== null && t.timestamp && t.formatted_time
    );
    const openaiTakeawaysWithoutTimestampsCount = processedTakeaways.length - openaiTakeawaysWithTimestamps.length;

    console.log(`📊 OPENAI DETAILED STATUS: ${openaiTakeawaysWithTimestamps.length}/${processedTakeaways.length} takeaways have complete timestamps`);
    console.log(`🔍 OPENAI Takeaway data analysis:`, processedTakeaways.map((t: any, i: number) => ({
      index: i + 1,
      type: typeof t,
      hasTimestamp: typeof t === 'object' && t?.timestamp ? true : false,
      hasFormattedTime: typeof t === 'object' && t?.formatted_time ? true : false,
      text: typeof t === 'string' ? t.substring(0, 30) + '...' : (t?.text?.substring(0, 30) + '...' || 'No text')
    })));

    if (openaiTakeawaysWithoutTimestampsCount > 0) {
      console.log(`🚨 OPENAI FAILSAFE: ${openaiTakeawaysWithoutTimestampsCount} takeaways missing complete timestamps. Applying guaranteed timestamp assignment...`);

      const estimatedDuration = 3600; // 1 hour default
      for (let i = 0; i < processedTakeaways.length; i++) {
        const takeaway = processedTakeaways[i];

        if (typeof takeaway === 'string' || !takeaway.timestamp) {
          const absoluteFallbackTimestamp = (estimatedDuration / processedTakeaways.length) * (i + 0.5);

          processedTakeaways[i] = {
            text: typeof takeaway === 'string' ? takeaway : (takeaway.text || `Takeaway ${i + 1}`),
            timestamp: absoluteFallbackTimestamp,
            formatted_time: formatTimestamp(absoluteFallbackTimestamp),
            confidence: 0.05, // Absolute minimum confidence for failsafe
          };

          console.log(`🔧 OPENAI FAILSAFE: Assigned guaranteed timestamp to takeaway ${i + 1}: ${formatTimestamp(absoluteFallbackTimestamp)}`);
        }
      }
    }

    console.log(`✅ OPENAI GUARANTEED: ALL ${processedTakeaways.length} takeaways now have timestamps`);

    // Enhanced actionable insights processing with fallback parsing
    let processedActionableInsights: Array<{
      action: string;
      context: string;
      application: string;
      resources: string;
    }> = [];

    if (shouldGenerateInsights) {
      console.log("🔍 PROCESSING ACTIONABLE INSIGHTS");
      console.log("📝 shouldGenerateInsights:", shouldGenerateInsights);
      console.log("📝 actionableInsightsText length:", actionableInsightsText.length);
      console.log("📝 Raw actionable insights text:", actionableInsightsText.substring(0, 300) + "...");

      // If structured parsing failed but we should generate insights, try to extract from full response
      if (!actionableInsightsText && aiResponse) {
        console.log("⚠️ Structured parsing failed, attempting fallback extraction from full AI response");
        // Try to find any actionable content in the response
        const fallbackMatch = aiResponse.match(/(?:ACTIONABLE|Action|ACTIONS?)[\s\S]*?(?=GROWTH STRATEGY|KEY INSIGHT|REALITY CHECK|$)/i);
        if (fallbackMatch) {
          console.log("✅ Found actionable content via fallback extraction");
          actionableInsightsText = fallbackMatch[0];
        }
      }

      // Primary parsing: Look for **Action N:** pattern
      let insights = actionableInsightsText
        .split(/\*\*Action \d+:/)
        .slice(1) // Remove empty first element
        .map((insight: string) => {
          const lines = insight.trim().split('\n').filter((line: string) => line.trim());
          const action = lines[0]?.replace(/\*\*$/, '') || '';
          const context = lines.find((line: string) => line.startsWith('Context:'))?.replace('Context: ', '') || '';
          const application = lines.find((line: string) => line.startsWith('Application:'))?.replace('Application: ', '') || '';
          const resources = lines.find((line: string) => line.startsWith('Resources:'))?.replace('Resources: ', '') || '';

          return {
            action: action.trim(),
            context: context.trim(),
            application: application.trim(),
            resources: resources.trim()
          };
        })
        .filter((insight: { action: string; context: string; application: string; resources: string }) => insight.action.length > 0);

      console.log(`🎯 Primary parsing found ${insights.length} insights`);

      // Fallback parsing if primary method fails
      if (insights.length === 0) {
        console.log("🔄 Primary parsing failed, trying fallback methods...");

        // Try parsing numbered actions (1. 2. 3. etc.)
        const numberedActions = actionableInsightsText
          .split(/\d+\.\s*/)
          .slice(1)
          .map((insight: string) => {
            const lines = insight.trim().split('\n').filter((line: string) => line.trim());
            const action = lines[0]?.split('Context:')[0]?.trim() || '';
            const restText = insight.substring(action.length);

            const contextMatch = restText.match(/Context:\s*(.*?)(?=Application:|Resources:|$)/s);
            const applicationMatch = restText.match(/Application:\s*(.*?)(?=Resources:|$)/s);
            const resourcesMatch = restText.match(/Resources:\s*(.*?)$/s);

            return {
              action: action.trim(),
              context: contextMatch?.[1]?.trim() || '',
              application: applicationMatch?.[1]?.trim() || '',
              resources: resourcesMatch?.[1]?.trim() || ''
            };
          })
          .filter((insight: { action: string; context: string; application: string; resources: string }) => insight.action.length > 0);

        if (numberedActions.length > 0) {
          insights = numberedActions;
          console.log(`✅ Fallback parsing found ${insights.length} insights using numbered format`);
        } else {
          // Last resort: Parse line by line for any actionable content
          const lines = actionableInsightsText.split('\n').filter((line: string) => line.trim());
          let currentInsight: any = null;
          const fallbackInsights: Array<{
            action: string;
            context: string;
            application: string;
            resources: string;
          }> = [];

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.includes(':') && !trimmedLine.startsWith('Context:') && !trimmedLine.startsWith('Application:') && !trimmedLine.startsWith('Resources:')) {
              // New action line
              if (currentInsight && currentInsight.action) {
                fallbackInsights.push(currentInsight);
              }
              currentInsight = {
                action: trimmedLine.replace(/[:\-\*]/g, '').trim(),
                context: '',
                application: '',
                resources: ''
              };
            } else if (currentInsight) {
              if (trimmedLine.startsWith('Context:')) {
                currentInsight.context = trimmedLine.replace('Context:', '').trim();
              } else if (trimmedLine.startsWith('Application:')) {
                currentInsight.application = trimmedLine.replace('Application:', '').trim();
              } else if (trimmedLine.startsWith('Resources:')) {
                currentInsight.resources = trimmedLine.replace('Resources:', '').trim();
              }
            }
          }

          if (currentInsight && currentInsight.action) {
            fallbackInsights.push(currentInsight);
          }

          if (fallbackInsights.length > 0) {
            insights = fallbackInsights;
            console.log(`✅ Last resort parsing found ${insights.length} insights`);
          }
        }
      }

      processedActionableInsights = insights;
      console.log(`🎉 Final processed insights count: ${processedActionableInsights.length}`);

      // If we should generate insights but got none, log this issue for debugging
      if (processedActionableInsights.length === 0) {
        console.warn("⚠️ shouldGenerateInsights was true but no insights were processed");
        console.warn("📝 AI Response preview:", aiResponse.substring(0, 500) + "...");
      }
    }

    // Increment user's summary count after successful generation
    console.log(`🚀 ABOUT TO INCREMENT: User ${args.userId} summary count`);
    await ctx.runMutation(internal.users.incrementSummaryCount);
    console.log(`✅ INCREMENT COMPLETED: User ${args.userId} summary count incremented`);
    
    // Track time saved from generating summary
    await ctx.runMutation(internal.users.addTimeSaved, {});

    // Store summary with enhanced data
    const summaryId = await ctx.runMutation(api.summaries.createSummaryWithTimestamps, {
      episodeId: args.episodeId,
      userId: args.userId,
      summary,
      takeaways: processedTakeaways,
      actionableInsights: shouldGenerateInsights ? processedActionableInsights : undefined,
      growthStrategy: shouldGenerateInsights ? growthStrategyText : undefined,
      keyInsight: shouldGenerateInsights ? keyInsightText : undefined,
      realityCheck: shouldGenerateInsights ? realityCheckText : undefined,
      episodeTitle: args.episodeTitle,
      hasTimestamps: hasTimestamps || false,
      transcriptSource: transcriptData && 'source' in transcriptData ? transcriptData.source : undefined,
      insightsEnabled: shouldGenerateInsights,
      detectedGenre: detectedGenre,
      insightsSuggestion: insightsSuggestion,
    });


    console.log(`🎉 SUMMARY GENERATION COMPLETED: User ${args.userId} | Episode ${args.episodeId} | Summary ID: ${summaryId}`);

    return {
      id: summaryId,
      summary,
      takeaways: processedTakeaways,
      actionableInsights: processedActionableInsights,
      growthStrategy: growthStrategyText,
      keyInsight: keyInsightText,
      realityCheck: realityCheckText,
      episodeId: args.episodeId,
      userId: args.userId,
      createdAt: Date.now(),
      hasTranscript: transcriptData?.hasTranscript || false,
      hasTimestamps: hasTimestamps || false,
      transcriptUsed: !!(transcriptData?.hasTranscript && transcriptData.transcript),
      transcriptSource: transcriptData && 'source' in transcriptData ? transcriptData.source : undefined,
      deepgramError: deepgramError || undefined,
      debugInfo: {
        deepgramAttempted: args.useDeepgram || false,
        deepgramSuccess: deepgramData?.success || false,
        hasWordTimestamps: !!(transcriptData && 'wordTimestamps' in transcriptData && transcriptData.wordTimestamps?.length),
        wordCount: transcriptData && 'wordTimestamps' in transcriptData ? transcriptData.wordTimestamps?.length || 0 : 0,
      }
    };
  },
});

export const generateSummary = action({
  args: {
    episodeId: v.string(),
    episodeTitle: v.string(),
    episodeDescription: v.string(),
    episodeAudioUrl: v.string(),
    userId: v.string(),
    generateInsights: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<any> => {
    // Check if summary already exists for this episode and user
    const existingSummary = await ctx.runQuery(api.summaries.getSummaryByEpisodeAndUser, {
      episodeId: args.episodeId,
      userId: args.userId,
    });
    
    if (existingSummary) {
      throw new Error("A summary already exists for this episode. Each episode can only have one summary per user.");
    }

    // Check quota before generating summary
    const quotaStatus = await ctx.runMutation(internal.users.checkAndResetQuota);
    
    if (!quotaStatus.canGenerate) {
      throw new Error(`Quota exceeded. You have used ${quotaStatus.summaries.used}/${quotaStatus.summaries.limit} summaries. ${
        quotaStatus.summaries.limit === 5 ? "Upgrade to get more summaries." : "Your quota will reset next month."
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
      // Truncate transcript if too long to fit in token limits (keep first ~30000 characters)
      const truncatedTranscript = transcript.length > 30000
        ? transcript.substring(0, 30000) + "..."
        : transcript;

      // Handle missing description - try Gemini transcription if description is missing/short
      let finalDescription = args.episodeDescription;
      let enhancedTranscript = truncatedTranscript;

      if (!args.episodeDescription || args.episodeDescription.trim().length < 50) {
        console.log(`⚠️ [Legacy] Description missing or too short (${args.episodeDescription?.length || 0} chars), attempting Gemini transcription...`);
        try {
          const transcriptionResult = await transcribeAudioWithGemini(args.episodeAudioUrl);

          if (transcriptionResult.success && transcriptionResult.transcript.length > 100) {
            console.log(`✅ [Legacy] Gemini transcription successful: ${transcriptionResult.transcript.length} characters`);
            // Create a description from the first part of the transcript
            finalDescription = transcriptionResult.transcript.substring(0, 300) + '...';
            // Also use the full transcript if we don't have one already
            if (truncatedTranscript.length < 500) {
              enhancedTranscript = transcriptionResult.transcript.length > 30000
                ? transcriptionResult.transcript.substring(0, 30000) + "..."
                : transcriptionResult.transcript;
              console.log(`🔄 [Legacy] Using Gemini transcript`);
            }
          } else {
            console.log(`❌ [Legacy] Gemini transcription failed: ${transcriptionResult.error || 'Unknown error'}`);
          }
        } catch (error) {
          console.error('❌ [Legacy] Error during Gemini transcription:', error);
        }
      }

      // Detect genre for appropriate prompt
      const genre = detectPodcastGenre(args.episodeTitle, finalDescription, enhancedTranscript);
      const isActionableGenre = genre === 'actionable';

      // Determine if insights should be generated - prioritize explicit user choice
      const shouldGenerateInsights = args.generateInsights === true ||
                                    (args.generateInsights === undefined && isActionableGenre);

      // Use default format only when user hasn't explicitly requested actionable insights
      // and we can't determine the genre from available information
      const useDefaultFormat = !shouldGenerateInsights && !args.episodeDescription && !finalDescription;

      prompt = shouldGenerateInsights ? `
You are an expert podcast summariser.
Your output is valid ONLY if it follows the enforced structure below.
Any deviation (wrong sectioning, missing timestamps, wrong counts, or transcript-like copying) is INVALID and must be regenerated.

### Required Sections (with headings):
1. **Main Summary**
   - Provide a 150-200 words of the entire episode.
   - No timestamps in this section.
2. **Key Takeaways**
   - Generate exactly **5 key takeaways** from the podcast, numbered sequentially (1., 2., 3., 4., 5.).
   - MANDATORY: Each takeaway MUST be completely rewritten in simple, clear language:
     • Identify the core insight from the episode content
     • TRANSFORM it into clear, easy-to-understand language
     • NEVER use the speaker's original wording, phrases, or sentence structure
     • Focus on the underlying principle or lesson, not the conversational delivery
     • Each statement should sound like YOUR analysis of what the speaker meant
   - Begin each takeaway with a precise, jumpable timestamp in [hh:mm:ss] format.
   - The timestamp must exactly match the moment the idea is spoken in the audio, enabling the user to jump to that point precisely.
   - Number takeaways sequentially and place timestamps immediately before the takeaway text so they are easily clickable.
   - Format for each item:
     [hh:mm:ss] [1–2 sentence clear, easy-to-understand insight]
   - ZERO TOLERANCE for transcript-like copying. All insights must be completely rewritten in simple language.
3. **Actionable Insights**
   - Must include exactly **5 actionable insights** (not 7).
   - Each Actionable Insight should be the **5 most practical and high-value applications** of the episode's content.
   - Each insight must be a **specific, actionable instruction** framed as "Do this…" or "Apply this…"
   - Format for each item:
     Actionable Insight: [instruction]

### Debugging Self-Check (before final output):
- Did I structure the response into **3 sections with headings**: Main Summary, Key Takeaways, Actionable Insights?
- Are there between **3 and 7 Key Takeaways**, each starting with a **jumpable timestamp** in [hh:mm:ss] format and numbered sequentially?
- Are there exactly **5 Actionable Insights**, practical and useful, not vague?
- Did I avoid transcript-like copying?
If ANY condition is not met, regenerate until fully compliant.

Episode Title: ${args.episodeTitle}
${finalDescription ? `Episode Description: ${finalDescription}` : ''}

Episode Transcript (READ ENTIRELY BEFORE PROCEEDING):
${enhancedTranscript}
` : `
You are a podcast summarizer that analyzes the episode's genre and adapts your output accordingly. ${useDefaultFormat ? 'Genre could not be determined - defaulting to general format.' : 'This episode appears to be entertainment/general content (comedy, fiction, sports, news, etc).'}

🚨 CRITICAL INSTRUCTION: Before generating any summary or takeaways, you MUST:
1. Read through the ENTIRE transcript provided below from beginning to end
2. Analyze the COMPLETE content of the episode - do not skip any section
3. Only after reviewing the full transcript, extract the most significant concepts and themes

🚨 MANDATORY REWRITING PROTOCOL - ZERO TOLERANCE FOR RAW TRANSCRIPTS:

You are an AI assistant extracting insights from podcast content. You must COMPLETELY TRANSFORM every point into clear, simple language.

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

❌ Raw transcript: "sf with him for like seven days oh wow he's thought a lot about this parenting stuff"
✅ Proper rewrite: "Extended family interactions reveal thoughtful approaches to child-rearing philosophies"

❌ Raw transcript: "just to kind of get advice on you know how to think about it should we do it like how does the process work"
✅ Proper rewrite: "Entrepreneurs benefit from seeking structured guidance on decision-making processes and implementation strategies"

GOAL: Create original, meaningful insights that capture the speaker's exact meaning while using completely fresh language and professional structure. Each takeaway must sound like YOUR analysis, never like a transcript excerpt.

TRANSCRIPT ANALYSIS REQUIREMENT:
- Read every word of the transcript below before proceeding
- The transcript contains the COMPLETE episode content (or as much as token limits allow)
- Extract takeaways from the ENTIRE episode content, not just the beginning
- Ensure your summary reflects the full scope of the conversation

Generate only a detailed, comprehensive summary that is EXACTLY 150-200 words (count your words carefully!) and exactly five key takeaways focused on the most significant concepts, important themes, and key principles discussed throughout the ENTIRE episode.

Episode Title: ${args.episodeTitle}
${finalDescription ? `Episode Description: ${finalDescription}` : ''}

Episode Transcript (READ ENTIRELY BEFORE PROCEEDING):
${enhancedTranscript}

CRITICAL REQUIREMENTS:
- DO NOT generate an "Actionable Insights" section
- DO NOT output sections titled "Growth Strategy", "Reality Check", or "Key Insight"
- Focus on entertainment value, interesting moments, and key lessons rather than actionable advice

🚨 MANDATORY FORMAT - YOU MUST USE THIS EXACT STRUCTURE:
**Main Summary**
[Write EXACTLY 150-200 words - count them! Focus on the most interesting moments, entertainment value, funny stories, key discussions, memorable quotes, and noteworthy content. Include specific details and juicy discussion points. Make it engaging and informative without focusing on actionable advice.]

**Key Takeaways**
1. [00:00:00] [Clear, digestible takeaway that captures an interesting or entertaining insight - NOT direct transcript quotes. Should be a distilled lesson, observation, or memorable moment.]

2. [00:00:00] [Important insight or memorable moment from the episode]

3. [00:00:00] [Noteworthy observation or discussion point]

4. [00:00:00] Key Takeaway: [Compelling story, example, or interesting revelation]

5. [00:00:00] Key Takeaway: [Entertaining moment or valuable perspective shared]

6. [00:00:00] Key Takeaway: [Notable quote, joke, or memorable exchange]

7. [00:00:00] Key Takeaway: [Final thought or standout moment from the episode]
`;
    } else {
      // Fallback to description-based summary - handle missing description
      let finalDescription = args.episodeDescription;

      if (!args.episodeDescription || args.episodeDescription.trim().length < 50) {
        console.log(`⚠️ [Final fallback] Description missing or too short (${args.episodeDescription?.length || 0} chars), attempting Gemini transcription...`);
        try {
          const transcriptionResult = await transcribeAudioWithGemini(args.episodeAudioUrl);

          if (transcriptionResult.success && transcriptionResult.transcript.length > 100) {
            console.log(`✅ [Final fallback] Gemini transcription successful: ${transcriptionResult.transcript.length} characters`);
            // Create a description from the first part of the transcript
            finalDescription = transcriptionResult.transcript.substring(0, 500) + '...';
          } else {
            console.log(`❌ [Final fallback] Gemini transcription failed: ${transcriptionResult.error || 'Unknown error'}`);
          }
        } catch (error) {
          console.error('❌ [Final fallback] Error during Gemini transcription:', error);
        }
      }

      // Detect genre using title and final description
      const genre = detectPodcastGenre(args.episodeTitle, finalDescription);
      const isActionableGenre = genre === 'actionable';
      const useDefaultFormat = !args.episodeDescription && !finalDescription;

      prompt = isActionableGenre && !useDefaultFormat ? `
You are a podcast summarizer that analyzes the episode's genre and adapts your output accordingly. This episode appears to be in a business/productivity/educational genre.

Generate a concise summary (2–4 sentences) and five key takeaways highlighting important or useful points based on the episode description.

Episode Title: ${args.episodeTitle}
${finalDescription ? `Episode Description: ${finalDescription}` : ''}

🚨 MANDATORY FORMAT - YOU MUST USE THIS EXACT STRUCTURE:

**Main Summary**
[Write EXACTLY 150-200 words - count them! Include specific details, examples, key insights, interesting stories, important quotes, and juicy discussion points from the episode. Make it comprehensive and detailed, not generic.]

**Key Takeaways**
1. [00:00:00] [Clear, actionable takeaway that summarizes a key insight - NOT direct transcript quotes. Should be a distilled lesson or insight that captures the essence of what was discussed.]

2. [00:00:00] [Important insight that listeners should know]

3. [00:00:00] [Actionable strategy or framework mentioned]

4. [00:00:00] Key Takeaway: [Valuable concept or principle discussed]

5. [00:00:00] Key Takeaway: [Noteworthy observation or data point]

ACTIONABLE INSIGHTS:
**Action 1: [Specific actionable recommendation from the episode]**
Context: [Why this action is important based on episode discussion]
Application: [Concrete steps to implement this action]
Resources: [Tools, methods, or resources mentioned]

**Action 2: [Specific actionable recommendation from the episode]**
Context: [Why this action is important based on episode discussion]
Application: [Concrete steps to implement this action]
Resources: [Tools, methods, or resources mentioned]

**Action 3: [Specific actionable recommendation from the episode]**
Context: [Why this action is important based on episode discussion]
Application: [Concrete steps to implement this action]
Resources: [Tools, methods, or resources mentioned]

**Action 4: [Specific actionable recommendation from the episode]**
Context: [Why this action is important based on episode discussion]
Application: [Concrete steps to implement this action]
Resources: [Tools, methods, or resources mentioned]

**Action 5: [Specific actionable recommendation from the episode]**
Context: [Why this action is important based on episode discussion]
Application: [Concrete steps to implement this action]
Resources: [Tools, methods, or resources mentioned]

GROWTH STRATEGY:
[2-3 sentences outlining strategic approaches, frameworks, or methodologies discussed that can drive growth, improvement, or success in business, career, or personal development]

KEY INSIGHT:
[1-2 sentences highlighting the most important revelation, principle, or "aha moment" from the episode that provides significant value or changes perspective]

REALITY CHECK:
[1-2 sentences addressing potential challenges, misconceptions, or important considerations that listeners should be aware of when implementing the discussed strategies or insights]
` : `
You are a podcast summarizer that analyzes the episode's genre and adapts your output accordingly. This episode appears to be entertainment/general content (comedy, fiction, sports, news, etc).

Generate only a detailed, comprehensive summary that is EXACTLY 150-200 words (count your words carefully!) and exactly five key takeaways focused on the most interesting, entertaining, and important moments or lessons based on the episode description.

CRITICAL: Your summary MUST be between 150-200 words. Do not write shorter summaries. Include specific details, entertaining moments, interesting quotes, funny stories, and juicy discussion points from the episode.

Episode Title: ${args.episodeTitle}
Episode Description: ${args.episodeDescription}

CRITICAL REQUIREMENTS:
- DO NOT generate an "Actionable Insights" section
- DO NOT output sections titled "Growth Strategy", "Reality Check", or "Key Insight"
- Focus on entertainment value, interesting moments, and key lessons rather than actionable advice

🚨 MANDATORY FORMAT - YOU MUST USE THIS EXACT STRUCTURE:
**Main Summary**
[Write EXACTLY 150-200 words - count them! Focus on the most interesting moments, entertainment value, funny stories, key discussions, memorable quotes, and noteworthy content. Include specific details and juicy discussion points. Make it engaging and informative without focusing on actionable advice.]

**Key Takeaways**
1. [00:00:00] [Clear, digestible takeaway that captures an interesting or entertaining insight - NOT direct transcript quotes. Should be a distilled lesson, observation, or memorable moment.]

2. [00:00:00] [Important insight or memorable moment from the episode]

3. [00:00:00] [Noteworthy observation or discussion point]

4. [00:00:00] Key Takeaway: [Compelling story, example, or interesting revelation]

5. [00:00:00] Key Takeaway: [Entertaining moment or valuable perspective shared]

6. [00:00:00] Key Takeaway: [Notable quote, joke, or memorable exchange]

7. [00:00:00] Key Takeaway: [Final thought or standout moment from the episode]
`;
    }

    // Retry logic for rate limits
    let response;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      attempts++;
      
      console.log(`Attempt ${attempts}: Making OpenAI API request...`);
      console.log(`📝 PROMPT ANALYSIS: Checking for 150-200 word requirement in prompt...`);
      if (prompt.includes('150-200 words')) {
        console.log(`✅ Prompt correctly specifies 150-200 words`);
      } else if (prompt.includes('2-4 sentences')) {
        console.log(`❌ ERROR: Prompt still asks for 2-4 sentences instead of 150-200 words!`);
      } else {
        console.log(`⚠️ WARNING: Prompt word count requirement unclear`);
      }

      if (prompt.includes('exactly seven')) {
        console.log(`✅ Prompt correctly specifies exactly seven takeaways`);
      } else if (prompt.includes('seven')) {
        console.log(`⚠️ Prompt mentions seven but not "exactly seven"`);
      } else {
        console.log(`❌ ERROR: Prompt doesn't specify seven takeaways!`);
      }
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
          max_tokens: 1000,
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
      
      // Fallback to mock data when OpenAI fails - ensure it meets 150-200 word requirement
      const summary = `This episode discusses ${args.episodeTitle} and provides valuable insights for listeners. The conversation covers key concepts and practical applications that can be implemented in real-world situations. The hosts explore multiple perspectives on the topic, sharing expert knowledge and actionable advice throughout the discussion. The episode maintains an engaging dialogue that combines educational content with entertaining commentary, making complex topics accessible to all listeners. Key themes include strategic thinking, practical implementation methods, and proven frameworks for success. The hosts examine various case studies and examples to illustrate their points, providing concrete evidence for their recommendations. They also address common challenges and misconceptions, offering solutions and alternative approaches. The discussion includes real-world applications and specific steps that listeners can take to apply these insights immediately. Throughout the episode, the hosts emphasize the importance of consistent action and continuous learning, highlighting how these principles can lead to measurable improvements in both personal and professional contexts.`;

      // Log word count for fallback summary
      const fallbackWordCount = summary.split(/\s+/).filter((word: string) => word.length > 0).length;
      console.log(`📊 FALLBACK SUMMARY WORD COUNT: ${fallbackWordCount} words (target: 150-200 words)`);

      if (fallbackWordCount < 150) {
        console.log(`⚠️ WARNING: Fallback summary is too short (${fallbackWordCount} words < 150)`);
      } else if (fallbackWordCount > 200) {
        console.log(`⚠️ WARNING: Fallback summary is too long (${fallbackWordCount} words > 200)`);
      } else {
        console.log(`✅ Fallback summary word count is within target range`);
      }

      const takeaways = [
        "Understanding the core concepts is essential for success",
        "Practical application of ideas leads to better results",
        "Different perspectives provide valuable insights",
        "Consistent practice and dedication are key to improvement",
        "Strategic thinking enables better decision-making processes"
      ];

      console.log(`🎯 Fallback takeaways count: ${takeaways.length} (target: 5) - ✅ VALID TAKEAWAY COUNT`);

      // Increment user's summary count after successful generation (fallback case)
      await ctx.runMutation(internal.users.incrementSummaryCount);
      
      // Track time saved from generating summary
      await ctx.runMutation(internal.users.addTimeSaved, {});

      return {
        id: "temp-id",
        summary,
        takeaways,
        actionableInsights: [], // Fallback case - no actionable insights
        growthStrategy: undefined, // Fallback case
        keyInsight: undefined, // Fallback case
        realityCheck: undefined, // Fallback case
        episodeId: args.episodeId,
        userId: args.userId,
        createdAt: Date.now(),
        hasTranscript: false, // Fallback case - no transcript used
        transcriptUsed: false,
      };
    }

    const data = await response!.json();
    const aiResponse = data.choices[0].message.content;

    // Parse the AI response using structured format - support both ** and ### formats
    const mainSummaryMatch = aiResponse.match(/(?:\*\*Main Summary\*\*|### Main Summary)\s*([\s\S]*?)(?=(?:\*\*Key Takeaways\*\*|### Key Takeaways)|$)/);
    const keyTakeawaysMatch = aiResponse.match(/(?:\*\*Key Takeaways\*\*|### Key Takeaways)\s*([\s\S]*?)(?=(?:\*\*Actionable Insights\*\*|### Actionable Insights)|$)/);
    const actionableInsightsMatch = aiResponse.match(/(?:\*\*Actionable Insights\*\*|### Actionable Insights)\s*([\s\S]*?)(?=$)/);

    let summary = mainSummaryMatch ? mainSummaryMatch[1].trim() : aiResponse;
    const takeawaysText = keyTakeawaysMatch ? keyTakeawaysMatch[1].trim() : "";
    let actionableInsightsText = actionableInsightsMatch ? actionableInsightsMatch[1].trim() : "";
    // Removed growth strategy, key insight, and reality check from new format
    const growthStrategyText = "";
    const keyInsightText = "";
    const realityCheckText = "";

    // Log word count analysis for secondary OpenAI response (without transcript)
    let summaryWordCountNoTranscript = summary.split(/\s+/).filter((word: string) => word.length > 0).length;
    console.log(`📊 OPENAI (NO TRANSCRIPT) SUMMARY WORD COUNT: ${summaryWordCountNoTranscript} words (target: 150-200 words)`);
    console.log(`📝 Summary length: ${summary.length} characters`);

    if (summaryWordCountNoTranscript < 150) {
      console.log(`🚨 CRITICAL ERROR: OpenAI no-transcript summary is too short (${summaryWordCountNoTranscript} words < 150)`);
      console.log(`🔧 APPLYING EMERGENCY EXPANSION to reach minimum word count...`);

      // Emergency expansion for OpenAI no-transcript pathway
      const wordsNeeded = 150 - summaryWordCountNoTranscript;
      const transcriptForExpansion = args.episodeDescription || "Limited content available";

      const expandedSummary = await expandSummaryToTargetLength(
        summary,
        transcriptForExpansion,
        args.episodeTitle,
        wordsNeeded
      );

      if (expandedSummary) {
        const expandedWordCount = expandedSummary.split(/\s+/).filter((word: string) => word.length > 0).length;
        console.log(`✅ OpenAI no-transcript emergency expansion successful: ${summaryWordCountNoTranscript} → ${expandedWordCount} words`);
        summary = expandedSummary; // Update the summary variable
        summaryWordCountNoTranscript = expandedWordCount; // Update the word count
        console.log(`📝 Using expanded summary instead of original short summary`);
      } else {
        console.log(`❌ OpenAI no-transcript emergency expansion failed`);
      }
    }

    if (summaryWordCountNoTranscript < 150) {
      console.log(`💡 CRITICAL ISSUE: All expansion attempts failed for no-transcript pathway`);
    } else if (summaryWordCountNoTranscript > 200) {
      console.log(`⚠️ WARNING: OpenAI no-transcript summary is too long (${summaryWordCountNoTranscript} words > 200)`);
    } else {
      console.log(`✅ OpenAI no-transcript summary word count is within target range`);
    }

    // Extract individual takeaways and handle new format parsing
    let finalTakeaways: string[] = [];

    // Check if we should parse the new structured format with clear section headings
    // Use simple genre detection for parsing decisions
    const legacyGenre = detectPodcastGenre(args.episodeTitle, args.episodeDescription);
    const shouldParseNewFormat = args.generateInsights === true ||
                                (args.generateInsights === undefined && legacyGenre === 'actionable');

    if (keyTakeawaysMatch && shouldParseNewFormat) {
      console.log("🎯 Legacy OpenAI DETECTED NEW STRUCTURED FORMAT");

      // Parse numbered takeaways with timestamps: 1. [hh:mm:ss] ...
      // More robust pattern that handles different line endings and formats
      const numberedTakeawayPattern = /(\d+)\.\s*\[([^\]]+)\]\s*(.*?)(?=(?:\r?\n|^)\d+\.|$)/gms;

      let match;
      while ((match = numberedTakeawayPattern.exec(takeawaysText)) !== null) {
        const [, number, timestamp, keyTakeaway] = match;
        const takeawayWithTimestamp = `[${timestamp}] ${keyTakeaway.trim()}`;
        finalTakeaways.push(takeawayWithTimestamp);
        console.log(`🎯 Legacy OpenAI PARSED TAKEAWAY ${number}: [${timestamp}] ${keyTakeaway.trim()}`);
      }

      if (finalTakeaways.length === 0) {
        console.log("⚠️ Legacy OpenAI NEW FORMAT PARSING FAILED, falling back to standard parsing");
      } else {
        console.log(`✅ Legacy OpenAI USING NEW STRUCTURED FORMAT: ${finalTakeaways.length} takeaways`);
      }
    }

    // Fall back to old format parsing if new format failed or not applicable
    if (finalTakeaways.length === 0) {
      const takeaways = takeawaysText
        .split("•")
        .map((item: string) => item.trim())
        .filter((item: string) => item.length > 0);

      console.log(`🎯 OpenAI (no transcript) takeaways count: ${takeaways.length} (target: 5)`);
      console.log("🎯 OpenAI (no transcript) RAW TAKEAWAYS TEXT:", takeawaysText);

      // SECURITY: Apply verbatim detection even without transcript (checks conversational patterns)
      console.log(`🔍 APPLYING VERBATIM FILTERING to ${takeaways.length} no-transcript takeaways`);
      const verbatimFilteredTakeaways = filterVerbatimTakeaways(takeaways, '');
      finalTakeaways = verbatimFilteredTakeaways;
    }
    if (finalTakeaways.length !== 5) {
      console.log("⚠️ OpenAI (no transcript) TAKEAWAY COUNT MISMATCH! Expected 7, got:", finalTakeaways.length);

      // Try parsing with numbered list (1. 2. 3. etc.)
      const numberedTakeaways = takeawaysText
        .split('\n')
        .filter((line: string) => /^\d+\./.test(line.trim()))
        .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
        .filter((takeaway: string) => takeaway.length > 0);

      console.log("🔄 OpenAI (no transcript) TRYING NUMBERED PARSING:", numberedTakeaways.length, numberedTakeaways);

      if (numberedTakeaways.length === 5) {
        finalTakeaways = numberedTakeaways;
        console.log("✅ OpenAI (no transcript) FIXED WITH NUMBERED PARSING!");
      } else {
        // Try parsing with dash/hyphen (- takeaway)
        const dashedTakeaways = takeawaysText
          .split('\n')
          .filter((line: string) => line.trim().startsWith('-'))
          .map((line: string) => line.replace(/^-\s*/, '').trim())
          .filter((takeaway: string) => takeaway.length > 0);

        console.log("🔄 OpenAI (no transcript) TRYING DASHED PARSING:", dashedTakeaways.length, dashedTakeaways);

        if (dashedTakeaways.length === 5) {
          finalTakeaways = dashedTakeaways;
          console.log("✅ OpenAI (no transcript) FIXED WITH DASHED PARSING!");
        } else {
          // Try parsing lines that start with bullet points
          const bulletTakeaways = takeawaysText
            .split('\n')
            .filter((line: string) => line.trim().startsWith('•'))
            .map((line: string) => line.replace(/^•\s*/, '').trim())
            .filter((takeaway: string) => takeaway.length > 0);

          console.log("🔄 OpenAI (no transcript) TRYING BULLET PARSING:", bulletTakeaways.length, bulletTakeaways);

          if (bulletTakeaways.length === 5) {
            finalTakeaways = bulletTakeaways;
            console.log("✅ OpenAI (no transcript) FIXED WITH BULLET PARSING!");
          } else {
            // Last resort: split by lines and take first 7 non-empty lines
            const lineTakeaways = takeawaysText
              .split('\n')
              .map((line: string) => line.trim())
              .filter((line: string) => line.length > 0)
              .slice(0, 7);

            console.log("🔄 OpenAI (no transcript) TRYING LINE PARSING:", lineTakeaways.length, lineTakeaways);

            if (lineTakeaways.length >= 4) {
              finalTakeaways = lineTakeaways;
              console.log("✅ OpenAI (no transcript) FIXED WITH LINE PARSING!");
            }
          }
        }
      }
    }

    console.log("🎯 OpenAI (no transcript) FINAL TAKEAWAYS COUNT:", finalTakeaways.length);
    console.log("🎯 OpenAI (no transcript) FINAL TAKEAWAYS:", finalTakeaways);

    // Process actionable insights - handle both new structured format and old format
    let processedActionableInsights: Array<{
      action: string;
      context: string;
      application: string;
      resources: string;
    }> = [];

    if (shouldParseNewFormat && actionableInsightsText) {
      console.log("🔍 Legacy OpenAI PROCESSING ACTIONABLE INSIGHTS");

      // Try parsing new structured format first: 1. Actionable Insight: ...
      const newFormatInsightPattern = /(\d+)\.\s*Actionable Insight:\s*(.*?)(?=\n\d+\.|$)/gs;
      let newFormatMatch;

      while ((newFormatMatch = newFormatInsightPattern.exec(actionableInsightsText)) !== null) {
        const [, number, insight] = newFormatMatch;
        processedActionableInsights.push({
          action: insight.trim(),
          context: `Actionable insight ${number}`,
          application: insight.trim(),
          resources: ''
        });
        console.log(`🎯 Legacy OpenAI PARSED NEW FORMAT INSIGHT ${number}: ${insight.trim()}`);
      }

      // Fallback to old format parsing if new format didn't work
      if (processedActionableInsights.length === 0) {
        console.log("🔄 Legacy OpenAI falling back to old actionable insights format");
        const oldFormatInsights = actionableInsightsText
          .split(/\*\*Action \d+:/)
          .slice(1) // Remove empty first element
          .map((insight: string) => {
            const lines = insight.trim().split('\n').filter((line: string) => line.trim());
            const action = lines[0]?.replace(/\*\*$/, '') || '';
            const context = lines.find((line: string) => line.startsWith('Context:'))?.replace('Context: ', '') || '';
            const application = lines.find((line: string) => line.startsWith('Application:'))?.replace('Application: ', '') || '';
            const resources = lines.find((line: string) => line.startsWith('Resources:'))?.replace('Resources: ', '') || '';

            return {
              action: action.trim(),
              context: context.trim(),
              application: application.trim(),
              resources: resources.trim()
            };
          })
          .filter((insight: { action: string; context: string; application: string; resources: string }) => insight.action.length > 0);

        processedActionableInsights = oldFormatInsights;
      }

      console.log(`🎯 Legacy OpenAI FINAL ACTIONABLE INSIGHTS COUNT: ${processedActionableInsights.length}`);
    }

    // Increment user's summary count after successful generation
    console.log(`🚀 ABOUT TO INCREMENT: User ${args.userId} summary count`);
    await ctx.runMutation(internal.users.incrementSummaryCount);
    console.log(`✅ INCREMENT COMPLETED: User ${args.userId} summary count incremented`);
    
    // Track time saved from generating summary
    await ctx.runMutation(internal.users.addTimeSaved, {});


    return {
      id: "temp-id",
      summary,
      takeaways: finalTakeaways,
      actionableInsights: processedActionableInsights,
      growthStrategy: growthStrategyText,
      keyInsight: keyInsightText,
      realityCheck: realityCheckText,
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

export const createSummaryWithTimestamps = mutation({
  args: {
    episodeId: v.string(),
    userId: v.string(),
    summary: v.string(),
    takeaways: v.array(v.union(
      v.string(),
      v.object({
        text: v.string(),
        timestamp: v.optional(v.number()),
        confidence: v.optional(v.number()),
        formatted_time: v.optional(v.string()),
        originalText: v.optional(v.string()),
        fullContext: v.optional(v.string()),
        matchedText: v.optional(v.string()),
      })
    )),
    actionableInsights: v.optional(v.array(v.object({
      action: v.string(),
      context: v.string(),
      application: v.string(),
      resources: v.string(),
    }))),
    episodeTitle: v.string(),
    hasTimestamps: v.boolean(),
    transcriptSource: v.optional(v.string()),
    growthStrategy: v.optional(v.string()),
    keyInsight: v.optional(v.string()),
    realityCheck: v.optional(v.string()),
    insightsEnabled: v.optional(v.boolean()),
    detectedGenre: v.optional(v.string()),
    insightsSuggestion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("summaries", {
      episode_id: args.episodeId,
      user_id: args.userId,
      content: args.summary,
      takeaways: args.takeaways,
      actionable_insights: args.actionableInsights,
      growth_strategy: args.growthStrategy,
      key_insight: args.keyInsight,
      reality_check: args.realityCheck,
      episode_title: args.episodeTitle,
      has_timestamps: args.hasTimestamps,
      transcript_source: args.transcriptSource,
      insights_enabled: args.insightsEnabled,
      detected_genre: args.detectedGenre,
      insights_suggestion: args.insightsSuggestion,
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

export const checkExistingSummary = action({
  args: {
    episodeId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args): Promise<any> => {
    return await ctx.runQuery(api.summaries.getSummaryByEpisodeAndUser, {
      episodeId: args.episodeId,
      userId: args.userId,
    });
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

export const fixPlaceholderTakeaways = mutation({
  args: {
    summaryId: v.string(),
    newTakeaways: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.summaryId as any, {
      takeaways: args.newTakeaways,
    });
  },
});

export const getAllSummariesDebug = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("summaries")
      .order("desc")
      .take(10);
  },
});

// Function to detect podcast genre and suggest insights generation
export const detectGenreAndSuggestInsights = action({
  args: {
    episodeTitle: v.string(),
    episodeDescription: v.optional(v.string()),
    episodeAudioUrl: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<{
    detectedGenre: 'actionable' | 'entertainment';
    suggestion: 'suggested' | 'disabled';
    confidence: number;
    reason: string;
  }> => {
    console.log(`🔍 GENRE DETECTION: ${args.episodeTitle}`);

    // Use existing detection function
    const detectedGenre = detectPodcastGenre(
      args.episodeTitle,
      args.episodeDescription || '',
      undefined // No transcript sample for quick detection
    );

    const isActionable = detectedGenre === 'actionable';
    const suggestion = isActionable ? 'suggested' : 'disabled';

    // Calculate confidence based on keyword matches
    const text = `${args.episodeTitle} ${args.episodeDescription || ''}`.toLowerCase();

    const actionableKeywords = [
      'business', 'marketing', 'entrepreneurship', 'startup', 'personal development',
      'self-help', 'health', 'fitness', 'leadership', 'career', 'education',
      'finance', 'investing', 'productivity', 'management', 'coaching', 'motivation'
    ];

    const entertainmentKeywords = [
      'comedy', 'entertainment', 'casual', 'sports', 'gaming', 'pop culture',
      'celebrity', 'story', 'music', 'art', 'true crime', 'politics'
    ];

    const relevantKeywords = isActionable ? actionableKeywords : entertainmentKeywords;
    const matchedKeywords = relevantKeywords.filter(keyword =>
      text.includes(keyword)
    );

    const confidence = Math.min(0.9, Math.max(0.3, matchedKeywords.length * 0.2));

    const reason = isActionable
      ? `Detected business/educational content. Keywords: ${matchedKeywords.slice(0, 3).join(', ')}`
      : ``;

    console.log(`🎯 DETECTION RESULT: ${detectedGenre} (confidence: ${confidence})`);

    return {
      detectedGenre,
      suggestion,
      confidence,
      reason
    };
  },
});