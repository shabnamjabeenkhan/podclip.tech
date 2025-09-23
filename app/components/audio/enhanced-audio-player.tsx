import React, { useState, useRef } from 'react';
import { useAudio, usePreferences, type Episode } from '~/contexts/app-context';

interface EnhancedAudioPlayerProps {
  episode: Episode;
  className?: string;
}

export function EnhancedAudioPlayer({ episode, className = '' }: EnhancedAudioPlayerProps) {
  const { state, togglePlayPause, seekTo, skipForward, skipBackward, setVolume, setPlaybackRate, playEpisode } = useAudio();
  const { preferences } = usePreferences();
  
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  
  const volumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const speedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isCurrentEpisode = state.currentEpisode?.id === episode.id;
  const isPlaying = isCurrentEpisode && state.isPlaying;
  const currentTime = isCurrentEpisode ? state.currentTime : 0;
  const duration = isCurrentEpisode ? state.duration : episode.duration;

  const handlePlayPause = () => {
    if (isCurrentEpisode) {
      togglePlayPause();
    } else {
      playEpisode(episode);
    }
  };

  const handleSeek = (time: number) => {
    if (isCurrentEpisode) {
      seekTo(time);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    setShowSpeedMenu(false);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const showVolumeControls = () => {
    setShowVolumeSlider(true);
    if (volumeTimeoutRef.current) {
      clearTimeout(volumeTimeoutRef.current);
    }
    volumeTimeoutRef.current = setTimeout(() => {
      setShowVolumeSlider(false);
    }, 3000);
  };

  const showSpeedControls = () => {
    setShowSpeedMenu(true);
    if (speedTimeoutRef.current) {
      clearTimeout(speedTimeoutRef.current);
    }
    speedTimeoutRef.current = setTimeout(() => {
      setShowSpeedMenu(false);
    }, 3000);
  };

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];

  return (
    <div className={`bg-black/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/10 ${className}`}>
      <div className="p-3 sm:p-4">
        {/* Track Info Section */}
        <div className="flex items-center gap-3 mb-3">
          {/* Album Art */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gradient-to-br from-pink-400 to-orange-400 flex-shrink-0 overflow-hidden">
            {episode.thumbnail ? (
              <img
                src={episode.thumbnail}
                alt={episode.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-pink-400 to-orange-400" />
            )}
          </div>

          {/* Track Details */}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-lg sm:text-xl leading-tight truncate">
              {episode.title}
            </h3>
            <p className="text-gray-300 text-sm sm:text-base mt-1 truncate">
              {episode.podcastTitle}
            </p>
          </div>
        </div>

        {/* Time Display */}
        <div className="flex items-center justify-between text-gray-300 text-sm mb-2 font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="relative h-1 bg-gray-600 rounded-full cursor-pointer">
            <div
              className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all duration-150"
              style={{ width: `${((currentTime) / (duration || 100)) * 100}%` }}
            />
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              disabled={!isCurrentEpisode}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer touch-manipulation disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          {/* Left Controls */}
          <div className="flex items-center gap-3">
            {/* Skip Back Button */}
            <button
              onClick={() => skipBackward(preferences.skipBackwardSeconds)}
              disabled={!isCurrentEpisode}
              className="p-2 text-white/80 hover:text-white transition-colors touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
              title={`Skip back ${preferences.skipBackwardSeconds} seconds`}
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
            </button>

            {/* Play/Pause Button */}
            <button
              onClick={handlePlayPause}
              disabled={state.isLoading}
              className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-white text-black rounded-full hover:bg-gray-100 transition-all touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              title={isPlaying ? "Pause episode" : "Play episode"}
            >
              {state.isLoading && isCurrentEpisode ? (
                <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m12 2 1 9-1 9a10 10 0 0 1 0-18Z"></path>
                </svg>
              ) : isPlaying ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
              ) : (
                <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>

            {/* Skip Forward Button */}
            <button
              onClick={() => skipForward(preferences.skipForwardSeconds)}
              disabled={!isCurrentEpisode}
              className="p-2 text-white/80 hover:text-white transition-colors touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
              title={`Skip forward ${preferences.skipForwardSeconds} seconds`}
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
              </svg>
            </button>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Volume Control */}
            <div className="relative">
              <button
                onClick={showVolumeControls}
                className="p-2 text-white/80 hover:text-white transition-colors touch-manipulation"
                title={`Volume: ${Math.round(state.volume * 100)}%`}
              >
                {state.volume === 0 ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : state.volume < 0.5 ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
              </button>

              {showVolumeSlider && (
                <div className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-sm rounded-lg shadow-xl border border-white/20 p-3 z-10">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={state.volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="w-20 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-sm text-gray-300 w-8">{Math.round(state.volume * 100)}%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Speed Control */}
            <div className="relative">
              <button
                onClick={showSpeedControls}
                className="flex items-center justify-center w-8 h-8 text-white/80 hover:text-white transition-colors touch-manipulation font-medium text-sm bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm"
                title={`Playback speed: ${state.playbackRate}x`}
              >
                {state.playbackRate}x
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-sm rounded-lg shadow-xl border border-white/20 py-2 z-10 min-w-[80px]">
                  {speedOptions.map((speed) => (
                    <button
                      key={speed}
                      onClick={() => handleSpeedChange(speed)}
                      className={`block w-full px-3 py-2 text-sm text-left hover:bg-white/10 transition-colors ${
                        state.playbackRate === speed ? 'bg-blue-500/20 text-blue-400 font-medium' : 'text-gray-300'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {state.error && isCurrentEpisode && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-red-800 mb-1">
                  🎵 Audio Unavailable
                </h4>
                <p className="text-sm text-red-700 mb-3">
                  {state.error}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => window.location.reload()}
                    className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}