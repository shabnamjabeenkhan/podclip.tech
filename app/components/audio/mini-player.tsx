import React from 'react';
import { useAudio, usePreferences } from '~/contexts/app-context';

export function MiniPlayer() {
  const { state, togglePlayPause, skipForward, skipBackward, clearEpisode } = useAudio();
  const { preferences } = usePreferences();

  // Don't show mini player if no episode is loaded or user has disabled it
  if (!state.currentEpisode || !state.showMiniPlayer || !preferences.showMiniPlayer) {
    return null;
  }

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-sm border-t border-white/10 z-50">
      {/* Progress bar at the very top */}
      <div className="h-1 bg-gray-700 relative">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0}%` }}
        />
      </div>

      {/* Main player content */}
      <div className="px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Left section - Track info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Album Art */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-gradient-to-br from-pink-400 to-orange-400 flex-shrink-0 overflow-hidden">
              {state.currentEpisode.thumbnail ? (
                <img
                  src={state.currentEpisode.thumbnail}
                  alt={state.currentEpisode.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-pink-400 to-orange-400" />
              )}
            </div>

            {/* Track Details */}
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-sm sm:text-base leading-tight truncate">
                {state.currentEpisode.title}
              </h3>
              <p className="text-gray-300 text-xs sm:text-sm truncate">
                {state.currentEpisode.podcastTitle}
              </p>
            </div>
          </div>

          {/* Center section - Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Skip backward */}
            <button
              onClick={() => skipBackward(preferences.skipBackwardSeconds)}
              className="p-2 text-white/80 hover:text-white transition-colors touch-manipulation hidden sm:block"
              title={`Skip back ${preferences.skipBackwardSeconds}s`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlayPause}
              disabled={state.isLoading}
              className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-white text-black rounded-full hover:bg-gray-100 transition-all touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              title={state.isPlaying ? "Pause" : "Play"}
            >
              {state.isLoading ? (
                <svg className="animate-spin w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m12 2 1 9-1 9a10 10 0 0 1 0-18Z"></path>
                </svg>
              ) : state.isPlaying ? (
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
              ) : (
                <svg className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>

            {/* Skip forward */}
            <button
              onClick={() => skipForward(preferences.skipForwardSeconds)}
              className="p-2 text-white/80 hover:text-white transition-colors touch-manipulation hidden sm:block"
              title={`Skip forward ${preferences.skipForwardSeconds}s`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
              </svg>
            </button>
          </div>

          {/* Right section - Time and close */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Time display */}
            <div className="text-gray-300 text-xs sm:text-sm font-mono hidden sm:block">
              <span>{formatTime(state.currentTime)}</span>
              <span className="mx-1">/</span>
              <span>{formatTime(state.duration)}</span>
            </div>

            {/* Close button */}
            <button
              onClick={clearEpisode}
              className="p-2 text-white/60 hover:text-white transition-colors touch-manipulation"
              title="Close player"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}