import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useAction } from "convex/react";
import { useAuth } from "@clerk/react-router";
import { Link } from "react-router";
import { api } from "../../../convex/_generated/api";
import { useAudio } from "~/contexts/app-context";
import { toast } from "sonner";

export default function AllSummaries() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const { isSignedIn } = useAuth();
  const { state: audioState, seekTo, playEpisode } = useAudio();
  const getEpisodeDetails = useAction(api.podcasts.getEpisodeTranscript);
  const lastSeekTimeRef = useRef<number>(0);
  
  const userQuota = useQuery(
    api.users.getUserQuota,
    isSignedIn ? {} : "skip"
  );
  const userSummaries = useQuery(api.summaries.getUserSummaries, 
    isSignedIn && userQuota?.userId ? { userId: userQuota.userId } : "skip"
  );

  // Filter and sort summaries based on search and sort criteria
  const filteredAndSortedSummaries = useMemo(() => {
    if (!userSummaries) return [];

    let filtered = userSummaries;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = userSummaries.filter(summary => {
        const title = (summary.episode_title || '').toLowerCase();
        const content = (summary.content || '').toLowerCase();
        const takeaways = (summary.takeaways || []).map((t: any) => 
          typeof t === 'object' ? (t.text || JSON.stringify(t)) : String(t)
        ).join(' ').toLowerCase();
        
        return title.includes(query) || 
               content.includes(query) || 
               takeaways.includes(query);
      });
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "newest") {
        return b.created_at - a.created_at;
      } else {
        return a.created_at - b.created_at;
      }
    });

    return sorted;
  }, [userSummaries, searchQuery, sortBy]);

  const handleCopy = async (text: string, summaryId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(summaryId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Helper function to handle timestamp seeking - fetches episode data and seeks
  const handleTimestampSeek = async (timestamp: number, summary: any) => {
    console.log('🎯 TIMESTAMP SEEK STARTED');
    console.log('📍 Seeking to timestamp:', timestamp, 'seconds');
    console.log('🕒 Formatted time:', Math.floor(timestamp / 60) + ':' + Math.floor(timestamp % 60).toString().padStart(2, '0'));
    console.log('📄 Episode:', summary.episode_title);
    console.log('🎯 Current audio state:', audioState);

    // Debounce rapid clicks (prevent multiple seeks within 1 second)
    const now = Date.now();
    if (now - lastSeekTimeRef.current < 1000) {
      console.log('Timestamp seek debounced - too rapid');
      return;
    }
    lastSeekTimeRef.current = now;

    try {
      // Fetch episode details including audio URL
      const episodeDetails = await getEpisodeDetails({ episodeId: summary.episode_id });

      if (!episodeDetails || !episodeDetails.episodeAudio) {
        throw new Error('Episode audio not available');
      }

      // Create episode data for audio player
      const episodeData = {
        id: summary.episode_id,
        title: episodeDetails.episodeTitle || summary.episode_title || 'Unknown Episode',
        audio: episodeDetails.episodeAudio,
        duration: episodeDetails.episodeDuration || 0,
        podcastTitle: 'Podcast',
        podcastId: '',
        thumbnail: '',
      };

      console.log(`Loading episode and seeking to ${timestamp}s`);

      // Load the episode and seek to timestamp
      playEpisode(episodeData);

      // Wait a short moment for the episode to start loading, then seek
      setTimeout(() => {
        console.log('Attempting to seek to timestamp after brief delay');
        seekTo(timestamp);
      }, 500);

    } catch (error) {
      console.error('Failed to seek to timestamp:', error);
      toast.error('Failed to load episode for timestamp');
    }
  };

  return (
    <div className="min-h-[calc(100vh-var(--header-height))] bg-gray-50">
      <div className="max-w-4xl mx-auto p-3 sm:p-4 md:p-6">
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">All Summaries</h1>
              <p className="text-sm sm:text-base text-gray-600">View all your generated podcast summaries</p>
            </div>
            {userQuota && (
              <div className="flex-shrink-0">
                <div className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium ${
                  !userQuota.summaries.canGenerate 
                    ? 'bg-red-100 text-red-800' 
                    : userQuota.summaries.remaining !== -1 && userQuota.summaries.remaining <= 2
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                }`}>
                  {userQuota.summaries.limit === -1 
                    ? "Unlimited" 
                    : `${userQuota.summaries.used}/${userQuota.summaries.limit} used`}
                </div>
                {userQuota.summaries.remaining !== -1 && userQuota.summaries.remaining > 0 && (
                  <p className="text-xs text-gray-500 mt-1 text-center sm:text-right">
                    {userQuota.summaries.remaining} remaining{userQuota.plan === 'monthly' || userQuota.plan === 'basic' || userQuota.plan === 'pro' || userQuota.plan === 'premium' ? ' this month' : ''}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search summaries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-9 sm:pl-10 pr-3 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex-shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "newest" | "oldest")}
                className="w-full sm:w-auto px-3 py-2 sm:py-2.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>
          </div>

          {/* Results Summary */}
          {searchQuery && (
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                {filteredAndSortedSummaries.length} result{filteredAndSortedSummaries.length !== 1 ? 's' : ''} 
                {searchQuery && ` for "${searchQuery}"`}
              </p>
            </div>
          )}
          
          {/* Loading State */}
          {userSummaries === undefined && (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-sm sm:text-base text-gray-600">Loading summaries...</span>
            </div>
          )}

          {/* Empty State */}
          {userSummaries && userSummaries.length === 0 && (
            <div className="text-center py-8 sm:py-12">
              <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No summaries yet</h3>
              <p className="mt-1 text-xs sm:text-sm text-gray-500 px-4">
                Generate your first summary from the New Summary page.
              </p>
              <div className="mt-4 sm:mt-6">
                <a
                  href="/dashboard/new-summary"
                  className="inline-flex items-center px-3 sm:px-4 py-2 border border-transparent shadow-sm text-xs sm:text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 touch-manipulation"
                >
                  Create New Summary
                </a>
              </div>
            </div>
          )}

          {/* No Results for Search */}
          {userSummaries && userSummaries.length > 0 && filteredAndSortedSummaries.length === 0 && searchQuery && (
            <div className="text-center py-8 sm:py-12">
              <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No results found</h3>
              <p className="mt-1 text-xs sm:text-sm text-gray-500 px-4">
                Try adjusting your search terms or clear the search to see all summaries.
              </p>
              <div className="mt-4 sm:mt-6">
                <button
                  onClick={() => setSearchQuery("")}
                  className="inline-flex items-center px-3 sm:px-4 py-2 border border-transparent shadow-sm text-xs sm:text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 touch-manipulation"
                >
                  Clear Search
                </button>
              </div>
            </div>
          )}

          {/* Summaries List */}
          {userSummaries && userSummaries.length > 0 && filteredAndSortedSummaries.length > 0 && (
            <div className="space-y-4 sm:space-y-6">
              {filteredAndSortedSummaries.map((summary: any, index: number) => (
                <div key={summary._id || index} className="bg-blue-50 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-blue-200">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold text-blue-900 leading-tight">
                        {summary.episode_title || `Episode Summary #${index + 1}`}
                      </h3>
                      <p className="text-xs sm:text-sm text-blue-600 mt-1">
                        Generated on {new Date(summary.created_at || Date.now()).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleCopy(
                          typeof summary.content === 'string' ? summary.content : 
                          typeof summary.content === 'object' ? JSON.stringify(summary.content) : 
                          String(summary.content || ''), 
                          summary._id
                        )}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors touch-manipulation"
                        title="Copy summary"
                      >
                        {copiedId === summary._id ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                      <Link
                        to={`/dashboard/chat?episodeId=${summary.episode_id}&summaryId=${summary._id}`}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors touch-manipulation"
                        title="Chat with AI about this episode"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </Link>
                      <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Completed
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4 sm:space-y-6">
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <svg className="w-5 h-5 text-blue-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h4 className="font-bold text-gray-900 text-base sm:text-lg">Summary</h4>
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-6 border border-blue-200">
                        <div className="text-gray-900 text-xl font-medium leading-relaxed">
                          {(() => {
                            const content = typeof summary.content === 'string' ? summary.content : 
                                           typeof summary.content === 'object' ? JSON.stringify(summary.content) : 
                                           String(summary.content || '');
                            
                            // Split content by double newlines and callout markers
                            const sections = content.split(/\n\s*\n/);
                            const parts = [];
                            
                            for (const section of sections) {
                              const trimmedSection = section.trim();
                              if (!trimmedSection) continue;
                              
                              if (trimmedSection.includes('>')) {
                                // This is a callout box section
                                const calloutLines = trimmedSection.split('\n').filter((line: string) => line.trim());
                                if (calloutLines.length >= 2) {
                                  parts.push({ type: 'callout', content: trimmedSection });
                                }
                              } else {
                                // This is a regular paragraph
                                parts.push({ type: 'paragraph', content: trimmedSection });
                              }
                            }
                            
                            return parts.map((part: any, index: number) => {
                              if (part.type === 'callout') {
                                const lines = part.content.split('\n').filter((line: string) => line.trim());
                                const title = lines[0]?.replace(/^>\s*\*\*(.*?)\*\*/, '$1') || '';
                                const content = lines[1]?.replace(/^>\s*\*\*(.*?)\*\*/, '$1') || '';
                                
                                return (
                                  <div key={index} className="my-12 p-6 bg-white/95 border-2 border-blue-400 rounded-xl shadow-lg">
                                    <div className="flex items-center gap-3 mb-4">
                                      <span className="text-blue-800 font-bold text-lg">{title}</span>
                                    </div>
                                    <div className="text-blue-900 font-semibold text-xl leading-relaxed">{content}</div>
                                  </div>
                                );
                              } else if (part.content.trim()) {
                                // Regular paragraph - parse bold formatting with enhanced styling
                                const formattedParagraph = part.content.replace(
                                  /\*\*(.*?)\*\*/g,
                                  '<strong class="font-black text-gray-900 bg-yellow-200 px-2 py-1 rounded-md shadow-sm border border-yellow-300">$1</strong>'
                                );
                                
                                return (
                                  <div key={index} className="mb-12">
                                    <p className="leading-relaxed text-gray-800 text-xl" dangerouslySetInnerHTML={{ 
                                      __html: formattedParagraph 
                                    }} />
                                  </div>
                                );
                              }
                              return null;
                            });
                          })()}
                        </div>
                      </div>
                    </div>
                    
                    {summary.takeaways && summary.takeaways.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <svg className="w-5 h-5 text-blue-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <h4 className="font-bold text-gray-900 text-base sm:text-lg">Key Takeaways</h4>
                        </div>
                        <ul className="space-y-3 sm:space-y-4">
                          {summary.takeaways.map((takeaway: any, idx: number) => {
                            // Handle both old string format and new timestamp format
                            const isTimestamped = typeof takeaway === 'object' && takeaway.text && takeaway.timestamp;
                            const rawText = isTimestamped ? takeaway.text : takeaway;
                            // Ensure text is always a string to prevent React rendering errors
                            let text = typeof rawText === 'string' ? rawText :
                                       typeof rawText === 'object' ? JSON.stringify(rawText) :
                                       String(rawText || '');

                            // Clean the text by removing timestamps and numbering patterns
                            text = text
                              .replace(/^\d+\.\s*/, '') // Remove leading numbers like "1. "
                              .replace(/^\[\d{1,2}:\d{2}:\d{2}\]\s*/, '') // Remove timestamps like "[00:02:20] " or "[0:02:20] "
                              .replace(/^\[\d{1,2}:\d{2}\]\s*/, '') // Remove timestamps like "[00:02] " or "[0:02] "
                              .replace(/^\(\d{1,2}:\d{2}:\d{2}\)\s*/, '') // Remove timestamps like "(00:02:20) "
                              .replace(/^\(\d{1,2}:\d{2}\)\s*/, '') // Remove timestamps like "(00:02) "
                              .trim();

                            const timestamp = isTimestamped ? takeaway.timestamp : null;
                            const formattedTime = isTimestamped ? takeaway.formatted_time : null;
                            const confidence = isTimestamped ? takeaway.confidence : null;

                            // Debug logging for timestamp verification
                            if (isTimestamped && timestamp) {
                              console.log('🔍 TAKEAWAY DEBUG:', {
                                text: text.substring(0, 50) + '...',
                                timestamp: timestamp,
                                formattedTime: formattedTime,
                                confidence: confidence,
                                calculatedTime: Math.floor(timestamp / 60) + ':' + Math.floor(timestamp % 60).toString().padStart(2, '0'),
                                matchedText: takeaway.matchedText,
                                fullContext: takeaway.fullContext?.substring(0, 100) + '...'
                              });
                            }
                            
                            return (
                              <li key={idx} className="flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                  <span className="text-blue-700 text-sm sm:text-base leading-relaxed">{text}</span>
                                  {isTimestamped && timestamp && (
                                    <div className="mt-2">
                                      <button
                                        onClick={() => {
                                          console.log('🎬 CLICKING TIMESTAMP BUTTON');
                                          console.log('📝 Takeaway text:', text);
                                          console.log('⏰ Timestamp:', timestamp, 'seconds');
                                          console.log('🎯 Formatted:', formattedTime);
                                          console.log('📊 Confidence:', confidence);
                                          if (takeaway.fullContext) {
                                            console.log('📃 Transcript context:', takeaway.fullContext);
                                          }
                                          handleTimestampSeek(timestamp, summary);
                                        }}
                                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800"
                                        title={`Jump to ${formattedTime}`}
                                      >
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                          <path d="M8 5v14l11-7z"/>
                                        </svg>
                                        <span className="font-bold">Jump to {formattedTime || `${Math.floor(timestamp / 60)}:${(timestamp % 60).toString().padStart(2, '0')}`}</span>
                                      </button>
                                      {confidence && (
                                        <div className="flex items-center gap-2 mt-1">
                                          {takeaway.matchedText && (
                                            <span className="text-xs text-gray-500" title={`Matched transcript: "${takeaway.matchedText}"`}>
                                              📄 Context available
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    {summary.actionable_insights && summary.actionable_insights.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-6">
                          <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <h4 className="font-bold text-gray-900 text-lg sm:text-xl">Actionable Insights</h4>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                          <div className="space-y-6">
                            {summary.actionable_insights.map((insight: any, idx: number) => (
                              <div key={idx} className="bg-white rounded-lg p-5 shadow-sm border border-green-100 hover:shadow-md transition-shadow">
                                <div className="flex items-start gap-4">
                                  <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-green-700 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-sm">
                                    {idx + 1}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    {/* Action Title */}
                                    <div className="mb-4">
                                      <h5 className="text-lg font-bold text-gray-900 leading-tight">
                                        {insight.action || 'No action specified'}
                                      </h5>
                                    </div>
                                    
                                    {/* Structured Information */}
                                    <div className="space-y-3">
                                      {insight.context && (
                                        <div className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-400">
                                          <div className="flex items-start gap-2">
                                            <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <div>
                                              <span className="font-semibold text-blue-800 text-sm">Why this matters:</span>
                                              <p className="text-blue-700 text-sm mt-1">{insight.context}</p>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {insight.application && (
                                        <div className="bg-purple-50 rounded-lg p-3 border-l-4 border-purple-400">
                                          <div className="flex items-start gap-2">
                                            <svg className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                            </svg>
                                            <div>
                                              <span className="font-semibold text-purple-800 text-sm">Real-life example:</span>
                                              <p className="text-purple-700 text-sm mt-1">{insight.application}</p>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {insight.resources && (
                                        <div className="bg-orange-50 rounded-lg p-3 border-l-4 border-orange-400">
                                          <div className="flex items-start gap-2">
                                            <svg className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                            </svg>
                                            <div>
                                              <span className="font-semibold text-orange-800 text-sm">Resources mentioned:</span>
                                              <p className="text-orange-700 text-sm mt-1">{insight.resources}</p>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Growth Strategy Section */}
                    {summary.growth_strategy && (
                      <div>
                        <div className="flex items-center gap-2 mb-6">
                          <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                          <h4 className="font-bold text-gray-900 text-lg sm:text-xl">Growth Strategy</h4>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-200">
                          <div className="text-purple-700 leading-relaxed text-base sm:text-lg font-medium">
                            {summary.growth_strategy}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Key Insight Section */}
                    {summary.key_insight && (
                      <div>
                        <div className="flex items-center gap-2 mb-6">
                          <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          <h4 className="font-bold text-gray-900 text-lg sm:text-xl">Key Insight</h4>
                        </div>
                        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-6 border border-yellow-200">
                          <div className="text-yellow-700 leading-relaxed text-base sm:text-lg font-medium">
                            {summary.key_insight}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Reality Check Section */}
                    {summary.reality_check && (
                      <div>
                        <div className="flex items-center gap-2 mb-6">
                          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <h4 className="font-bold text-gray-900 text-lg sm:text-xl">Reality Check</h4>
                        </div>
                        <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-6 border border-red-200">
                          <div className="text-red-700 leading-relaxed text-base sm:text-lg font-medium">
                            {summary.reality_check}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}