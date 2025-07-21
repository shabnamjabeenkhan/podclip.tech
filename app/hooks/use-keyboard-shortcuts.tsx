import { useEffect } from 'react';
import { useAudio, usePreferences } from '~/contexts/app-context';

export function useKeyboardShortcuts() {
  const { state, togglePlayPause, skipForward, skipBackward, setVolume, setPlaybackRate } = useAudio();
  const { preferences } = usePreferences();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when user is typing in input fields
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Don't trigger if no episode is loaded
      if (!state.currentEpisode) {
        return;
      }

      const { key, metaKey, ctrlKey, shiftKey } = event;
      
      switch (key.toLowerCase()) {
        case ' ':
        case 'k':
          // Spacebar or K - Play/Pause
          event.preventDefault();
          togglePlayPause();
          break;

        case 'arrowleft':
        case 'j':
          // Left arrow or J - Skip backward
          event.preventDefault();
          if (shiftKey) {
            skipBackward(5); // 5 seconds with shift
          } else {
            skipBackward(preferences.skipBackwardSeconds);
          }
          break;

        case 'arrowright':
        case 'l':
          // Right arrow or L - Skip forward
          event.preventDefault();
          if (shiftKey) {
            skipForward(5); // 5 seconds with shift
          } else {
            skipForward(preferences.skipForwardSeconds);
          }
          break;

        case 'arrowup':
          // Up arrow - Volume up
          event.preventDefault();
          setVolume(Math.min(1, state.volume + 0.1));
          break;

        case 'arrowdown':
          // Down arrow - Volume down
          event.preventDefault();
          setVolume(Math.max(0, state.volume - 0.1));
          break;

        case 'm':
          // M - Mute/Unmute
          event.preventDefault();
          if (state.volume > 0) {
            setVolume(0);
          } else {
            setVolume(preferences.defaultVolume);
          }
          break;

        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
          // Number keys 1-5 for playback speed
          if (!metaKey && !ctrlKey) {
            event.preventDefault();
            const speeds = [0.5, 0.75, 1, 1.25, 1.5];
            const speedIndex = parseInt(key) - 1;
            if (speedIndex >= 0 && speedIndex < speeds.length) {
              setPlaybackRate(speeds[speedIndex]);
            }
          }
          break;

        case '0':
          // 0 - Reset to normal speed
          if (!metaKey && !ctrlKey) {
            event.preventDefault();
            setPlaybackRate(1);
          }
          break;

        case 'f':
          // F - Skip forward 30 seconds (fast forward)
          event.preventDefault();
          skipForward(30);
          break;

        case 'b':
          // B - Skip backward 30 seconds (rewind)
          event.preventDefault();
          skipBackward(30);
          break;

        case ',':
          // Comma - Decrease speed
          event.preventDefault();
          const newSlowerSpeed = Math.max(0.25, state.playbackRate - 0.25);
          setPlaybackRate(newSlowerSpeed);
          break;

        case '.':
          // Period - Increase speed
          event.preventDefault();
          const newFasterSpeed = Math.min(3, state.playbackRate + 0.25);
          setPlaybackRate(newFasterSpeed);
          break;

        default:
          break;
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    state.currentEpisode,
    state.volume,
    state.playbackRate,
    preferences.skipForwardSeconds,
    preferences.skipBackwardSeconds,
    preferences.defaultVolume,
    togglePlayPause,
    skipForward,
    skipBackward,
    setVolume,
    setPlaybackRate,
  ]);
}

// Keyboard shortcuts reference component
export function KeyboardShortcutsHelp() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 max-w-md">
      <h3 className="font-semibold text-gray-900 mb-3">Keyboard Shortcuts</h3>
      <div className="space-y-2 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="text-gray-600">
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">Space</kbd> or <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">K</kbd>
          </div>
          <div className="text-gray-900">Play/Pause</div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="text-gray-600">
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">←</kbd> or <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">J</kbd>
          </div>
          <div className="text-gray-900">Skip backward</div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="text-gray-600">
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">→</kbd> or <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">L</kbd>
          </div>
          <div className="text-gray-900">Skip forward</div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="text-gray-600">
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">↑</kbd> / <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">↓</kbd>
          </div>
          <div className="text-gray-900">Volume up/down</div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="text-gray-600">
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">M</kbd>
          </div>
          <div className="text-gray-900">Mute/Unmute</div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="text-gray-600">
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">1-5</kbd>
          </div>
          <div className="text-gray-900">Playback speed</div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="text-gray-600">
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">,</kbd> / <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">.</kbd>
          </div>
          <div className="text-gray-900">Speed -/+</div>
        </div>
      </div>
    </div>
  );
}