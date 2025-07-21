import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { EnhancedAudioPlayer } from "~/components/audio/enhanced-audio-player";
import type { Episode } from "~/contexts/app-context";

export default function NewSummary() {
  const [searchQuery, setSearchQuery] = useState("");
  const [podcastResults, setPodcastResults] = useState<any>(null);
  const [selectedPodcast, setSelectedPodcast] = useState<any>(null);
  const [episodes, setEpisodes] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState<{[key: string]: boolean}>({});
  const [summaries, setSummaries] = useState<{[key: string]: any}>({});
  const [summaryErrors, setSummaryErrors] = useState<{[key: string]: string}>({});
  const [copiedStates, setCopiedStates] = useState<{[key: string]: { summary?: boolean, takeaways?: boolean, header?: boolean }}>({});
  
  const searchPodcasts = useAction(api.podcasts.searchPodcasts);
  const getPodcastEpisodes = useAction(api.podcasts.getPodcastEpisodes);
  const generateSummary = useAction(api.summaries.generateSummary);
  const createSummary = useMutation(api.summaries.createSummary);
  const userQuota = useQuery(api.users.getUserQuota);

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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    try {
      const results = await searchPodcasts({ query: searchQuery });
      setPodcastResults(results);
      setSelectedPodcast(null);
      setEpisodes(null);
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
    try {
      const podcastData = await getPodcastEpisodes({ podcastId: podcast.id });
      setEpisodes(podcastData.episodes);
      console.log("Episodes:", podcastData.episodes);
    } catch (error) {
      console.error("Failed to get episodes:", error);
    } finally {
      setIsLoading(false);
    }
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-8">
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
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button 
                onClick={handleSearch}
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
                  Found {podcastResults.results?.length || 0} podcasts
                </h2>
                <span className="text-sm text-gray-500">Click a podcast to see episodes</span>
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
                {episodes?.map((episode: any, index: number) => (
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
                        <div className="flex-shrink-0">
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
                            className={`px-4 sm:px-6 py-2 sm:py-3 font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base ${
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
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}