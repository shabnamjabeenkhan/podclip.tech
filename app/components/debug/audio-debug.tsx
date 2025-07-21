import React from 'react';
import { useAudio } from '~/contexts/app-context';

export function AudioDebugInfo() {
  const { state, audioRef } = useAudio();
  const audio = audioRef.current;

  if (!state.currentEpisode) {
    return null;
  }

  return (
    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs">
      <h4 className="font-semibold text-yellow-800 mb-2">Audio Debug Info:</h4>
      <div className="space-y-1 text-yellow-700">
        <div>Audio URL: {state.currentEpisode.audio}</div>
        <div>Is Loading: {state.isLoading ? 'Yes' : 'No'}</div>
        <div>Is Playing: {state.isPlaying ? 'Yes' : 'No'}</div>
        <div>Duration: {state.duration}s</div>
        <div>Current Time: {state.currentTime}s</div>
        <div>Error: {state.error || 'None'}</div>
        {audio && (
          <>
            <div>Audio Element Ready State: {audio.readyState}</div>
            <div>Audio Element Network State: {audio.networkState}</div>
            <div>Audio Element Source: {audio.src}</div>
          </>
        )}
      </div>
    </div>
  );
}