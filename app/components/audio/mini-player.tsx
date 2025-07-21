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
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="max-w-screen-xl mx-auto">
        {/* Progress bar */}
        <div className="h-1 bg-gray-200 relative">
          <div 
            className="h-full bg-green-600 transition-all duration-300"
            style={{ width: `${state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0}%` }}
          />
        </div>

        {/* Player content */}
        <div className="flex items-center gap-3 p-3 sm:p-4">
          {/* Episode info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {state.currentEpisode.thumbnail && (
              <img 
                src={state.currentEpisode.thumbnail} 
                alt={state.currentEpisode.title}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded object-cover flex-shrink-0"
              />
            )}
            <div className="min-w-0 flex-1">
              <h4 className="font-medium text-gray-900 text-sm truncate">
                {state.currentEpisode.title}
              </h4>
              <p className="text-xs text-gray-500 truncate">
                {state.currentEpisode.podcastTitle}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                <span>{formatTime(state.currentTime)}</span>
                <span>/</span>
                <span>{formatTime(state.duration)}</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Skip backward */}
            <button
              onClick={() => skipBackward(preferences.skipBackwardSeconds)}
              className="p-2 text-gray-600 hover:text-gray-800 transition-colors touch-manipulation"
              title={`Skip back ${preferences.skipBackwardSeconds}s`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                <text x="12" y="16" fontSize="6" textAnchor="middle" fill="white">{preferences.skipBackwardSeconds}</text>
              </svg>
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlayPause}
              disabled={state.isLoading}
              className="flex items-center justify-center w-10 h-10 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors touch-manipulation disabled:opacity-50"
              title={state.isPlaying ? "Pause" : "Play"}
            >
              {state.isLoading ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m12 2 1 9-1 9a10 10 0 0 1 0-18Z"></path>
                </svg>
              ) : state.isPlaying ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
              ) : (
                <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>

            {/* Skip forward */}
            <button
              onClick={() => skipForward(preferences.skipForwardSeconds)}
              className="p-2 text-gray-600 hover:text-gray-800 transition-colors touch-manipulation"
              title={`Skip forward ${preferences.skipForwardSeconds}s`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
                <text x="12" y="16" fontSize="6" textAnchor="middle" fill="white">{preferences.skipForwardSeconds}</text>
              </svg>
            </button>

            {/* Close button */}
            <button
              onClick={clearEpisode}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors touch-manipulation ml-1"
              title="Close player"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}