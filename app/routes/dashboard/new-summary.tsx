import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function NewSummary() {
  const [searchQuery, setSearchQuery] = useState("");
  const [podcastResults, setPodcastResults] = useState<any>(null);
  const [selectedPodcast, setSelectedPodcast] = useState<any>(null);
  const [episodes, setEpisodes] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [audioRefs, setAudioRefs] = useState<{[key: string]: HTMLAudioElement}>({});
  const [currentTime, setCurrentTime] = useState<{[key: string]: number}>({});
  const [duration, setDuration] = useState<{[key: string]: number}>({});
  const [isPlaying, setIsPlaying] = useState<{[key: string]: boolean}>({});
  const [generatingSummary, setGeneratingSummary] = useState<{[key: string]: boolean}>({});
  const [summaries, setSummaries] = useState<{[key: string]: any}>({});
  
  const searchPodcasts = useAction(api.podcasts.searchPodcasts);
  const getPodcastEpisodes = useAction(api.podcasts.getPodcastEpisodes);
  const generateSummary = useAction(api.summaries.generateSummary);
  const createSummary = useMutation(api.summaries.createSummary);

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

  const handlePlayPause = (episodeId: string, audioUrl: string) => {
    const audioRef = audioRefs[episodeId];
    
    if (currentlyPlaying === episodeId) {
      // Pause current episode
      if (audioRef) {
        audioRef.pause();
        setIsPlaying(prev => ({ ...prev, [episodeId]: false }));
      }
      setCurrentlyPlaying(null);
    } else {
      // Stop any currently playing audio
      if (currentlyPlaying && audioRefs[currentlyPlaying]) {
        audioRefs[currentlyPlaying].pause();
        setIsPlaying(prev => ({ ...prev, [currentlyPlaying]: false }));
      }
      
      // Play new episode
      if (audioRef) {
        audioRef.play();
        setIsPlaying(prev => ({ ...prev, [episodeId]: true }));
      } else {
        // Create new audio element
        const newAudio = new Audio(audioUrl);
        
        // Add event listeners
        newAudio.addEventListener('loadedmetadata', () => {
          setDuration(prev => ({ ...prev, [episodeId]: newAudio.duration }));
        });
        
        newAudio.addEventListener('timeupdate', () => {
          setCurrentTime(prev => ({ ...prev, [episodeId]: newAudio.currentTime }));
        });
        
        newAudio.addEventListener('ended', () => {
          setIsPlaying(prev => ({ ...prev, [episodeId]: false }));
          setCurrentlyPlaying(null);
        });
        
        newAudio.play();
        setAudioRefs(prev => ({ ...prev, [episodeId]: newAudio }));
        setIsPlaying(prev => ({ ...prev, [episodeId]: true }));
      }
      setCurrentlyPlaying(episodeId);
    }
  };

  const handleSeek = (episodeId: string, seekTime: number) => {
    const audioRef = audioRefs[episodeId];
    if (audioRef) {
      audioRef.currentTime = seekTime;
      setCurrentTime(prev => ({ ...prev, [episodeId]: seekTime }));
    }
  };

  const handleSkip = (episodeId: string, seconds: number) => {
    const audioRef = audioRefs[episodeId];
    if (audioRef) {
      const newTime = Math.max(0, Math.min(audioRef.duration, audioRef.currentTime + seconds));
      audioRef.currentTime = newTime;
      setCurrentTime(prev => ({ ...prev, [episodeId]: newTime }));
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleGenerateSummary = async (episode: any) => {
    const episodeId = episode.id;
    
    // Check if summary already exists
    if (summaries[episodeId]) {
      return;
    }

    setGeneratingSummary(prev => ({ ...prev, [episodeId]: true }));
    
    try {
      const summary = await generateSummary({
        episodeId: episodeId,
        episodeTitle: episode.title,
        episodeDescription: episode.description,
        userId: "temp-user-id", // TODO: Get actual user ID from auth
      });
      
      // Save summary to database
      await createSummary({
        episodeId: episodeId,
        userId: "temp-user-id",
        summary: summary.summary,
        takeaways: summary.takeaways,
        episodeTitle: episode.title,
      });
      
      setSummaries(prev => ({ ...prev, [episodeId]: summary }));
      console.log("Generated and saved summary:", summary);
    } catch (error) {
      console.error("Failed to generate summary:", error);
      alert("Failed to generate summary. Please try again.");
    } finally {
      setGeneratingSummary(prev => ({ ...prev, [episodeId]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Summary</h1>
          <p className="text-gray-600 mb-8">Search for a podcast and select an episode to generate an AI summary</p>
          
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
                          <button 
                            onClick={() => handleGenerateSummary(episode)}
                            disabled={generatingSummary[episode.id]}
                            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {generatingSummary[episode.id] ? "Generating..." : 
                             summaries[episode.id] ? "Summary Generated" : "Generate Summary"}
                          </button>
                        </div>
                      </div>

                      {/* Audio Player */}
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center gap-4">
                          {/* Play/Pause Button */}
                          <button 
                            onClick={() => handlePlayPause(episode.id, episode.audio)}
                            className="flex items-center justify-center w-12 h-12 bg-green-600 text-white rounded-full hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all"
                            title={isPlaying[episode.id] ? "Pause episode" : "Play episode"}
                          >
                            {isPlaying[episode.id] ? (
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            )}
                          </button>

                          {/* Skip Back Button */}
                          <button 
                            onClick={() => handleSkip(episode.id, -15)}
                            className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                            title="Skip back 15 seconds"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                              <text x="12" y="16" fontSize="8" textAnchor="middle" fill="white">15</text>
                            </svg>
                          </button>

                          {/* Progress Bar and Time */}
                          <div className="flex-1 flex items-center gap-3">
                            <span className="text-sm text-gray-600 min-w-[3rem]">
                              {formatTime(currentTime[episode.id] || 0)}
                            </span>
                            <div className="flex-1 relative">
                              <input
                                type="range"
                                min="0"
                                max={duration[episode.id] || episode.audio_length_sec || 100}
                                value={currentTime[episode.id] || 0}
                                onChange={(e) => handleSeek(episode.id, parseFloat(e.target.value))}
                                className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer slider"
                                style={{
                                  background: `linear-gradient(to right, #10b981 0%, #10b981 ${((currentTime[episode.id] || 0) / (duration[episode.id] || episode.audio_length_sec || 100)) * 100}%, #d1d5db ${((currentTime[episode.id] || 0) / (duration[episode.id] || episode.audio_length_sec || 100)) * 100}%, #d1d5db 100%)`
                                }}
                              />
                            </div>
                            <span className="text-sm text-gray-600 min-w-[3rem]">
                              {formatTime(duration[episode.id] || episode.audio_length_sec || 0)}
                            </span>
                          </div>

                          {/* Skip Forward Button */}
                          <button 
                            onClick={() => handleSkip(episode.id, 30)}
                            className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                            title="Skip forward 30 seconds"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
                              <text x="12" y="16" fontSize="8" textAnchor="middle" fill="white">30</text>
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Summary Display */}
                      {summaries[episode.id] && (
                        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                          <h4 className="text-lg font-semibold text-blue-900 mb-4">AI Generated Summary</h4>
                          
                          <div className="space-y-4">
                            <div>
                              <h5 className="font-medium text-blue-800 mb-2">Summary:</h5>
                              <p className="text-blue-700 leading-relaxed">
                                {summaries[episode.id].summary}
                              </p>
                            </div>
                            
                            {summaries[episode.id].takeaways && summaries[episode.id].takeaways.length > 0 && (
                              <div>
                                <h5 className="font-medium text-blue-800 mb-2">Key Takeaways:</h5>
                                <ul className="space-y-1">
                                  {summaries[episode.id].takeaways.map((takeaway: string, index: number) => (
                                    <li key={index} className="flex items-start gap-2 text-blue-700">
                                      <span className="text-blue-500 mt-1">•</span>
                                      <span>{takeaway}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
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