import type { DeepgramWord } from "./deepgram";
import { generateEmbeddings } from "./gemini";

export interface TranscriptChunk {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  words: DeepgramWord[];
  embedding?: number[];
}

export interface SemanticMatch {
  chunk: TranscriptChunk;
  similarity: number;
  confidence: number;
  exactTimestamp: number;
}

/**
 * Chunk transcript into overlapping time windows for semantic matching
 * Uses 45-second chunks with 15-second overlap for context preservation
 */
export function chunkTranscriptWithTimestamps(
  transcript: string,
  words: DeepgramWord[]
): TranscriptChunk[] {
  console.log(`📝 CHUNKING TRANSCRIPT: ${transcript.length} chars, ${words.length} words`);

  const CHUNK_DURATION = 45; // seconds
  const OVERLAP_DURATION = 15; // seconds
  const chunks: TranscriptChunk[] = [];

  if (words.length === 0) {
    console.warn('⚠️ No word timestamps available for chunking');
    return chunks;
  }

  const totalDuration = words[words.length - 1].end;
  let chunkStart = 0;
  let chunkIndex = 0;

  while (chunkStart < totalDuration) {
    const chunkEnd = Math.min(chunkStart + CHUNK_DURATION, totalDuration);

    // Find words within this time window
    const chunkWords = words.filter(word =>
      word.start >= chunkStart && word.end <= chunkEnd
    );

    if (chunkWords.length > 0) {
      // Extract text from words in chunk
      const chunkText = chunkWords.map(w => w.word).join(' ');

      // Clean up text (basic sentence boundary awareness)
      const cleanText = chunkText
        .replace(/\s+/g, ' ')
        .replace(/([.!?])\s+([A-Z])/g, '$1 $2') // Preserve sentence boundaries
        .trim();

      chunks.push({
        id: `chunk_${chunkIndex}`,
        text: cleanText,
        startTime: chunkStart,
        endTime: chunkEnd,
        words: chunkWords,
      });

      console.log(`📦 CHUNK ${chunkIndex}: ${chunkStart}s-${chunkEnd}s, ${chunkWords.length} words, ${cleanText.length} chars`);
    }

    chunkIndex++;
    chunkStart += (CHUNK_DURATION - OVERLAP_DURATION); // Move forward with overlap
  }

  console.log(`✅ TRANSCRIPT CHUNKED: ${chunks.length} overlapping chunks created`);
  return chunks;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length !== vectorB.length) {
    throw new Error('Vectors must have the same dimension');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    normA += vectorA[i] * vectorA[i];
    normB += vectorB[i] * vectorB[i];
  }

  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return isNaN(similarity) ? 0 : similarity;
}

/**
 * Calculate topic relevance score based on key terms and concepts
 */
function calculateTopicRelevance(takeaway: string, chunkText: string): number {
  // Extract key terms from takeaway (nouns, verbs, important concepts)
  const takeawayTerms = extractKeyTerms(takeaway);
  const chunkTerms = extractKeyTerms(chunkText);

  if (takeawayTerms.length === 0) return 0;

  // Count semantic matches (not just exact word matches)
  let relevanceMatches = 0;
  let totalTerms = takeawayTerms.length;

  for (const takeawayTerm of takeawayTerms) {
    for (const chunkTerm of chunkTerms) {
      // Semantic relevance scoring
      if (areTermsRelated(takeawayTerm, chunkTerm)) {
        relevanceMatches += 1;
        break; // Count each takeaway term only once
      }
    }
  }

  return Math.min(relevanceMatches / totalTerms, 1.0);
}

/**
 * Calculate word overlap score between takeaway and chunk
 */
function calculateWordOverlap(takeaway: string, chunkText: string): number {
  const takeawayWords = takeaway.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3) // Only meaningful words
    .filter(word => !isStopWord(word));

  const chunkWords = new Set(chunkText.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !isStopWord(word)));

  if (takeawayWords.length === 0) return 0;

  let overlaps = 0;
  for (const word of takeawayWords) {
    if (chunkWords.has(word)) {
      overlaps++;
    }
  }

  return Math.min(overlaps / takeawayWords.length, 1.0);
}

/**
 * Extract key terms from text (simplified NLP)
 */
function extractKeyTerms(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !isStopWord(word))
    .slice(0, 10); // Top 10 key terms
}

/**
 * Check if two terms are semantically related
 */
function areTermsRelated(term1: string, term2: string): boolean {
  // Exact match
  if (term1 === term2) return true;

  // Substring matches
  if (term1.includes(term2) || term2.includes(term1)) return true;

  // Common semantic groups (simplified)
  const semanticGroups = [
    ['money', 'financial', 'investment', 'savings', 'wealth', 'budget'],
    ['success', 'achievement', 'accomplishment', 'winning', 'victory'],
    ['business', 'company', 'startup', 'entrepreneurship', 'enterprise'],
    ['learning', 'education', 'knowledge', 'study', 'skill'],
    ['health', 'fitness', 'wellness', 'medical', 'exercise'],
    ['technology', 'digital', 'software', 'computer', 'tech'],
  ];

  for (const group of semanticGroups) {
    if (group.includes(term1) && group.includes(term2)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if word is a stop word (common words to ignore)
 */
function isStopWord(word: string): boolean {
  const stopWords = new Set([
    'the', 'and', 'but', 'you', 'your', 'that', 'this', 'with', 'have', 'will',
    'been', 'was', 'were', 'are', 'can', 'could', 'would', 'should', 'must',
    'very', 'more', 'most', 'much', 'many', 'some', 'any', 'all', 'each',
    'from', 'about', 'into', 'through', 'during', 'before', 'after'
  ]);
  return stopWords.has(word.toLowerCase());
}

/**
 * Find the best semantic match for a takeaway using embeddings
 * Primary matching algorithm for timestamp assignment
 */
export async function findSemanticTimestamp(
  takeaway: string,
  chunks: TranscriptChunk[]
): Promise<SemanticMatch | null> {
  console.log(`🎯 SEMANTIC MATCHING: "${takeaway.substring(0, 50)}..." against ${chunks.length} chunks`);

  if (chunks.length === 0) {
    console.warn('⚠️ No chunks available for semantic matching');
    return null;
  }

  try {
    // Generate embedding for takeaway with enhanced context
    console.log('🔮 Generating takeaway embedding...');

    // Enhance takeaway with context for better embedding
    const enhancedTakeaway = `Key insight: ${takeaway}. This is an important takeaway from a podcast discussion.`;
    const [takeawayEmbedding] = await generateEmbeddings([enhancedTakeaway]);

    // Ensure all chunks have embeddings
    const chunksWithoutEmbeddings = chunks.filter(c => !c.embedding);
    if (chunksWithoutEmbeddings.length > 0) {
      console.log(`🔮 Generating ${chunksWithoutEmbeddings.length} missing chunk embeddings...`);
      const chunkTexts = chunksWithoutEmbeddings.map(c => c.text);
      const chunkEmbeddings = await generateEmbeddings(chunkTexts);

      // Assign embeddings to chunks
      chunksWithoutEmbeddings.forEach((chunk, i) => {
        chunk.embedding = chunkEmbeddings[i];
      });
    }

    // Calculate similarities
    const similarities = chunks
      .filter(chunk => chunk.embedding)
      .map(chunk => {
        const similarity = calculateCosineSimilarity(takeawayEmbedding, chunk.embedding!);

        return {
          chunk,
          similarity,
          confidence: similarity, // Base confidence on similarity score
          exactTimestamp: chunk.startTime + (chunk.endTime - chunk.startTime) / 2, // Middle of chunk
        };
      })
      .sort((a, b) => b.similarity - a.similarity); // Sort by similarity descending

    console.log(`📊 SIMILARITY SCORES: Top 3 matches: ${similarities.slice(0, 3).map(s =>
      `${s.similarity.toFixed(3)} (${Math.floor(s.exactTimestamp/60)}:${(Math.floor(s.exactTimestamp%60)).toString().padStart(2,'0')})`
    ).join(', ')}`);

    // Multi-factor scoring system for better accuracy
    const SEMANTIC_THRESHOLD = 0.58; // Lowered threshold
    const HIGH_CONFIDENCE_THRESHOLD = 0.70; // For premium matches
    const bestMatch = similarities[0];

    if (bestMatch && bestMatch.similarity >= SEMANTIC_THRESHOLD) {
      // Calculate additional scoring factors
      const topicRelevanceScore = calculateTopicRelevance(takeaway, bestMatch.chunk.text);
      const wordOverlapScore = calculateWordOverlap(takeaway, bestMatch.chunk.text);

      // Multi-factor confidence scoring
      const baseSimilarity = bestMatch.similarity;
      const adjustedConfidence = (baseSimilarity * 0.6) + (topicRelevanceScore * 0.25) + (wordOverlapScore * 0.15);

      console.log(`🔍 MULTI-FACTOR SCORING:`);
      console.log(`   Semantic similarity: ${baseSimilarity.toFixed(3)}`);
      console.log(`   Topic relevance: ${topicRelevanceScore.toFixed(3)}`);
      console.log(`   Word overlap: ${wordOverlapScore.toFixed(3)}`);
      console.log(`   Adjusted confidence: ${adjustedConfidence.toFixed(3)}`);

      // Quality verification - must pass adjusted confidence
      if (adjustedConfidence >= 0.55) {
        const confidenceLevel = adjustedConfidence >= HIGH_CONFIDENCE_THRESHOLD ? 'HIGH' : 'MEDIUM';
        console.log(`✅ SEMANTIC MATCH FOUND (${confidenceLevel}): similarity=${bestMatch.similarity.toFixed(3)}, adjusted=${adjustedConfidence.toFixed(3)}, timestamp=${Math.floor(bestMatch.exactTimestamp/60)}:${(Math.floor(bestMatch.exactTimestamp%60)).toString().padStart(2,'0')}`);

        // Fine-tune timestamp using word-level precision
        const fineTunedTimestamp = findPreciseTimestampInChunk(takeaway, bestMatch.chunk);
        if (fineTunedTimestamp !== null) {
          bestMatch.exactTimestamp = fineTunedTimestamp;
          console.log(`🎯 FINE-TUNED TIMESTAMP: ${Math.floor(fineTunedTimestamp/60)}:${(Math.floor(fineTunedTimestamp%60)).toString().padStart(2,'0')}`);
        }

        // Update confidence with adjusted score
        bestMatch.confidence = adjustedConfidence;
        return bestMatch;
      } else {
        console.log(`⚠️ FAILED MULTI-FACTOR VERIFICATION: ${adjustedConfidence.toFixed(3)} < 0.55 threshold`);
      }
    }

    console.log(`❌ NO SEMANTIC MATCH: Best similarity ${bestMatch?.similarity.toFixed(3) || 'N/A'} < threshold ${SEMANTIC_THRESHOLD}`);
    return null;

  } catch (error) {
    console.error('🚨 SEMANTIC MATCHING ERROR:', error);
    return null;
  }
}

/**
 * Fine-tune timestamp within a matched chunk using word-level analysis
 * Fallback to lexical matching for precise positioning
 */
function findPreciseTimestampInChunk(takeaway: string, chunk: TranscriptChunk): number | null {
  // Extract key terms from takeaway
  const takeawayWords = takeaway
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .slice(0, 5); // Top 5 key terms

  if (takeawayWords.length === 0) {
    return null;
  }

  // Find word with most key term matches
  let bestWord: DeepgramWord | null = null;
  let maxMatches = 0;

  for (const word of chunk.words) {
    const normalizedWord = word.word.toLowerCase().replace(/[^\w]/g, '');
    let matches = 0;

    for (const term of takeawayWords) {
      if (normalizedWord.includes(term) || term.includes(normalizedWord)) {
        matches++;
      }
    }

    if (matches > maxMatches) {
      maxMatches = matches;
      bestWord = word;
    }
  }

  return bestWord ? bestWord.start : null;
}

/**
 * Batch process multiple takeaways for semantic timestamp matching
 * Main interface for integration with existing pipeline
 */
export async function findSemanticTimestamps(
  takeaways: string[],
  chunks: TranscriptChunk[]
): Promise<Array<SemanticMatch | null>> {
  console.log(`🚀 BATCH SEMANTIC MATCHING: ${takeaways.length} takeaways`);

  const results: Array<SemanticMatch | null> = [];

  // Process takeaways sequentially to avoid API rate limits
  for (let i = 0; i < takeaways.length; i++) {
    const takeaway = takeaways[i];
    console.log(`\n📝 Processing takeaway ${i + 1}/${takeaways.length}: "${takeaway.substring(0, 50)}..."`);

    const match = await findSemanticTimestamp(takeaway, chunks);
    results.push(match);

    // Brief pause between requests
    if (i < takeaways.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  const successCount = results.filter(r => r !== null).length;
  console.log(`\n✅ BATCH COMPLETE: ${successCount}/${takeaways.length} takeaways matched (${Math.round(successCount/takeaways.length*100)}% success rate)`);

  return results;
}