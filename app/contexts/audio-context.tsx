import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';

// Types
export interface Episode {
  id: string;
  title: string;
  audio: string;
  duration: number;
  podcastTitle: string;
  podcastId: string;
  thumbnail?: string;
}

export interface AudioState {
  // Current episode
  currentEpisode: Episode | null;
  
  // Playback state
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  
  // Loading and error states
  isLoading: boolean;
  error: string | null;
  
  // Mini player state
  showMiniPlayer: boolean;
  
  // Queue (for future enhancement)
  playlist: Episode[];
  currentIndex: number;
}

type AudioAction =
  | { type: 'LOAD_EPISODE'; payload: Episode }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'SET_CURRENT_TIME'; payload: number }
  | { type: 'SET_DURATION'; payload: number }
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'SET_PLAYBACK_RATE'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'TOGGLE_MINI_PLAYER'; payload?: boolean }
  | { type: 'SEEK'; payload: number }
  | { type: 'SKIP'; payload: number }
  | { type: 'CLEAR_EPISODE' };

const initialState: AudioState = {
  currentEpisode: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  playbackRate: 1,
  isLoading: false,
  error: null,
  showMiniPlayer: false,
  playlist: [],
  currentIndex: -1,
};

function audioReducer(state: AudioState, action: AudioAction): AudioState {
  switch (action.type) {
    case 'LOAD_EPISODE':
      return {
        ...state,
        currentEpisode: action.payload,
        isLoading: true,
        error: null,
        currentTime: 0,
        showMiniPlayer: true,
      };
    case 'PLAY':
      return { ...state, isPlaying: true, isLoading: false };
    case 'PAUSE':
      return { ...state, isPlaying: false };
    case 'SET_CURRENT_TIME':
      return { ...state, currentTime: action.payload };
    case 'SET_DURATION':
      return { ...state, duration: action.payload, isLoading: false };
    case 'SET_VOLUME':
      return { ...state, volume: Math.max(0, Math.min(1, action.payload)) };
    case 'SET_PLAYBACK_RATE':
      return { ...state, playbackRate: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'TOGGLE_MINI_PLAYER':
      return { 
        ...state, 
        showMiniPlayer: action.payload !== undefined ? action.payload : !state.showMiniPlayer 
      };
    case 'SEEK':
      return { ...state, currentTime: action.payload };
    case 'SKIP':
      const newTime = Math.max(0, Math.min(state.duration, state.currentTime + action.payload));
      return { ...state, currentTime: newTime };
    case 'CLEAR_EPISODE':
      return {
        ...initialState,
        volume: state.volume,
        playbackRate: state.playbackRate,
      };
    default:
      return state;
  }
}

// Context
const AudioContext = createContext<{
  state: AudioState;
  dispatch: React.Dispatch<AudioAction>;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  
  // Convenience methods
  playEpisode: (episode: Episode) => void;
  togglePlayPause: () => void;
  seekTo: (time: number) => void;
  skipForward: (seconds: number) => void;
  skipBackward: (seconds: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  clearEpisode: () => void;
} | null>(null);

// Provider component
export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(audioReducer, initialState);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Convenience methods
  const playEpisode = (episode: Episode) => {
    dispatch({ type: 'LOAD_EPISODE', payload: episode });
  };

  const togglePlayPause = () => {
    if (state.isPlaying) {
      dispatch({ type: 'PAUSE' });
    } else {
      dispatch({ type: 'PLAY' });
    }
  };

  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      dispatch({ type: 'SEEK', payload: time });
    }
  };

  const skipForward = (seconds: number = 30) => {
    const newTime = Math.min(state.duration, state.currentTime + seconds);
    seekTo(newTime);
  };

  const skipBackward = (seconds: number = 15) => {
    const newTime = Math.max(0, state.currentTime - seconds);
    seekTo(newTime);
  };

  const setVolume = (volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, volume));
      dispatch({ type: 'SET_VOLUME', payload: volume });
    }
  };

  const setPlaybackRate = (rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
      dispatch({ type: 'SET_PLAYBACK_RATE', payload: rate });
    }
  };

  const clearEpisode = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    dispatch({ type: 'CLEAR_EPISODE' });
  };

  // Audio element event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      dispatch({ type: 'SET_DURATION', payload: audio.duration });
      // Apply stored settings
      audio.volume = state.volume;
      audio.playbackRate = state.playbackRate;
    };

    const handleTimeUpdate = () => {
      dispatch({ type: 'SET_CURRENT_TIME', payload: audio.currentTime });
    };

    const handlePlay = () => {
      dispatch({ type: 'PLAY' });
    };

    const handlePause = () => {
      dispatch({ type: 'PAUSE' });
    };

    const handleEnded = () => {
      dispatch({ type: 'PAUSE' });
      dispatch({ type: 'SET_CURRENT_TIME', payload: 0 });
    };

    const handleError = () => {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load audio' });
    };

    const handleLoadStart = () => {
      dispatch({ type: 'SET_LOADING', payload: true });
    };

    const handleCanPlay = () => {
      dispatch({ type: 'SET_LOADING', payload: false });
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [state.volume, state.playbackRate]);

  // Control audio element based on state changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !state.currentEpisode) return;

    // Load new episode
    if (audio.src !== state.currentEpisode.audio) {
      audio.src = state.currentEpisode.audio;
      audio.load();
    }
  }, [state.currentEpisode]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (state.isPlaying) {
      audio.play().catch((error) => {
        console.error('Failed to play audio:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to play audio' });
      });
    } else {
      audio.pause();
    }
  }, [state.isPlaying]);

  const contextValue = {
    state,
    dispatch,
    audioRef,
    playEpisode,
    togglePlayPause,
    seekTo,
    skipForward,
    skipBackward,
    setVolume,
    setPlaybackRate,
    clearEpisode,
  };

  return (
    <AudioContext.Provider value={contextValue}>
      {children}
      {/* Global audio element */}
      <audio ref={audioRef} preload="metadata" />
    </AudioContext.Provider>
  );
}

// Hook to use audio context
export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}