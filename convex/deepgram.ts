import { createClient } from "@deepgram/sdk";

export interface DeepgramWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  punctuated_word?: string;
}

export interface DeepgramTranscript {
  transcript: string;
  words: DeepgramWord[];
  confidence: number;
  summary?: string;
}

export interface DeepgramResponse {
  transcript: DeepgramTranscript;
  metadata: {
    transaction_key: string;
    request_id: string;
    sha256: string;
    created: string;
    duration: number;
    channels: number;
  };
}

/**
 * Transcribe audio using Deepgram Nova model with timestamps
 */
export async function transcribeAudio(audioUrl: string): Promise<DeepgramResponse> {
  // Validate environment
  if (!process.env.DEEPGRAM_API_KEY) {
    throw new Error("DEEPGRAM_API_KEY environment variable is not set");
  }

  // Validate audio URL
  if (!audioUrl || typeof audioUrl !== 'string') {
    throw new Error("Invalid audio URL provided");
  }

  // Initialize Deepgram client
  const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

  try {
    console.log(`🎙️ Starting Deepgram transcription for: ${audioUrl}`);
    console.log(`🔑 Using API key: ${process.env.DEEPGRAM_API_KEY?.substring(0, 10)}...`);
    
    // Configure transcription options
    const options = {
      model: "nova-2",           // Latest Nova model
      smart_format: true,        // Better punctuation and formatting
      timestamps: true,          // Word-level timestamps
      paragraphs: true,          // Paragraph segmentation
      utterances: true,          // Speaker turn detection
      diarize: false,           // Speaker diarization (disabled for podcasts)
      language: "en",           // English language
      punctuate: true,          // Add punctuation
      profanity_filter: false,  // Keep original content
      redact: false,            // Don't redact PII
      summarize: false,         // We'll do our own summarization
      detect_language: false,   // Assume English
      filler_words: false,      // Remove filler words for cleaner transcript
    };

    // Make transcription request
    const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
      { url: audioUrl },
      options
    );

    if (error) {
      throw error;
    }

    // Validate response structure
    if (!result?.results?.channels?.[0]?.alternatives?.[0]) {
      throw new Error("Invalid response structure from Deepgram API");
    }

    const transcript = result.results.channels[0].alternatives[0];
    const metadata = result.metadata;

    // Validate essential data
    if (!transcript.transcript) {
      throw new Error("No transcript content received from Deepgram");
    }

    if (!transcript.words || transcript.words.length === 0) {
      console.warn("⚠️ No word timestamps received from Deepgram");
    }

    const transcriptLength = transcript.transcript.length;
    const transcriptWordCount = transcript.transcript.split(/\s+/).filter(word => word.length > 0).length;

    console.log(`✅ Deepgram transcription completed: ${transcript.words?.length || 0} timestamped words, confidence: ${transcript.confidence}`);
    console.log(`📊 TRANSCRIPT ANALYSIS: ${transcriptWordCount} words, ${transcriptLength} characters`);
    console.log(`🎙️ TRANSCRIPT SAMPLE (first 200 chars): "${transcript.transcript.substring(0, 200)}..."`);

    if (transcriptWordCount < 1000) {
      console.log(`⚠️ WARNING: Transcript seems short for a full episode (${transcriptWordCount} words)`);
    } else {
      console.log(`✅ Transcript length appears appropriate for full episode`);
    }

    return {
      transcript: {
        transcript: transcript.transcript,
        words: transcript.words || [],
        confidence: transcript.confidence || 0,
      },
      metadata: {
        transaction_key: metadata.transaction_key,
        request_id: metadata.request_id,
        sha256: metadata.sha256,
        created: metadata.created,
        duration: metadata.duration,
        channels: metadata.channels,
      }
    };

  } catch (error: any) {
    console.error("❌ Deepgram transcription failed:", error);
    
    // Enhanced error handling with specific error types
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      throw new Error("Invalid Deepgram API key or insufficient permissions");
    } else if (error.message?.includes('402') || error.message?.includes('Payment Required')) {
      throw new Error("Deepgram account has insufficient credits");
    } else if (error.message?.includes('429') || error.message?.includes('Rate Limit')) {
      throw new Error("Deepgram API rate limit exceeded - please try again later");
    } else if (error.message?.includes('404') || error.message?.includes('Not Found')) {
      throw new Error("Audio file not found or inaccessible");
    } else if (error.message?.includes('timeout')) {
      throw new Error("Transcription request timed out - audio file may be too large");
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      throw new Error("Network error - unable to connect to Deepgram API");
    } else {
      throw new Error(`Deepgram transcription failed: ${error.message || 'Unknown error'}`);
    }
  }
}

/**
 * Find timestamp for a specific text segment in the transcript
 */
export function findTimestampForText(
  text: string,
  words: DeepgramWord[],
  searchWindow: number = 25,  // Increased window for better context matching
  usedTimestamps: number[] = []  // Array of already used timestamps to avoid duplicates
): {
  timestamp: number;
  confidence: number;
  matchedText?: string;
  fullContext?: string;
  matchCount?: number;
  totalSearchTerms?: number;
  accuracyScore?: number;  // New: Overall accuracy score
  contextQuality?: number; // New: Context quality score
} | null {
  if (!text || !words || words.length === 0) {
    return null;
  }

  // Enhanced text normalization for better matching
  const normalizedSearchText = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Split into search terms with better filtering
  const allTerms = normalizedSearchText.split(' ');
  const searchTerms = allTerms.filter(term => {
    // Filter out very short terms, common stop words, and non-meaningful words
    const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'];
    return term.length > 2 && !stopWords.includes(term);
  });

  // Identify key terms (longer, more meaningful words)
  const keyTerms = searchTerms.filter(term => term.length > 4);

  if (searchTerms.length === 0) {
    return null;
  }

  console.log(`🔍 ENHANCED SEARCH: "${text.substring(0, 100)}..." -> ${searchTerms.length} terms (${keyTerms.length} key terms)`);
  console.log(`🎯 Search terms: [${searchTerms.slice(0, 5).join(', ')}${searchTerms.length > 5 ? '...' : ''}]`);
  console.log(`🎯 Key terms: [${keyTerms.slice(0, 3).join(', ')}${keyTerms.length > 3 ? '...' : ''}]`);

  let bestMatch = {
    startIndex: -1,
    matchCount: 0,
    keyMatchCount: 0,
    confidence: 0,
    accuracyScore: 0,
    contextQuality: 0,
    sequentialMatches: 0, // New: Count sequential word matches
    exactPhraseBonus: 0,  // New: Bonus for exact phrase matches
  };

  // Search for the best matching segment
  for (let i = 0; i <= words.length - searchWindow; i++) {
    const currentTimestamp = words[i].start;

    // Skip if this timestamp is too close to an already used one (within 15 seconds for better distribution)
    const isTimestampTooClose = usedTimestamps.some(usedTime =>
      Math.abs(currentTimestamp - usedTime) < 15
    );
    if (isTimestampTooClose) {
      continue;
    }

    const windowWords = words.slice(i, i + searchWindow);
    const windowText = windowWords
      .map(w => w.word.toLowerCase())
      .join(' ')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ');

    // Enhanced matching with multiple scoring factors
    let matchCount = 0;
    let keyMatchCount = 0;
    let totalConfidence = 0;
    let sequentialMatches = 0;
    let exactPhraseBonus = 0;

    // Check for exact phrase matches (higher weight)
    const shortPhrases = [];
    for (let j = 0; j < searchTerms.length - 1; j++) {
      shortPhrases.push(`${searchTerms[j]} ${searchTerms[j + 1]}`);
    }

    for (const phrase of shortPhrases) {
      if (windowText.includes(phrase)) {
        exactPhraseBonus += 2; // Significant bonus for phrase matches
      }
    }

    // Count individual term matches
    for (const term of searchTerms) {
      if (windowText.includes(term)) {
        matchCount++;
        if (keyTerms.includes(term)) {
          keyMatchCount++;
        }

        // Find the matching word and add its confidence
        const matchingWord = windowWords.find(w =>
          w.word.toLowerCase().includes(term) || term.includes(w.word.toLowerCase())
        );
        if (matchingWord) {
          totalConfidence += matchingWord.confidence || 0.5;
        }
      }
    }

    // Check for sequential matches (words appearing in order)
    let searchIndex = 0;
    for (const windowWord of windowWords) {
      if (searchIndex < searchTerms.length &&
          windowWord.word.toLowerCase().includes(searchTerms[searchIndex])) {
        sequentialMatches++;
        searchIndex++;
      }
    }

    // Calculate enhanced accuracy score
    const matchRatio = matchCount / searchTerms.length;
    const keyMatchRatio = keyTerms.length > 0 ? keyMatchCount / keyTerms.length : 0;
    const sequentialRatio = sequentialMatches / searchTerms.length;
    const avgConfidence = totalConfidence / Math.max(matchCount, 1);

    const accuracyScore = (
      matchRatio * 0.4 +           // 40% weight for overall matches
      keyMatchRatio * 0.3 +        // 30% weight for key term matches
      sequentialRatio * 0.2 +      // 20% weight for sequential matches
      (exactPhraseBonus / 10) * 0.1 // 10% weight for phrase matches
    ) * avgConfidence;

    const contextQuality = (matchCount + keyMatchCount + sequentialMatches + exactPhraseBonus) /
                          (searchTerms.length + keyTerms.length + 5);

    // Update best match with enhanced criteria
    const isNewBest =
      accuracyScore > bestMatch.accuracyScore ||
      (Math.abs(accuracyScore - bestMatch.accuracyScore) < 0.1 &&
       (keyMatchCount > bestMatch.keyMatchCount ||
        (keyMatchCount === bestMatch.keyMatchCount && exactPhraseBonus > bestMatch.exactPhraseBonus)));

    if (isNewBest) {
      bestMatch = {
        startIndex: i,
        matchCount,
        keyMatchCount,
        confidence: avgConfidence,
        accuracyScore,
        contextQuality,
        sequentialMatches,
        exactPhraseBonus,
      };
    }
  }

  // Return result with enhanced validation criteria
  const minAccuracyThreshold = 0.3; // Minimum accuracy score required
  const hasDecentMatch = bestMatch.accuracyScore >= minAccuracyThreshold &&
                        bestMatch.startIndex >= 0 &&
                        (bestMatch.matchCount >= Math.max(1, Math.ceil(searchTerms.length * 0.2)) ||
                         bestMatch.keyMatchCount >= 1 ||
                         bestMatch.exactPhraseBonus >= 2);

  if (hasDecentMatch) {
    // Get the context around the match for validation
    const contextStart = Math.max(0, bestMatch.startIndex - 5);
    const contextEnd = Math.min(words.length, bestMatch.startIndex + searchWindow + 5);
    const matchedText = words.slice(bestMatch.startIndex, bestMatch.startIndex + searchWindow)
      .map(w => w.word).join(' ');
    const fullContext = words.slice(contextStart, contextEnd)
      .map(w => w.word).join(' ');

    console.log(`✅ ENHANCED MATCH FOUND: accuracy=${bestMatch.accuracyScore.toFixed(3)}, matches=${bestMatch.matchCount}/${searchTerms.length}, key=${bestMatch.keyMatchCount}/${keyTerms.length}, seq=${bestMatch.sequentialMatches}, phrase=${bestMatch.exactPhraseBonus}`);
    console.log(`📍 Timestamp: ${formatTimestamp(words[bestMatch.startIndex].start)}`);
    console.log(`🎯 Context: "${matchedText.substring(0, 100)}..."`);

    return {
      timestamp: words[bestMatch.startIndex].start,
      confidence: Math.min(bestMatch.confidence, 1.0),
      matchedText,
      fullContext,
      matchCount: bestMatch.matchCount,
      totalSearchTerms: searchTerms.length,
      accuracyScore: bestMatch.accuracyScore,
      contextQuality: bestMatch.contextQuality,
    };
  }

  return null;
}

/**
 * Find timestamps for multiple takeaways, ensuring good distribution across audio duration
 */
export function findTimestampsForTakeaways(
  takeaways: string[],
  words: DeepgramWord[],
  searchWindow: number = 20
): Array<{
  text: string;
  timestamp?: number;
  confidence?: number;
  matchedText?: string;
  fullContext?: string;
  matchCount?: number;
  totalSearchTerms?: number;
}> {
  if (!takeaways || !words || words.length === 0) {
    return takeaways.map(text => ({ text }));
  }

  const usedTimestamps: number[] = [];
  const audioDuration = words[words.length - 1]?.end || 0;
  const results: Array<{
    text: string;
    timestamp?: number;
    confidence?: number;
    matchedText?: string;
    fullContext?: string;
    matchCount?: number;
    totalSearchTerms?: number;
  }> = [];

  // For each takeaway, find the best timestamp that hasn't been used
  for (const takeaway of takeaways) {
    const timestampResult = findTimestampForText(takeaway, words, searchWindow, usedTimestamps);

    if (timestampResult) {
      usedTimestamps.push(timestampResult.timestamp);
      results.push({
        text: takeaway,
        timestamp: timestampResult.timestamp,
        confidence: timestampResult.confidence,
        matchedText: timestampResult.matchedText,
        fullContext: timestampResult.fullContext,
        matchCount: timestampResult.matchCount,
        totalSearchTerms: timestampResult.totalSearchTerms,
      });

      console.log(`✅ Found unique timestamp for "${takeaway.substring(0, 50)}...": ${formatTimestamp(timestampResult.timestamp)} (confidence: ${(timestampResult.confidence * 100).toFixed(1)}%)`);
    } else {
      results.push({ text: takeaway });
      console.log(`❌ No unique timestamp found for: "${takeaway.substring(0, 50)}..."`);
    }
  }

  // Log distribution quality
  if (usedTimestamps.length > 1) {
    usedTimestamps.sort((a, b) => a - b);
    const avgGap = audioDuration / usedTimestamps.length;
    const actualGaps = usedTimestamps.slice(1).map((ts, i) => ts - usedTimestamps[i]);
    const gapVariance = actualGaps.reduce((sum, gap) => sum + Math.pow(gap - avgGap, 2), 0) / actualGaps.length;

    console.log(`📊 Timestamp distribution: ${usedTimestamps.length} timestamps across ${formatTimestamp(audioDuration)} (avg gap: ${formatTimestamp(avgGap)}, variance: ${gapVariance.toFixed(1)})`);
  }

  return results;
}

/**
 * Verify that a takeaway's content aligns with what's actually said at the timestamp
 */
export function verifyTakeawayAlignment(
  takeaway: string,
  timestamp: number,
  words: DeepgramWord[],
  contextWindow: number = 30
): {
  isValid: boolean;
  confidence: number;
  reason: string;
  contextSnippet: string;
} {
  if (!takeaway || !words || words.length === 0 || !timestamp) {
    return {
      isValid: false,
      confidence: 0,
      reason: "Missing required parameters",
      contextSnippet: ""
    };
  }

  // Find the word closest to the timestamp
  let closestWordIndex = 0;
  let minTimeDiff = Math.abs(words[0].start - timestamp);

  for (let i = 1; i < words.length; i++) {
    const timeDiff = Math.abs(words[i].start - timestamp);
    if (timeDiff < minTimeDiff) {
      minTimeDiff = timeDiff;
      closestWordIndex = i;
    }
  }

  // Get context window around the timestamp
  const startIndex = Math.max(0, closestWordIndex - contextWindow);
  const endIndex = Math.min(words.length, closestWordIndex + contextWindow);
  const contextWords = words.slice(startIndex, endIndex);
  const contextText = contextWords.map(w => w.word).join(' ');

  // Extract key concepts from the takeaway
  const takeawayTerms = takeaway.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(term => term.length > 3)
    .filter(term => !['this', 'that', 'they', 'them', 'with', 'from', 'have', 'been', 'will', 'would', 'could', 'should', 'might'].includes(term));

  // Check how many key concepts from the takeaway are present in the context
  let matchCount = 0;
  let conceptualMatches = 0; // For related concepts
  const contextLower = contextText.toLowerCase();

  for (const term of takeawayTerms) {
    if (contextLower.includes(term)) {
      matchCount++;
    } else {
      // Check for conceptual matches (synonyms, related terms)
      const synonymMap: { [key: string]: string[] } = {
        'growth': ['grow', 'increase', 'expand', 'development'],
        'business': ['company', 'enterprise', 'organization', 'firm'],
        'strategy': ['approach', 'method', 'plan', 'technique'],
        'success': ['achievement', 'accomplishment', 'victory', 'win'],
        'important': ['crucial', 'critical', 'vital', 'essential', 'significant'],
        'principle': ['rule', 'guideline', 'concept', 'idea'],
        'founder': ['entrepreneur', 'creator', 'leader', 'ceo'],
      };

      if (synonymMap[term]) {
        for (const synonym of synonymMap[term]) {
          if (contextLower.includes(synonym)) {
            conceptualMatches++;
            break;
          }
        }
      }
    }
  }

  const totalMatchRatio = (matchCount + conceptualMatches * 0.5) / Math.max(takeawayTerms.length, 1);

  // Calculate confidence and validation
  const confidence = Math.min(totalMatchRatio * 1.2, 1.0); // Slight boost for good matches
  const isValid = confidence >= 0.4 || (matchCount >= 2 && takeawayTerms.length <= 6);

  let reason = "";
  if (isValid) {
    reason = `Strong alignment: ${matchCount}/${takeawayTerms.length} direct matches, ${conceptualMatches} conceptual matches (confidence: ${(confidence * 100).toFixed(1)}%)`;
  } else {
    reason = `Weak alignment: ${matchCount}/${takeawayTerms.length} direct matches, ${conceptualMatches} conceptual matches (confidence: ${(confidence * 100).toFixed(1)}%). Takeaway may not accurately represent content at this timestamp.`;
  }

  console.log(`🔍 TAKEAWAY VERIFICATION: "${takeaway.substring(0, 50)}..." at ${formatTimestamp(timestamp)}`);
  console.log(`📊 Match analysis: ${matchCount} direct + ${conceptualMatches} conceptual / ${takeawayTerms.length} terms = ${(confidence * 100).toFixed(1)}% confidence`);
  console.log(`${isValid ? '✅' : '❌'} Result: ${reason}`);
  console.log(`📝 Context: "${contextText.substring(0, 150)}..."`);

  return {
    isValid,
    confidence,
    reason,
    contextSnippet: contextText.substring(0, 200) + (contextText.length > 200 ? "..." : "")
  };
}

/**
 * Format seconds into MM:SS or HH:MM:SS format
 */
export function formatTimestamp(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}