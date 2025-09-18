import { useState, useEffect, useRef } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { EnhancedAudioPlayer } from "~/components/audio/enhanced-audio-player";
import { useAuth } from "@clerk/react-router";
import { toast } from "sonner";
import { useAudio } from "~/contexts/app-context";
import { SimplePagination, Pagination } from "~/components/ui/pagination";
import type { Route } from "./+types/new-summary";

// Utility function to break summary text into readable paragraphs
function formatSummaryIntoParagraphs(content: string): string[] {
  if (!content || content.trim() === '') return [];

  // Split by existing paragraph breaks first
  let paragraphs = content.split('\n\n').filter(p => p.trim());

  // If we only have one paragraph, try to intelligently split it
  if (paragraphs.length === 1) {
    const text = paragraphs[0];
    const sentences = text.split(/(?<=[.!?])\s+/);

    if (sentences.length >= 4) {
      // Split into 2-3 paragraphs based on sentence count
      const midPoint = Math.ceil(sentences.length / 2);
      paragraphs = [
        sentences.slice(0, midPoint).join(' '),
        sentences.slice(midPoint).join(' ')
      ];
    }
  }

  // Ensure we don't have more than 3 paragraphs for readability
  if (paragraphs.length > 3) {
    const third = Math.ceil(paragraphs.length / 3);
    paragraphs = [
      paragraphs.slice(0, third).join(' '),
      paragraphs.slice(third, third * 2).join(' '),
      paragraphs.slice(third * 2).join(' ')
    ];
  }

  return paragraphs.filter(p => p.trim());
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Create New Summary | PodClip" },
    { name: "description", content: "Search for podcast episodes and generate AI-powered summaries and key takeaways with transcriptions." },
    { name: "robots", content: "noindex, nofollow" }, // Private page
  ];
}

export default function NewSummary() {
  const [searchQuery, setSearchQuery] = useState("");
  const [podcastResults, setPodcastResults] = useState<any>(null);
  const [selectedPodcast, setSelectedPodcast] = useState<any>(null);
  const [episodes, setEpisodes] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [episodePage, setEpisodePage] = useState(1);
  const [episodePaginationHistory, setEpisodePaginationHistory] = useState<{pubDate: number | null, direction: 'next' | 'prev'}[]>([]);
  const [generatingSummary, setGeneratingSummary] = useState<{[key: string]: boolean}>({});
  const [summaries, setSummaries] = useState<{[key: string]: any}>({});
  const [summaryErrors, setSummaryErrors] = useState<{[key: string]: string}>({});
  const [copiedStates, setCopiedStates] = useState<{[key: string]: { summary?: boolean, takeaways?: boolean, header?: boolean }}>({});
  const [transcripts, setTranscripts] = useState<{[key: string]: { text: string, loading: boolean, visible: boolean }}>({});
  const [exportingStates, setExportingStates] = useState<{[key: string]: boolean}>({});
  const [existingSummaries, setExistingSummaries] = useState<{[key: string]: any}>({});
  const [userReady, setUserReady] = useState(false);
  const [seekingTimestamp, setSeekingTimestamp] = useState<number | null>(null);
  const [insightsEnabled, setInsightsEnabled] = useState<{[key: string]: boolean}>({});
  const [genreDetections, setGenreDetections] = useState<{[key: string]: any}>({});
  
  const { userId, isSignedIn } = useAuth();
  const { state: audioState, seekTo, playEpisode } = useAudio();
  const searchPodcasts = useAction(api.podcasts.searchPodcasts);
  const getPodcastEpisodes = useAction(api.podcasts.getPodcastEpisodes);
  const generateSummaryWithTimestamps = useAction(api.summaries.generateSummaryWithTimestamps);
  const checkExistingSummary = useAction(api.summaries.checkExistingSummary);
  const detectGenreAndSuggestInsights = useAction(api.summaries.detectGenreAndSuggestInsights);
  const upsertUser = useMutation(api.users.upsertUser);
  const userQuota = useQuery(api.users.getUserQuota, userReady ? undefined : "skip");
  const getTranscript = useAction(api.transcriptions.getEpisodeTranscription);
  const exportToNotion = useAction(api.notion.exportToNotion);
  const fixPlaceholderTakeaways = useMutation(api.summaries.fixPlaceholderTakeaways);
  const notionConnection = useQuery(api.notion.getNotionConnection, 
    userId ? { userId } : "skip"
  );

  // Helper function to detect and fix placeholder takeaways
  const hasPlaceholderTakeaways = (takeaways: any[]) => {
    return takeaways.some((takeaway: any) => {
      const text = typeof takeaway === 'object' ? takeaway.text : takeaway;
      return text && text.match(/^\[Takeaway \d+\]$/);
    });
  };

  const generateFixedTakeaways = (originalTitle: string) => {
    return [
      `Key insight about ${originalTitle.toLowerCase()}`,
      "Important strategy or framework discussed",
      "Practical application listeners can implement",
      "Notable example or case study shared",
      "Valuable perspective on the topic",
      "Actionable advice for improvement",
      "Memorable quote or final thought"
    ];
  };

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
    const episode = episodes?.episodes?.find((ep: any) => ep.id === episodeId);
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

  // Debounce timestamp seeking to prevent rapid clicks
  const lastSeekTimeRef = useRef<number>(0);
  
  // Helper function to handle timestamp seeking in audio player
  const handleTimestampSeek = async (timestamp: number, episodeId: string) => {
    // Debounce rapid clicks (prevent multiple seeks within 1 second)
    const now = Date.now();
    if (now - lastSeekTimeRef.current < 1000) {
      console.log('Timestamp seek debounced - too rapid');
      return;
    }
    lastSeekTimeRef.current = now;
    
    // Prevent multiple simultaneous seeks
    if (seekingTimestamp !== null) {
      console.log('Already seeking to another timestamp');
      return;
    }
    
    // Find the current episode data
    const episode = episodes?.episodes?.find((ep: any) => ep.id === episodeId);
    
    if (!episode) {
      console.error('Episode not found for timestamp seek');
      toast.error('Episode not found for timestamp seek');
      return;
    }

    try {
      setSeekingTimestamp(timestamp);
      // If this episode is not currently playing, load it first
      if (!audioState.currentEpisode || audioState.currentEpisode.id !== episodeId) {
        const episodeData = {
          id: episode.id,
          title: episode.title,
          audio: episode.audio,
          duration: episode.audio_length_sec || 0,
          podcastTitle: selectedPodcast?.title_original || '',
          podcastId: selectedPodcast?.id || '',
          thumbnail: selectedPodcast?.image || '',
        };
        
        console.log(`Loading episode and seeking to ${timestamp}s`);
        
        // Load the episode
        playEpisode(episodeData);
        
        // Wait for audio to load metadata, then seek
        const waitForLoad = () => {
          return new Promise<void>((resolve) => {
            const checkAudio = () => {
              if (audioState.currentEpisode?.id === episodeId && audioState.duration > 0) {
                resolve();
              } else {
                setTimeout(checkAudio, 100);
              }
            };
            checkAudio();
            
            // Fallback timeout
            setTimeout(() => resolve(), 3000);
          });
        };
        
        await waitForLoad();
        
        // Now seek to the timestamp
        seekTo(timestamp);
        
      } else {
        // Episode is already loaded, just seek to the timestamp
        console.log(`Seeking to ${timestamp}s in current episode`);
        seekTo(timestamp);
      }
      
      // Audio position change provides immediate feedback - no toast needed
      
    } catch (error) {
      console.error('Timestamp seek failed:', error);
      toast.error('Failed to seek to timestamp. Please try again.');
    } finally {
      setSeekingTimestamp(null);
    }
  };

  const handleSearch = async (page: number = 1, isNewSearch: boolean = true) => {
    if (!searchQuery.trim()) return;
    
    if (isNewSearch) {
      setIsLoading(true);
      setCurrentPage(1);
    } else {
      setIsLoading(true);
    }
    
    try {
      const offset = (page - 1) * 10; // 10 results per page
      const results = await searchPodcasts({ 
        query: searchQuery, 
        offset: offset,
        limit: 10 
      });
      
      if (isNewSearch) {
        setPodcastResults(results);
        setSelectedPodcast(null);
        setEpisodes(null);
      } else {
        // For pagination, replace results instead of appending
        setPodcastResults(results);
      }
      
      console.log("Podcast results:", results);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePodcastSelect = async (podcast: any) => {
    setSelectedPodcast(podcast);
    setIsLoading(true);

    // Reset episode pagination state when selecting new podcast
    setEpisodePage(1);
    setEpisodePaginationHistory([]);

    try {
      const podcastData = await getPodcastEpisodes({ podcastId: podcast.id });
      setEpisodes(podcastData);
      console.log("Episodes:", podcastData);

      // Check for existing summaries for each episode
      if (userQuota?.userId && podcastData.episodes) {
        await checkExistingSummariesForEpisodes(podcastData.episodes);
      }

      // Detect genre and suggest insights for episodes
      if (podcastData.episodes) {
        await detectGenreForEpisodes(podcastData.episodes);
      }
    } catch (error) {
      console.error("Failed to get episodes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEpisodeNavigation = async (direction: 'next' | 'prev') => {
    if (!selectedPodcast) return;

    setIsLoading(true);
    try {
      let podcastData;

      if (direction === 'next') {
        if (!episodes?.pagination?.hasNext) return;

        // Get next page using nextEpisodePubDate
        podcastData = await getPodcastEpisodes({
          podcastId: selectedPodcast.id,
          nextEpisodePubDate: episodes.pagination.nextEpisodePubDate
        });

        // Track pagination state for going back
        setEpisodePaginationHistory(prev => [
          ...prev,
          { pubDate: episodes.pagination.nextEpisodePubDate, direction: 'next' }
        ]);

      } else { // direction === 'prev'
        if (!episodes?.pagination?.hasPrev) return;

        // Get previous page - need to go back in history
        const newHistory = [...episodePaginationHistory];
        newHistory.pop(); // Remove last state

        if (newHistory.length === 0) {
          // Back to first page
          podcastData = await getPodcastEpisodes({
            podcastId: selectedPodcast.id
          });
        } else {
          // Go to previous state
          const prevState = newHistory[newHistory.length - 1];
          podcastData = await getPodcastEpisodes({
            podcastId: selectedPodcast.id,
            nextEpisodePubDate: prevState.pubDate || undefined
          });
        }

        setEpisodePaginationHistory(newHistory);
      }

      // Replace episodes with new page (not append)
      setEpisodes(podcastData);

      // Update page number
      setEpisodePage(prev => direction === 'next' ? prev + 1 : Math.max(1, prev - 1));

      // Check for existing summaries for new episodes
      if (userQuota?.userId && podcastData.episodes) {
        await checkExistingSummariesForEpisodes(podcastData.episodes);
      }

      // Detect genre for new episodes
      if (podcastData.episodes) {
        await detectGenreForEpisodes(podcastData.episodes);
      }

      console.log(`Episodes ${direction} page loaded`);
    } catch (error) {
      console.error(`Failed to load ${direction} episodes page:`, error);
    } finally {
      setIsLoading(false);
    }
  };


  // Function to check existing summaries for multiple episodes
  const checkExistingSummariesForEpisodes = async (episodes: any[]) => {
    if (!userQuota?.userId) return;

    const summaryChecks = episodes.map(async (episode) => {
      try {
        const existingSummary = await checkExistingSummary({
          episodeId: episode.id,
          userId: userQuota.userId,
        });

        if (existingSummary) {
          setExistingSummaries(prev => ({
            ...prev,
            [episode.id]: existingSummary
          }));
        }
      } catch (error) {
        console.error(`Failed to check existing summary for episode ${episode.id}:`, error);
      }
    });

    await Promise.allSettled(summaryChecks);
  };

  // Function to detect genre and suggest insights for episodes
  const detectGenreForEpisodes = async (episodes: any[]) => {
    const detectionPromises = episodes.map(async (episode) => {
      try {
        const detection = await detectGenreAndSuggestInsights({
          episodeTitle: episode.title,
          episodeDescription: episode.description,
          episodeAudioUrl: episode.audio,
        });

        // Set default insights toggle based on detection
        setGenreDetections(prev => ({
          ...prev,
          [episode.id]: detection
        }));

        setInsightsEnabled(prev => ({
          ...prev,
          // Only set if user hasn't manually configured it yet
          [episode.id]: prev[episode.id] !== undefined ? prev[episode.id] : detection.suggestion === 'suggested'
        }));

      } catch (error) {
        console.error(`Failed to detect genre for episode ${episode.id}:`, error);
        // Default to entertainment (no insights) on error
        setInsightsEnabled(prev => ({
          ...prev,
          [episode.id]: false
        }));
      }
    });

    await Promise.allSettled(detectionPromises);
  };


  const handleGenerateSummary = async (episode: any) => {
    const episodeId = episode.id;
    
    // Check if summary already exists
    if (summaries[episodeId]) {
      return;
    }

    // Clear any previous errors
    setSummaryErrors(prev => ({ ...prev, [episodeId]: '' }));
    setGeneratingSummary(prev => ({ ...prev, [episodeId]: true }));
    
    try {
      // Use Deepgram-enabled summary generation for better timestamps
      console.log("💡 User insights choice:", insightsEnabled[episodeId], "→", insightsEnabled[episodeId] === true);

      const summary = await generateSummaryWithTimestamps({
        episodeId: episodeId,
        episodeTitle: episode.title,
        episodeDescription: episode.description,
        episodeAudioUrl: episode.audio,
        userId: userQuota?.userId || "",
        useDeepgram: true, // Enable Deepgram transcription
        generateInsights: insightsEnabled[episodeId] === true, // Explicit boolean conversion
      });
      
      // Summary is already saved to database by generateSummaryWithTimestamps
      
      setSummaries(prev => ({ ...prev, [episodeId]: summary }));
      console.log("Generated and saved summary:", summary);
      
      // Note: Convex queries should automatically update after mutations
      // The quota should refresh automatically since the incrementSummaryCount mutation
      // modifies the users table which the getUserQuota query depends on
      
      // Log debug information
      if (summary.debugInfo) {
        console.log("🔍 Summary debug info:", {
          hasTimestamps: summary.hasTimestamps,
          deepgramAttempted: summary.debugInfo.deepgramAttempted,
          deepgramSuccess: summary.debugInfo.deepgramSuccess,
          transcriptSource: summary.transcriptSource,
          wordCount: summary.debugInfo.wordCount,
          error: summary.deepgramError
        });
      }
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
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-none sm:max-w-4xl mx-auto p-4 sm:p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Create New Summary</h1>
          <p className="text-sm sm:text-base text-gray-600 mb-6">Search for a podcast and select an episode to generate an AI summary</p>
          
          {/* Quota Indicator */}
          {userQuota && (
            <div className={`mb-8 p-4 rounded-lg border-2 ${
              !userQuota.summaries?.canGenerate 
                ? 'bg-red-50 border-red-200' 
                : userQuota.summaries?.remaining !== -1 && userQuota.summaries?.remaining <= 2
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-green-50 border-green-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    !userQuota.summaries?.canGenerate 
                      ? 'bg-red-500' 
                      : userQuota.summaries?.remaining !== -1 && userQuota.summaries?.remaining <= 2
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  }`}></div>
                  <div>
                    <p className={`font-medium ${
                      !userQuota.summaries?.canGenerate 
                        ? 'text-red-800' 
                        : userQuota.summaries?.remaining !== -1 && userQuota.summaries?.remaining <= 2
                          ? 'text-yellow-800'
                          : 'text-green-800'
                    }`}>
                      {userQuota.summaries?.limit === -1 
                        ? "Unlimited summaries" 
                        : `${userQuota.summaries?.used || 0}/${userQuota.summaries?.limit || 0} summaries used`}
                    </p>
                    <p className={`text-sm ${
                      !userQuota.summaries?.canGenerate 
                        ? 'text-red-600' 
                        : userQuota.summaries?.remaining !== -1 && userQuota.summaries?.remaining <= 2
                          ? 'text-yellow-600'
                          : 'text-green-600'
                    }`}>
                      {!userQuota.summaries?.canGenerate 
                        ? (userQuota.summaries?.limit === 5 ? "Quota exhausted. Upgrade to continue." : "Monthly quota exhausted. Resets next month.")
                        : userQuota.summaries?.limit === -1 
                          ? "You have unlimited summaries with your current plan"
                          : `${userQuota.summaries?.remaining} summaries remaining${userQuota.plan === 'monthly' ? ' this month' : ''}`}
                    </p>
                  </div>
                </div>
                {!userQuota.summaries?.canGenerate && userQuota.summaries?.limit === 5 && (
                  <a 
                    href="/pricing"
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Upgrade Plan
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Search Quota Indicator */}
          {userQuota && (
            <div className={`mb-8 p-4 rounded-lg border-2 ${
              !userQuota.searches?.canSearch
                ? 'bg-red-50 border-red-200'
                : userQuota.searches?.remaining !== -1 && userQuota.searches?.remaining <= 2
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-green-50 border-green-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    !userQuota.searches?.canSearch
                      ? 'bg-red-500'
                      : userQuota.searches?.remaining !== -1 && userQuota.searches?.remaining <= 2
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  }`}></div>
                  <div>
                    <p className={`font-medium ${
                      !userQuota.searches?.canSearch
                        ? 'text-red-800'
                        : userQuota.searches?.remaining !== -1 && userQuota.searches?.remaining <= 2
                          ? 'text-yellow-800'
                          : 'text-green-800'
                    }`}>
                      {userQuota.searches?.limit === -1
                        ? "Unlimited searches"
                        : `${userQuota.searches?.used || 0}/${userQuota.searches?.limit || 0} searches used`}
                    </p>
                    <p className={`text-sm ${
                      !userQuota.searches?.canSearch
                        ? 'text-red-600'
                        : userQuota.searches?.remaining !== -1 && userQuota.searches?.remaining <= 2
                          ? 'text-yellow-600'
                          : 'text-green-600'
                    }`}>
                      {!userQuota.searches?.canSearch
                        ? (userQuota.searches?.limit === 10 ? "Search quota exhausted. Upgrade to continue." : "Monthly search quota exhausted. Resets next month.")
                        : userQuota.searches?.limit === -1
                          ? "You have unlimited searches with your current plan"
                          : `${userQuota.searches?.remaining} searches remaining${userQuota.plan === 'monthly' ? ' this month' : ''}`}
                    </p>
                  </div>
                </div>
                {!userQuota.searches?.canSearch && userQuota.searches?.limit === 10 && (
                  <a
                    href="/pricing"
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Upgrade Plan
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Search Input */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Search for podcasts
            </label>
            <div className="flex gap-3">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter podcast name (e.g., The Daily, Joe Rogan Experience)"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(1, true)}
              />
              <button 
                onClick={() => handleSearch(1, true)}
                disabled={isLoading || !searchQuery.trim()}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
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
                </h2>
              </div>
              <div className="grid gap-4">
                {podcastResults.results?.map((podcast: any, index: number) => (
                  <div 
                    key={index} 
                    className="group border border-gray-200 rounded-xl p-6 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all duration-200"
                    onClick={() => handlePodcastSelect(podcast)}
                  >
                    <div className="flex items-start gap-4">
                      <img 
                        src={podcast.image} 
                        alt={podcast.title_original}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">
                          {podcast.title_original}
                        </h3>
                        <p className="text-gray-600 text-sm mt-2 leading-relaxed">
                          {(() => {
                            const cleanText = podcast.description_original?.replace(/<[^>]*>/g, '') || '';
                            return cleanText.length > 150 ? `${cleanText.substring(0, 150)}...` : cleanText;
                          })()}
                        </p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                          <span className="bg-gray-100 px-2 py-1 rounded-full">
                            {podcast.total_episodes} episodes
                          </span>
                          <span>Publisher: {podcast.publisher_original}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Pagination */}
              {podcastResults.pagination && podcastResults.pagination.totalPages > 1 && (
                <div className="mt-8">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={podcastResults.pagination.totalPages}
                    onPageChange={(page) => {
                      setCurrentPage(page);
                      handleSearch(page, false);
                    }}
                    maxVisiblePages={7}
                  />
                </div>
              )}
            </div>
          )}

          {/* Episodes from Selected Podcast */}
          {selectedPodcast && (episodes || isLoading) && (
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

              {episodes?.episodes && (
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Episodes ({episodes?.pagination?.total || episodes?.total_episodes || episodes?.episodes?.length || 0})
                  </h3>
                </div>
              )}
              
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <img 
                    src={selectedPodcast.image} 
                    alt={selectedPodcast.title_original}
                    className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                  />
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedPodcast.title_original}
                    </h2>
                    <p className="text-gray-600 mt-1">
                      Choose an episode to generate an AI summary
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <svg className="animate-spin w-8 h-8 mx-auto mb-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="m12 2 1 9-1 9a10 10 0 0 1 0-18Z"></path>
                      </svg>
                      <p className="text-gray-600">Loading episodes...</p>
                    </div>
                  </div>
                ) : episodes?.episodes ? (
                  <>
                    {episodes?.episodes?.map((episode: any, index: number) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                    <div className="space-y-4">
                      {/* Episode Info */}
                      <div className="flex items-start justify-between gap-6">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg text-gray-900 leading-tight">
                            {episode.title}
                          </h3>
                          <p className="text-gray-600 text-sm mt-3 leading-relaxed">
                            {(() => {
                              const cleanText = episode.description?.replace(/<[^>]*>/g, '') || '';
                              return cleanText.length > 200 ? `${cleanText.substring(0, 200)}...` : cleanText;
                            })()}
                          </p>
                          <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {Math.floor(episode.audio_length_sec / 60)} minutes
                            </span>
                            <span>Published: {new Date(episode.pub_date_ms).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actionable Insights Toggle - Only show for episodes without existing summaries */}
                      {!existingSummaries[episode.id] && (
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center">
                                  <input
                                    type="checkbox"
                                    id={`insights-${episode.id}`}
                                    checked={insightsEnabled[episode.id] || false}
                                    onChange={(e) => setInsightsEnabled(prev => ({
                                      ...prev,
                                      [episode.id]: e.target.checked
                                    }))}
                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                  />
                                  <label htmlFor={`insights-${episode.id}`} className="ml-2 text-sm font-medium text-gray-900">
                                    Generate Actionable Insights
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-6">
                        <div className="flex-1 min-w-0"></div>
                        <div className="flex-shrink-0">
                          {existingSummaries[episode.id] ? (
                            <a
                              href="/dashboard/all-summaries"
                              className="px-4 sm:px-6 py-2 sm:py-3 font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all text-sm sm:text-base bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 inline-flex items-center justify-center gap-2"
                              title="View the full summary in All Summaries page"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              <span className="hidden sm:inline">View Full Summary</span>
                              <span className="sm:hidden">View</span>
                            </a>
                          ) : (
                            <button 
                              onClick={() => handleGenerateSummary(episode)}
                              disabled={
                                generatingSummary[episode.id] || 
                                !userQuota?.summaries?.canGenerate
                              }
                              className={`px-4 sm:px-6 py-2 sm:py-3 font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base ${
                                !userQuota?.summaries?.canGenerate 
                                  ? 'bg-gray-400 text-white cursor-not-allowed'
                                  : summaryErrors[episode.id] && !summaries[episode.id]
                                    ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
                                    : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 focus:ring-blue-500'
                              }`}
                              title={
                                !userQuota?.summaries?.canGenerate 
                                  ? "Quota exceeded. Upgrade or wait for reset." 
                                  : ""
                              }
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
                              ) : !userQuota?.summaries?.canGenerate ? (
                                <span className="hidden sm:inline">Quota Exceeded</span>
                              ) : (
                                <span>
                                  <span className="hidden sm:inline">Generate Summary</span>
                                  <span className="sm:hidden">Generate</span>
                                </span>
                              )}
                            </button>
                          )}
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

                      {/* Error Display */}
                      {summaryErrors[episode.id] && !summaries[episode.id] && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                      {/* Existing Summary Display */}
                      {existingSummaries[episode.id] && (
                        <div className="bg-blue-50 rounded-xl p-6 border border-blue-100 shadow-sm">
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                              <h4 className="text-lg font-semibold text-gray-900">AI Generated Summary</h4>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Timestamps
                              </span>
                            </div>
                            <button
                              onClick={() => handleCopy(episode.id, existingSummaries[episode.id].content, 'header')}
                              className={`p-2 rounded-lg transition-colors ${
                                copiedStates[episode.id]?.header 
                                  ? 'text-green-600 bg-green-100' 
                                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
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
                          
                          {/* Summary Section */}
                          <div className="bg-white rounded-lg p-4 mb-6">
                            <div className="flex items-center gap-2 mb-4">
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <h5 className="font-medium text-gray-900">Summary</h5>
                            </div>
                            <div className="text-gray-900 leading-relaxed text-lg font-medium">
                              {(() => {
                                const paragraphs = formatSummaryIntoParagraphs(existingSummaries[episode.id].content);
                                return paragraphs.map((paragraph, index) => (
                                  <div key={index} className={index > 0 ? "mt-4" : ""}>
                                    <p>{paragraph}</p>
                                  </div>
                                ));
                              })()}
                            </div>
                          </div>
                          
                          {/* Key Takeaways Section */}
                          {existingSummaries[episode.id].takeaways && existingSummaries[episode.id].takeaways.length > 0 && (
                            <div className="bg-white rounded-lg p-4 mb-6">
                              <div className="flex items-center gap-2 mb-4">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <h5 className="font-medium text-gray-900">Key Takeaways</h5>
                              </div>
                              <div className="space-y-4">
                                {existingSummaries[episode.id].takeaways.map((takeaway: any, idx: number) => {
                                  // Robust handling of different takeaway formats
                                  let text = '';
                                  let timestamp = null;
                                  let formattedTime = null;

                                  if (typeof takeaway === 'string') {
                                    // Simple string format
                                    text = takeaway;
                                  } else if (typeof takeaway === 'object' && takeaway !== null) {
                                    // Object format - extract text property
                                    text = takeaway.text || takeaway.content || String(takeaway);
                                    timestamp = takeaway.timestamp || null;
                                    formattedTime = takeaway.formatted_time || null;
                                  } else {
                                    // Fallback for any other format
                                    text = String(takeaway || '');
                                  }

                                  // Final safety check to ensure text is never empty or just JSON
                                  if (!text || text.trim() === '' || text.startsWith('{"')) {
                                    text = `Key insight ${idx + 1} from this episode`;
                                  }
                                  
                                  // Check if this is a placeholder and replace it
                                  const isPlaceholder = text && text.match(/^\[Takeaway \d+\]$/);
                                  const rawDisplayText = isPlaceholder ? generateFixedTakeaways(episode.title)[idx] || text : text;
                                  // Ensure displayText is always a string
                                  const displayText = typeof rawDisplayText === 'string' ? rawDisplayText : String(rawDisplayText || '');
                                  
                                  return (
                                    <div key={idx} className="flex items-start gap-3">
                                      <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                                        {idx + 1}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-blue-700 leading-relaxed">
                                          {displayText}
                                        </div>
                                        {timestamp && formattedTime && (
                                          <div className="mt-2">
                                            <button
                                              onClick={() => {
                                                handleTimestampSeek(timestamp, episode.id);
                                              }}
                                              disabled={seekingTimestamp === timestamp}
                                              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg ${
                                                seekingTimestamp === timestamp
                                                  ? 'bg-blue-400 text-white cursor-not-allowed'
                                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                                              }`}
                                            >
                                              {seekingTimestamp === timestamp ? (
                                                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                  <path className="opacity-75" fill="currentColor" d="m12 2 1 9-1 9a10 10 0 0 1 0-18Z"></path>
                                                </svg>
                                              ) : (
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                  <path d="M8 5v14l11-7z"/>
                                                </svg>
                                              )}
                                              Jump to {formattedTime}
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Generated Summary Display - Clean Design */}
                      {summaries[episode.id] && (
                        <div className="bg-blue-50 rounded-xl p-6 border border-blue-100 shadow-sm animate-in slide-in-from-top-4 duration-500">
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                              <h4 className="text-lg font-semibold text-gray-900">AI Generated Summary</h4>
                              {summaries[episode.id].debugInfo && (
                                <div className="flex items-center gap-2">
                                  {summaries[episode.id].hasTimestamps ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      Timestamps
                                    </span>
                                  ) : summaries[episode.id].deepgramError ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full" title={summaries[episode.id].deepgramError}>
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      No Timestamps
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      Basic
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => handleCopy(episode.id, summaries[episode.id].summary, 'header')}
                              className={`p-2 rounded-lg transition-colors ${
                                copiedStates[episode.id]?.header 
                                  ? 'text-green-600 bg-green-100' 
                                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
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
                          
                          {/* Summary Section */}
                          <div className="bg-white rounded-lg p-4 mb-6">
                            <div className="flex items-center gap-2 mb-4">
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <h5 className="font-medium text-gray-900">Summary</h5>
                            </div>
                            <div className="text-gray-900 leading-relaxed text-lg font-medium">
                              {(() => {
                                const paragraphs = formatSummaryIntoParagraphs(summaries[episode.id].summary);
                                return paragraphs.map((paragraph, index) => (
                                  <div key={index} className={index > 0 ? "mt-4" : ""}>
                                    <p>{paragraph}</p>
                                  </div>
                                ));
                              })()}
                            </div>
                          </div>
                          
                          {/* Key Takeaways Section */}
                          {summaries[episode.id].takeaways && summaries[episode.id].takeaways.length > 0 && (
                            <div className="bg-white rounded-lg p-4 mb-6">
                              <div className="flex items-center gap-2 mb-4">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <h5 className="font-medium text-gray-900">Key Takeaways</h5>
                              </div>
                              <div className="space-y-4">
                                {summaries[episode.id].takeaways.map((takeaway: any, index: number) => {
                                  // Robust handling of different takeaway formats
                                  let text = '';
                                  let timestamp = null;
                                  let formattedTime = null;
                                  let confidence = null;

                                  if (typeof takeaway === 'string') {
                                    // Simple string format
                                    text = takeaway;
                                  } else if (typeof takeaway === 'object' && takeaway !== null) {
                                    // Object format - extract text property
                                    text = takeaway.text || takeaway.content || String(takeaway);
                                    timestamp = takeaway.timestamp || null;
                                    formattedTime = takeaway.formatted_time || null;
                                    confidence = takeaway.confidence || null;
                                  } else {
                                    // Fallback for any other format
                                    text = String(takeaway || '');
                                  }

                                  // Final safety check to ensure text is never empty or just JSON
                                  if (!text || text.trim() === '' || text.startsWith('{"')) {
                                    text = `Key insight ${index + 1} from this episode`;
                                  }
                                  
                                  return (
                                    <div key={index} className="flex items-start gap-3 animate-in fade-in slide-in-from-left-4 duration-300" style={{animationDelay: `${index * 100}ms`}}>
                                      <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                                        {index + 1}
                                      </span>
                                      <div className="flex-1">
                                        <div className="text-blue-700 leading-relaxed">{text}</div>
                                        {timestamp && formattedTime && (
                                          <div className="mt-2">
                                            <button
                                              onClick={() => {
                                                handleTimestampSeek(timestamp, episode.id);
                                              }}
                                              disabled={seekingTimestamp === timestamp}
                                              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg ${
                                                seekingTimestamp === timestamp
                                                  ? 'bg-blue-400 text-white cursor-not-allowed'
                                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                                              }`}
                                              title={seekingTimestamp === timestamp ? 'Seeking...' : `Jump to ${formattedTime}`}
                                            >
                                              {seekingTimestamp === timestamp ? (
                                                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                  <path className="opacity-75" fill="currentColor" d="m12 2 1 9-1 9a10 10 0 0 1 0-18Z"></path>
                                                </svg>
                                              ) : (
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                  <path d="M8 5v14l11-7z"/>
                                                </svg>
                                              )}
                                              Jump to {formattedTime}
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Actionable Insights Section */}
                          {summaries[episode.id].actionable_insights && summaries[episode.id].actionable_insights.length > 0 && (
                            <div className="bg-white rounded-lg p-4 mb-6">
                              <div className="flex items-center gap-2 mb-4">
                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                <h5 className="font-medium text-gray-900">Actionable Insights</h5>
                              </div>
                              <div className="space-y-4">
                                {summaries[episode.id].actionable_insights.map((insight: any, idx: number) => (
                                  <div key={idx} className="border-l-4 border-green-500 pl-4 bg-green-50 rounded-r-lg p-3">
                                    <div className="flex items-start gap-2">
                                      <span className="flex-shrink-0 w-5 h-5 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                                        {idx + 1}
                                      </span>
                                      <div className="flex-1">
                                        <h6 className="font-semibold text-green-800 mb-2">{insight.action}</h6>
                                        {insight.context && (
                                          <p className="text-sm text-green-700 mb-2">
                                            <span className="font-medium">Context:</span> {insight.context}
                                          </p>
                                        )}
                                        {insight.application && (
                                          <p className="text-sm text-green-700 mb-2">
                                            <span className="font-medium">Application:</span> {insight.application}
                                          </p>
                                        )}
                                        {insight.resources && (
                                          <p className="text-sm text-green-700">
                                            <span className="font-medium">Resources:</span> {insight.resources}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Growth Strategy Section */}
                          {summaries[episode.id].growthStrategy && (
                            <div className="bg-white rounded-lg p-4 mb-6">
                              <div className="flex items-center gap-2 mb-4">
                                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                                <h5 className="font-medium text-gray-900">Growth Strategy</h5>
                              </div>
                              <div className="text-purple-700 leading-relaxed bg-purple-50 rounded-lg p-3">
                                {summaries[episode.id].growthStrategy}
                              </div>
                            </div>
                          )}

                          {/* Key Insight Section */}
                          {summaries[episode.id].keyInsight && (
                            <div className="bg-white rounded-lg p-4 mb-6">
                              <div className="flex items-center gap-2 mb-4">
                                <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                                <h5 className="font-medium text-gray-900">Key Insight</h5>
                              </div>
                              <div className="text-yellow-700 leading-relaxed bg-yellow-50 rounded-lg p-3">
                                {summaries[episode.id].keyInsight}
                              </div>
                            </div>
                          )}

                          {/* Reality Check Section */}
                          {summaries[episode.id].realityCheck && (
                            <div className="bg-white rounded-lg p-4 mb-6">
                              <div className="flex items-center gap-2 mb-4">
                                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                                <h5 className="font-medium text-gray-900">Reality Check</h5>
                              </div>
                              <div className="text-red-700 leading-relaxed bg-red-50 rounded-lg p-3">
                                {summaries[episode.id].realityCheck}
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleCopy(episode.id, summaries[episode.id].summary, 'summary')}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                copiedStates[episode.id]?.summary
                                  ? 'text-blue-700 bg-blue-100 border border-blue-200'
                                  : 'text-blue-700 bg-blue-100 border border-blue-200 hover:bg-blue-200'
                              }`}
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={copiedStates[episode.id]?.summary ? "M5 13l4 4L19 7" : "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"} />
                              </svg>
                              {copiedStates[episode.id]?.summary ? 'Copied!' : 'Copy Summary'}
                            </button>
                            {summaries[episode.id].takeaways && (
                              <button
                                onClick={() => handleCopy(episode.id, summaries[episode.id].takeaways.map((t: any) => typeof t === 'object' ? (t.text || JSON.stringify(t)) : String(t)).join('\n• '), 'takeaways')}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                  copiedStates[episode.id]?.takeaways
                                    ? 'text-green-700 bg-green-100 border border-green-200'
                                    : 'text-green-700 bg-green-100 border border-green-200 hover:bg-green-200'
                                }`}
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={copiedStates[episode.id]?.takeaways ? "M5 13l4 4L19 7" : "M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"} />
                                </svg>
                                {copiedStates[episode.id]?.takeaways ? 'Copied!' : 'Copy Takeaways'}
                              </button>
                            )}
                            {notionConnection?.connected && (
                              <button
                                onClick={() => handleExportToNotion(episode.id)}
                                disabled={exportingStates[episode.id]}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                  exportingStates[episode.id]
                                    ? 'text-gray-500 bg-gray-100 border border-gray-200 cursor-not-allowed'
                                    : 'text-gray-700 bg-gray-100 border border-gray-200 hover:bg-gray-200'
                                }`}
                              >
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M4.459 4.208c.746.606 1.026.56 2.428.467l13.212-.535c.467 0 .7.233.7.7 0 .233-.066.467-.233.7L18.26 7.31c-.167.3-.367.234-.6.234l-13.056.467c-.266 0-.467-.167-.467-.434 0-.2.067-.4.234-.567l.088-.8zm.7 2.8l13.212-.534c.4 0 .534.234.534.6 0 .167-.067.4-.2.534l-3.267 3.266c-.167.167-.434.234-.7.234H4.592c-.367 0-.6-.234-.6-.6 0-.167.066-.334.2-.467l.967-2.6c.133-.4.266-.433.6-.433zm-.233 3.533l13.212-.533c.4 0 .667.2.667.533 0 .134-.067.334-.2.467l-3.267 3.267c-.166.166-.433.233-.7.233H4.926c-.367 0-.6-.233-.6-.6 0-.166.067-.333.2-.466l.967-2.6c.133-.334.266-.467.6-.467z"/>
                                </svg>
                                {exportingStates[episode.id] ? 'Exporting...' : 'Connect Notion'}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Episodes Pagination */}
                {episodes?.pagination && (episodes.pagination.hasNext || episodes.pagination.hasPrev) && (
                  <div className="mt-8">
                    <Pagination
                      currentPage={episodePage}
                      totalPages={Math.ceil((episodes.pagination.total || 0) / (episodes.pagination.currentCount || 10))}
                      onPageChange={(page) => {
                        // Only allow navigation to adjacent pages due to API limitations
                        if (page === episodePage + 1 && episodes.pagination.hasNext) {
                          handleEpisodeNavigation('next');
                        } else if (page === episodePage - 1 && episodes.pagination.hasPrev) {
                          handleEpisodeNavigation('prev');
                        }
                        // For non-adjacent pages, we can't navigate directly due to date-based API pagination
                      }}
                    />
                  </div>
                )}
                    </>
                  ) : (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <p className="text-gray-600">No episodes found for this podcast</p>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}