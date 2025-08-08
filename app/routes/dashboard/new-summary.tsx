import { useState, useEffect } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { EnhancedAudioPlayer } from "~/components/audio/enhanced-audio-player";
import { useAuth } from "@clerk/react-router";
import { toast } from "sonner";
import type { Route } from "./+types/new-summary";
import { Pagination } from "~/components/ui/pagination";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Create New Summary | PodClip" },
    { name: "description", content: "Search for podcast episodes and generate AI-powered summaries and key takeaways with transcriptions." },
    { name: "robots", content: "noindex, nofollow" }, // Private page
  ];
}

export default function NewSummary() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<'podcast'>('podcast');
  const [podcastResults, setPodcastResults] = useState<any>(null);
  const [selectedPodcast, setSelectedPodcast] = useState<any>(null);
  const [episodes, setEpisodes] = useState<any>(null);
  const [episodePage, setEpisodePage] = useState<{[key: string]: number}>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState<{[key: string]: boolean}>({});
  const [summaries, setSummaries] = useState<{[key: string]: any}>({});
  const [summaryErrors, setSummaryErrors] = useState<{[key: string]: string}>({});
  const [copiedStates, setCopiedStates] = useState<{[key: string]: { summary?: boolean, takeaways?: boolean, header?: boolean }}>({});
  const [transcripts, setTranscripts] = useState<{[key: string]: { text: string, loading: boolean, visible: boolean }}>({});
  const [exportingStates, setExportingStates] = useState<{[key: string]: boolean}>({});
  const [userReady, setUserReady] = useState(false);
  const [fixingPlan, setFixingPlan] = useState(false);
  
  const { userId, isSignedIn } = useAuth();
  const searchPodcasts = useAction(api.podcasts.searchPodcasts);
  const searchEpisodes = useAction(api.podcasts.searchEpisodes);
  const getPodcastEpisodes = useAction(api.podcasts.getPodcastEpisodes);
  const generateSummary = useAction(api.summaries.generateSummary);
  const createSummary = useMutation(api.summaries.createSummary);
  const checkExistingSummary = useAction(api.summaries.checkExistingSummary);
  const upsertUser = useMutation(api.users.upsertUser);
  const fixUserPlan = useMutation(api.users.fixUserPlan);
  const userQuota = useQuery(api.users.getUserQuota, userReady && isSignedIn ? undefined : "skip");
  const getTranscript = useAction(api.transcriptions.getEpisodeTranscription);
  const exportToNotion = useAction(api.notion.exportToNotion);
  const notionConnection = useQuery(api.notion.getNotionConnection, 
    userId ? { userId } : "skip"
  );

  // Ensure user exists in database
  useEffect(() => {
    if (isSignedIn && !userReady) {
      upsertUser()
        .then(() => {
          console.log("User created successfully");
          setUserReady(true);
        })
        .catch((error) => {
          console.error("Failed to create user:", error);
          // Still set userReady to true to prevent infinite loop
          setUserReady(true);
        });
    }
  }, [isSignedIn, upsertUser, userReady]);

  // Helper function to handle copy actions with visual feedback
  const handleCopy = async (episodeId: string, content: string, type: 'summary' | 'takeaways' | 'header') => {
    try {
      await navigator.clipboard.writeText(content);
      
      // Set copied state
      setCopiedStates(prev => ({
        ...prev,
        [episodeId]: { ...prev[episodeId], [type]: true }
      }));
      
      // Reset after 2 seconds
      setTimeout(() => {
        setCopiedStates(prev => ({
          ...prev,
          [episodeId]: { ...prev[episodeId], [type]: false }
        }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Helper function to handle transcript fetching and display
  const handleShowTranscript = async (episodeId: string) => {
    const currentTranscript = transcripts[episodeId];
    
    // If already visible, just toggle
    if (currentTranscript?.visible) {
      setTranscripts(prev => ({
        ...prev,
        [episodeId]: { ...prev[episodeId], visible: false }
      }));
      return;
    }
    
    // If we have the transcript but it's hidden, show it
    if (currentTranscript?.text) {
      setTranscripts(prev => ({
        ...prev,
        [episodeId]: { ...prev[episodeId], visible: true }
      }));
      return;
    }
    
    // Need to fetch transcript
    try {
      setTranscripts(prev => ({
        ...prev,
        [episodeId]: { text: '', loading: true, visible: true }
      }));
      
      const transcriptData = await getTranscript({ episodeId });
      
      setTranscripts(prev => ({
        ...prev,
        [episodeId]: {
          text: transcriptData.transcript || 'Transcript not available for this episode.',
          loading: false,
          visible: true
        }
      }));
    } catch (error) {
      console.error('Failed to fetch transcript:', error);
      setTranscripts(prev => ({
        ...prev,
        [episodeId]: {
          text: 'Failed to load transcript. Please try again.',
          loading: false,
          visible: true
        }
      }));
    }
  };

  // Helper function to handle exporting summaries to Notion
  const handleExportToNotion = async (episodeId: string) => {
    if (!userId) {
      toast.error("You must be logged in to export to Notion");
      return;
    }

    if (!notionConnection?.connected) {
      toast.error("Please connect your Notion account in Settings first");
      return;
    }

    const summary = summaries[episodeId];
    if (!summary) {
      toast.error("No summary found to export");
      return;
    }

    // Get the episode details for the title
    const episode = episodes?.find((ep: any) => ep.id === episodeId);
    const episodeTitle = episode?.title || "Podcast Summary";

    setExportingStates(prev => ({ ...prev, [episodeId]: true }));

    try {
      const result = await exportToNotion({
        userId,
        summaryData: {
          episodeTitle,
          summary: summary.summary,
          takeaways: summary.takeaways || [],
        },
      });

      if (result.success) {
        toast.success(
          <div>
            Successfully exported to Notion! 
            {result.notionUrl && (
              <a 
                href={result.notionUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-2 underline text-blue-600"
              >
                View in Notion
              </a>
            )}
          </div>
        );
      }
    } catch (error: any) {
      console.error('Export to Notion failed:', error);
      toast.error(error.message || "Failed to export to Notion. Please try again.");
    } finally {
      setExportingStates(prev => ({ ...prev, [episodeId]: false }));
    }
  };

  // Handle fixing the user plan when payment was processed but plan not updated
  const handleFixPlan = async () => {
    setFixingPlan(true);
    try {
      const result = await fixUserPlan();
      if (result.success) {
        toast.success(`${result.message}. Refreshing page...`);
        setTimeout(() => window.location.reload(), 2000);
      } else {
        // Show more detailed error information
        const details = result.details ? 
          `\nDetails: Subscription: ${result.details.subscriptionStatus}, Payment: ${result.details.paymentStatus}` : '';
        toast.error(`${result.message}${details}`);
      }
    } catch (error: any) {
      console.error("Failed to fix plan:", error);
      toast.error(error.message || "Failed to check plan status. Please try again.");
    } finally {
      setFixingPlan(false);
    }
  };

  const handleSearch = async (page: number = 1) => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    setCurrentPage(page);
    const offset = (page - 1) * 20;
    
    try {
      const results = await searchPodcasts({ 
        query: searchQuery, 
        offset, 
        limit: 20 
      });
      setPodcastResults(results);
      setSelectedPodcast(null);
      setEpisodes(null);
      console.log("Podcast results:", results);
    } catch (error: any) {
      console.error("Search failed:", error);
      toast.error(error.message || "Failed to search podcasts. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePageChange = (page: number) => {
    handleSearch(page);
  };

  const handleLoadMoreEpisodes = async (nextEpisodePubDate: number) => {
    if (!selectedPodcast) return;
    
    setIsLoading(true);
    try {
      const moreEpisodes = await getPodcastEpisodes({ 
        podcastId: selectedPodcast.id,
        nextEpisodePubDate 
      });
      
      // Append new episodes to existing ones
      setEpisodes((prev: any) => ({
        ...prev,
        episodes: [...(prev?.episodes || []), ...(moreEpisodes.episodes || [])],
        pagination: moreEpisodes.pagination
      }));
      
      console.log("Loaded more episodes:", moreEpisodes);
    } catch (error) {
      console.error("Failed to load more episodes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePodcastSelect = async (podcast: any) => {
    setSelectedPodcast(podcast);
    setIsLoading(true);
    try {
      const podcastData = await getPodcastEpisodes({ podcastId: podcast.id });
      setEpisodes(podcastData);
      console.log("Episodes:", podcastData);
      
      // Check for existing summaries for all episodes
      if (userQuota?.userId && podcastData.episodes) {
        const existingSummariesChecks = podcastData.episodes.map(async (episode: any) => {
          try {
            const existingSummary = await checkExistingSummary({
              episodeId: episode.id,
              userId: userQuota.userId,
            });
            
            if (existingSummary) {
              setSummaries(prev => ({ 
                ...prev, 
                [episode.id]: {
                  summary: existingSummary.content,
                  takeaways: existingSummary.takeaways,
                  episodeId: episode.id,
                  userId: existingSummary.user_id,
                  createdAt: existingSummary.created_at,
                  hasTranscript: false, // We don't store this info currently
                  transcriptUsed: false,
                }
              }));
            }
          } catch (error) {
            console.error(`Failed to check existing summary for episode ${episode.id}:`, error);
          }
        });
        
        // Execute all checks in parallel
        await Promise.allSettled(existingSummariesChecks);
      }
    } catch (error) {
      console.error("Failed to get episodes:", error);
    } finally {
      setIsLoading(false);
    }
  };


  const handleGenerateSummary = async (episode: any) => {
    const episodeId = episode.id;
    
    // Check if summary already exists in local state
    if (summaries[episodeId]) {
      return;
    }

    // Clear any previous errors
    setSummaryErrors(prev => ({ ...prev, [episodeId]: '' }));
    setGeneratingSummary(prev => ({ ...prev, [episodeId]: true }));
    
    try {
      // Check if summary already exists in database
      const existingSummary = await checkExistingSummary({
        episodeId: episodeId,
        userId: userQuota?.userId || "temp-user-id",
      });
      
      if (existingSummary) {
        // Summary already exists, load it into local state
        setSummaries(prev => ({ 
          ...prev, 
          [episodeId]: {
            summary: existingSummary.content,
            takeaways: existingSummary.takeaways,
            episodeId: episodeId,
            userId: existingSummary.user_id,
            createdAt: existingSummary.created_at,
            hasTranscript: false, // We don't store this info currently
            transcriptUsed: false,
          }
        }));
        setGeneratingSummary(prev => ({ ...prev, [episodeId]: false }));
        return;
      }
      const summary = await generateSummary({
        episodeId: episodeId,
        episodeTitle: episode.title,
        episodeDescription: episode.description,
        userId: userQuota?.userId || "temp-user-id", // Get actual user ID from quota query
      });
      
      // Save summary to database
      await createSummary({
        episodeId: episodeId,
        userId: userQuota?.userId || "temp-user-id",
        summary: summary.summary,
        takeaways: summary.takeaways,
        episodeTitle: episode.title,
      });
      
      setSummaries(prev => ({ ...prev, [episodeId]: summary }));
      console.log("Generated and saved summary:", summary);
    } catch (error: any) {
      console.error("Failed to generate summary:", error);
      
      // Set error state for this episode
      const errorMessage = error.message || "Failed to generate summary. Please try again.";
      setSummaryErrors(prev => ({ ...prev, [episodeId]: errorMessage }));
      
      // Show user-friendly error messages for quota issues
      if (errorMessage.includes("Quota exceeded")) {
        alert(errorMessage);
      }
    } finally {
      setGeneratingSummary(prev => ({ ...prev, [episodeId]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 w-full overflow-hidden">
      <div className="max-w-4xl mx-auto p-3 sm:p-4 md:p-6 w-full">
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6 lg:p-8 w-full overflow-hidden">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Create New Summary</h1>
          <p className="text-sm sm:text-base text-gray-600 mb-6">Search for a podcast and select an episode to generate an AI summary</p>
          
          {/* Quota Indicator */}
          {userQuota && (
            <div className={`mb-8 p-4 rounded-lg border-2 ${
              !userQuota.canGenerate 
                ? 'bg-red-50 border-red-200' 
                : userQuota.remaining !== -1 && userQuota.remaining <= 2
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-green-50 border-green-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    !userQuota.canGenerate 
                      ? 'bg-red-500' 
                      : userQuota.remaining !== -1 && userQuota.remaining <= 2
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  }`}></div>
                  <div>
                    <p className={`font-medium ${
                      !userQuota.canGenerate 
                        ? 'text-red-800' 
                        : userQuota.remaining !== -1 && userQuota.remaining <= 2
                          ? 'text-yellow-800'
                          : 'text-green-800'
                    }`}>
                      {userQuota.limit === -1 
                        ? "Unlimited summaries" 
                        : `${userQuota.used}/${userQuota.limit} summaries used`}
                    </p>
                    <p className={`text-sm ${
                      !userQuota.canGenerate 
                        ? 'text-red-600' 
                        : userQuota.remaining !== -1 && userQuota.remaining <= 2
                          ? 'text-yellow-600'
                          : 'text-green-600'
                    }`}>
                      {!userQuota.canGenerate 
                        ? (userQuota.limit === 5 ? "Quota exhausted. Upgrade to continue." : "Monthly quota exhausted. Resets next month.")
                        : userQuota.limit === -1 
                          ? "You have unlimited summaries with your current plan"
                          : `${userQuota.remaining} summaries remaining${userQuota.plan === 'monthly' ? ' this month' : ''}`}
                    </p>
                  </div>
                </div>
                {!userQuota.canGenerate && userQuota.limit === 5 && (
                  <div className="flex gap-2">
                    <a 
                      href="/pricing"
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Upgrade Plan
                    </a>
                    <button
                      onClick={handleFixPlan}
                      disabled={fixingPlan}
                      className="px-3 py-2 bg-gray-500 text-white text-xs font-medium rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Try this if you've already paid but plan hasn't updated"
                    >
                      {fixingPlan ? "Checking..." : "Already Paid?"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Search Input */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Search for podcasts
            </label>
            
            
            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter podcast name (e.g., tech)"
                className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button 
                onClick={() => handleSearch()}
                disabled={isLoading || !searchQuery.trim()}
                className="px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white text-sm sm:text-base font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                {isLoading ? "Searching..." : "Search"}
              </button>
            </div>
          </div>

          {/* Podcast Results */}
          {podcastResults && !selectedPodcast && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Found {podcastResults.pagination?.total || podcastResults.results?.length || 0} podcasts
                  {podcastResults.pagination?.total && (
                    <span className="text-base font-normal text-gray-500 ml-2">
                      (showing {podcastResults.results?.length || 0})
                    </span>
                  )}
                </h2>
                <span className="text-sm text-gray-500">Click a podcast to see episodes</span>
              </div>
              <div className="grid gap-4 w-full">
                {podcastResults.results?.map((podcast: any, index: number) => (
                  <div 
                    key={index} 
                    className="group border border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all duration-200 overflow-hidden"
                    onClick={() => handlePodcastSelect(podcast)}
                  >
                    <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                      <img 
                        src={podcast.image} 
                        alt={podcast.title_original}
                        className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <h3 className="font-semibold text-base sm:text-lg text-gray-900 group-hover:text-blue-600 transition-colors leading-tight line-clamp-2">
                          {podcast.title_original}
                        </h3>
                        <p className="text-gray-600 text-xs sm:text-sm mt-1 sm:mt-2 leading-relaxed line-clamp-2 sm:line-clamp-3 break-words">
                          {(() => {
                            const cleanText = podcast.description_original?.replace(/<[^>]*>/g, '') || '';
                            return cleanText.length > 100 ? `${cleanText.substring(0, 100)}...` : cleanText;
                          })()}
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-2 sm:mt-3 text-xs text-gray-500 min-w-0">
                          <span className="bg-gray-100 px-2 py-1 rounded-full text-center w-fit flex-shrink-0">
                            {podcast.total_episodes} episodes
                          </span>
                          <span className="truncate min-w-0">Publisher: {podcast.publisher_original}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Pagination for Podcasts */}
              {podcastResults.pagination && podcastResults.pagination.totalPages > 1 && (
                <div className="mt-8">
                  <Pagination
                    currentPage={podcastResults.pagination.currentPage}
                    totalPages={podcastResults.pagination.totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </div>
          )}


          {/* Episodes from Selected Podcast */}
          {selectedPodcast && episodes && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => {setSelectedPodcast(null); setEpisodes(null);}}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to podcasts
                </button>
              </div>
              
              <div className="bg-gray-50 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-gray-200">
                <div className="flex items-start gap-3 sm:gap-4">
                  <img 
                    src={selectedPodcast.image} 
                    alt={selectedPodcast.title_original}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">
                      {selectedPodcast.title_original}
                    </h2>
                    <p className="text-gray-600 text-sm sm:text-base mt-1">
                      Choose an episode to generate an AI summary
                    </p>
                    {episodes.pagination && (
                      <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">
                        Showing {episodes.episodes?.length || 0} of {episodes.pagination.total} episodes
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {episodes.episodes?.map((episode: any, index: number) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg sm:rounded-xl p-4 sm:p-6 hover:shadow-md transition-shadow">
                    <div className="space-y-3 sm:space-y-4">
                      {/* Episode Info */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-6">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base sm:text-lg text-gray-900 leading-tight line-clamp-2">
                            {episode.title}
                          </h3>
                          <p className="text-gray-600 text-xs sm:text-sm mt-2 sm:mt-3 leading-relaxed line-clamp-3 sm:line-clamp-4">
                            {(() => {
                              const cleanText = episode.description?.replace(/<[^>]*>/g, '') || '';
                              return cleanText.length > 150 ? `${cleanText.substring(0, 150)}...` : cleanText;
                            })()}
                          </p>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-3 sm:mt-4 text-xs sm:text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {Math.floor(episode.audio_length_sec / 60)} minutes
                            </span>
                            <span className="truncate">Published: {new Date(episode.pub_date_ms).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex-shrink-0 w-full sm:w-auto">
                          {summaryErrors[episode.id] && !summaries[episode.id] && (
                            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <div className="flex items-start gap-2">
                                <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-red-800 mb-2">
                                    {summaryErrors[episode.id]}
                                  </p>
                                  <button
                                    onClick={() => handleGenerateSummary(episode)}
                                    disabled={generatingSummary[episode.id]}
                                    className="text-sm font-medium text-red-700 hover:text-red-900 underline disabled:opacity-50"
                                  >
                                    Try Again
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <button 
                            onClick={() => handleGenerateSummary(episode)}
                            disabled={generatingSummary[episode.id] || !userQuota?.canGenerate}
                            className={`w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base ${
                              !userQuota?.canGenerate 
                                ? 'bg-gray-400 text-white cursor-not-allowed'
                                : summaryErrors[episode.id] && !summaries[episode.id]
                                  ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
                                  : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 focus:ring-blue-500'
                            }`}
                            title={!userQuota?.canGenerate ? "Quota exceeded. Upgrade or wait for reset." : ""}
                          >
                            {generatingSummary[episode.id] ? (
                              <span className="flex items-center gap-2">
                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="m12 2 1 9-1 9a10 10 0 0 1 0-18Z"></path>
                                </svg>
                                <span className="hidden sm:inline">Generating...</span>
                                <span className="sm:hidden">...</span>
                              </span>
                            ) : summaries[episode.id] ? (
                              <span className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="hidden sm:inline">Summary Generated</span>
                                <span className="sm:hidden">Done</span>
                              </span>
                            ) : summaryErrors[episode.id] ? (
                              <span className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4l16 16m0-16L4 20" />
                                </svg>
                                <span className="hidden sm:inline">Retry</span>
                                <span className="sm:hidden">Retry</span>
                              </span>
                            ) : !userQuota?.canGenerate ? (
                              <span className="hidden sm:inline">Quota Exceeded</span>
                            ) : (
                              <span>
                                <span className="hidden sm:inline">Generate Summary</span>
                                <span className="sm:hidden">Generate</span>
                              </span>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Enhanced Audio Player */}
                      <EnhancedAudioPlayer 
                        episode={{
                          id: episode.id,
                          title: episode.title,
                          audio: episode.audio,
                          duration: episode.audio_length_sec || 0,
                          podcastTitle: selectedPodcast.title_original,
                          podcastId: selectedPodcast.id,
                          thumbnail: selectedPodcast.image,
                        }}
                      />

                      {/* Summary Display */}
                      {summaries[episode.id] && (
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-6 border border-blue-200 shadow-sm animate-in slide-in-from-top-4 duration-500">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-base sm:text-lg font-semibold text-blue-900 flex items-center gap-2">
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                              AI Generated Summary
                              {summaries[episode.id].transcriptUsed && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Transcript Used
                                </span>
                              )}
                            </h4>
                            <button
                              onClick={() => handleCopy(episode.id, summaries[episode.id].summary, 'header')}
                              className={`p-2 rounded-lg transition-colors touch-manipulation ${
                                copiedStates[episode.id]?.header 
                                  ? 'text-green-600 bg-green-100' 
                                  : 'text-blue-600 hover:text-blue-800 hover:bg-blue-100'
                              }`}
                              title={copiedStates[episode.id]?.header ? "Copied!" : "Copy summary"}
                            >
                              {copiedStates[episode.id]?.header ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              )}
                            </button>
                          </div>
                          
                          <div className="space-y-6">
                            <div className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm">
                              <h5 className="font-semibold text-blue-900 mb-3 flex items-center gap-2 text-sm sm:text-base">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Summary
                              </h5>
                              <p className="text-blue-800 leading-relaxed text-sm sm:text-base">
                                {summaries[episode.id].summary}
                              </p>
                            </div>
                            
                            {summaries[episode.id].takeaways && summaries[episode.id].takeaways.length > 0 && (
                              <div className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm">
                                <h5 className="font-semibold text-blue-900 mb-3 flex items-center gap-2 text-sm sm:text-base">
                                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                  </svg>
                                  Key Takeaways
                                </h5>
                                <ul className="space-y-3">
                                  {summaries[episode.id].takeaways.map((takeaway: string, index: number) => (
                                    <li key={index} className="flex items-start gap-3 text-blue-800 animate-in fade-in slide-in-from-left-4 duration-300" style={{animationDelay: `${index * 100}ms`}}>
                                      <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                                        {index + 1}
                                      </span>
                                      <span className="text-sm sm:text-base leading-relaxed">{takeaway}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => handleCopy(episode.id, summaries[episode.id].summary, 'summary')}
                                className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors touch-manipulation ${
                                  copiedStates[episode.id]?.summary
                                    ? 'text-green-700 bg-green-100 hover:bg-green-200'
                                    : 'text-blue-700 bg-blue-100 hover:bg-blue-200'
                                }`}
                              >
                                {copiedStates[episode.id]?.summary ? (
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                )}
                                {copiedStates[episode.id]?.summary ? 'Copied!' : 'Copy Summary'}
                              </button>
                              {summaries[episode.id].takeaways && (
                                <button
                                  onClick={() => handleCopy(episode.id, summaries[episode.id].takeaways.join('\n• '), 'takeaways')}
                                  className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors touch-manipulation ${
                                    copiedStates[episode.id]?.takeaways
                                      ? 'text-green-700 bg-green-200 hover:bg-green-300'
                                      : 'text-green-700 bg-green-100 hover:bg-green-200'
                                  }`}
                                >
                                  {copiedStates[episode.id]?.takeaways ? (
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  ) : (
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                  )}
                                  {copiedStates[episode.id]?.takeaways ? 'Copied!' : 'Copy Takeaways'}
                                </button>
                              )}
                              
                              {/* Export to Notion Button */}
                              {notionConnection?.connected ? (
                                <button
                                  onClick={() => handleExportToNotion(episode.id)}
                                  disabled={exportingStates[episode.id]}
                                  className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors touch-manipulation ${
                                    exportingStates[episode.id]
                                      ? 'text-purple-500 bg-purple-50 cursor-not-allowed'
                                      : 'text-purple-700 bg-purple-100 hover:bg-purple-200'
                                  }`}
                                >
                                  {exportingStates[episode.id] ? (
                                    <svg className="animate-spin w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                  ) : (
                                    <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M4.459 4.208c.746.606 1.026.56 2.428.467l13.212-.535c.467 0 .7.233.7.7 0 .233-.066.467-.233.7L18.26 7.31c-.167.3-.367.234-.6.234l-13.056.467c-.266 0-.467-.167-.467-.434 0-.2.067-.4.234-.567l.088-.8zm.7 2.8l13.212-.534c.4 0 .534.234.534.6 0 .167-.067.4-.2.534l-3.267 3.266c-.167.167-.434.234-.7.234H4.592c-.367 0-.6-.234-.6-.6 0-.167.066-.334.2-.467l.967-2.6c.133-.4.266-.433.6-.433zm-.233 3.533l13.212-.533c.4 0 .667.2.667.533 0 .134-.067.334-.2.467l-3.267 3.267c-.166.166-.433.233-.7.233H4.926c-.367 0-.6-.233-.6-.6 0-.166.067-.333.2-.466l.967-2.6c.133-.334.266-.467.6-.467z"/>
                                    </svg>
                                  )}
                                  {exportingStates[episode.id] ? 'Exporting...' : 'Export to Notion'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => toast.info("Connect your Notion account in Settings to export summaries")}
                                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors touch-manipulation"
                                >
                                  <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M4.459 4.208c.746.606 1.026.56 2.428.467l13.212-.535c.467 0 .7.233.7.7 0 .233-.066.467-.233.7L18.26 7.31c-.167.3-.367.234-.6.234l-13.056.467c-.266 0-.467-.167-.467-.434 0-.2.067-.4.234-.567l.088-.8zm.7 2.8l13.212-.534c.4 0 .534.234.534.6 0 .167-.067.4-.2.534l-3.267 3.266c-.167.167-.434.234-.7.234H4.592c-.367 0-.6-.234-.6-.6 0-.167.066-.334.2-.467l.967-2.6c.133-.4.266-.433.6-.433zm-.233 3.533l13.212-.533c.4 0 .667.2.667.533 0 .134-.067.334-.2.467l-3.267 3.267c-.166.166-.433.233-.7.233H4.926c-.367 0-.6-.233-.6-.6 0-.166.067-.333.2-.466l.967-2.6c.133-.334.266-.467.6-.467z"/>
                                  </svg>
                                  Connect Notion
                                </button>
                              )}
                            </div>

                            {/* Full Transcript Section */}
                            {summaries[episode.id].transcriptUsed && (
                              <div className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm">
                                <h5 className="font-semibold text-blue-900 mb-3 flex items-center gap-2 text-sm sm:text-base">
                                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2c0-.552.895-1 2-1h6c1.105 0 2 .448 2 1v2M7 4v16c0 .552.895 1 2 1h6c1.105 0 2-.448 2-1V4M7 4h10M9 8h6M9 12h6M9 16h4" />
                                  </svg>
                                  Full Transcript
                                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Available
                                  </span>
                                </h5>
                                <div className="max-h-96 overflow-y-auto bg-gray-50 rounded-lg p-3 text-sm text-gray-700 leading-relaxed">
                                  {transcripts[episode.id]?.visible ? (
                                    <>
                                      {transcripts[episode.id]?.loading ? (
                                        <div className="flex items-center justify-center py-8">
                                          <svg className="animate-spin w-5 h-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="m12 2 1 9-1 9a10 10 0 0 1 0-18Z"></path>
                                          </svg>
                                          Loading transcript...
                                        </div>
                                      ) : (
                                        <div className="whitespace-pre-wrap">
                                          {transcripts[episode.id]?.text}
                                        </div>
                                      )}
                                      <div className="mt-3 flex gap-2">
                                        <button 
                                          onClick={() => handleShowTranscript(episode.id)}
                                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors touch-manipulation"
                                        >
                                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.05 8.05M9.878 9.878A3 3 0 1059.121 14.121m4.243-4.243L15.95 15.95M14.121 14.121A3 3 0 109.878 9.878" />
                                          </svg>
                                          Hide Transcript
                                        </button>
                                        {transcripts[episode.id]?.text && !transcripts[episode.id]?.loading && (
                                          <button 
                                            onClick={() => handleCopy(episode.id, transcripts[episode.id].text, 'transcript' as any)}
                                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 transition-colors touch-manipulation"
                                          >
                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                            Copy Transcript
                                          </button>
                                        )}
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <p className="italic text-gray-500 text-center py-8">
                                        Click "Show Transcript" to view the full episode transcript
                                      </p>
                                      <button 
                                        onClick={() => handleShowTranscript(episode.id)}
                                        className="mt-3 inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors touch-manipulation"
                                      >
                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        Show Transcript
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Load More Episodes Button */}
              {episodes.pagination && episodes.pagination.hasNext && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={() => handleLoadMoreEpisodes(episodes.pagination.nextEpisodePubDate)}
                    disabled={isLoading}
                    className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? "Loading..." : "Load More Episodes"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}