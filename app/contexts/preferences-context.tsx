import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Types
export interface UserPreferences {
  // Audio preferences
  defaultVolume: number;
  defaultPlaybackRate: number;
  
  // UI preferences
  theme: 'light' | 'dark' | 'system';
  dashboardLayout: 'grid' | 'list';
  
  // Behavior preferences
  autoPlay: boolean;
  showMiniPlayer: boolean;
  skipForwardSeconds: number;
  skipBackwardSeconds: number;
  
  // Notification preferences
  showNotifications: boolean;
  quotaWarnings: boolean;
}

type PreferencesAction =
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'SET_PLAYBACK_RATE'; payload: number }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' | 'system' }
  | { type: 'SET_DASHBOARD_LAYOUT'; payload: 'grid' | 'list' }
  | { type: 'TOGGLE_AUTO_PLAY' }
  | { type: 'TOGGLE_MINI_PLAYER' }
  | { type: 'SET_SKIP_FORWARD'; payload: number }
  | { type: 'SET_SKIP_BACKWARD'; payload: number }
  | { type: 'TOGGLE_NOTIFICATIONS' }
  | { type: 'TOGGLE_QUOTA_WARNINGS' }
  | { type: 'LOAD_PREFERENCES'; payload: Partial<UserPreferences> }
  | { type: 'RESET_TO_DEFAULTS' };

const defaultPreferences: UserPreferences = {
  defaultVolume: 1,
  defaultPlaybackRate: 1,
  theme: 'system',
  dashboardLayout: 'grid',
  autoPlay: false,
  showMiniPlayer: true,
  skipForwardSeconds: 30,
  skipBackwardSeconds: 15,
  showNotifications: true,
  quotaWarnings: true,
};

function preferencesReducer(state: UserPreferences, action: PreferencesAction): UserPreferences {
  switch (action.type) {
    case 'SET_VOLUME':
      return { ...state, defaultVolume: Math.max(0, Math.min(1, action.payload)) };
    case 'SET_PLAYBACK_RATE':
      return { ...state, defaultPlaybackRate: action.payload };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_DASHBOARD_LAYOUT':
      return { ...state, dashboardLayout: action.payload };
    case 'TOGGLE_AUTO_PLAY':
      return { ...state, autoPlay: !state.autoPlay };
    case 'TOGGLE_MINI_PLAYER':
      return { ...state, showMiniPlayer: !state.showMiniPlayer };
    case 'SET_SKIP_FORWARD':
      return { ...state, skipForwardSeconds: action.payload };
    case 'SET_SKIP_BACKWARD':
      return { ...state, skipBackwardSeconds: action.payload };
    case 'TOGGLE_NOTIFICATIONS':
      return { ...state, showNotifications: !state.showNotifications };
    case 'TOGGLE_QUOTA_WARNINGS':
      return { ...state, quotaWarnings: !state.quotaWarnings };
    case 'LOAD_PREFERENCES':
      return { ...state, ...action.payload };
    case 'RESET_TO_DEFAULTS':
      return { ...defaultPreferences };
    default:
      return state;
  }
}

// Context
const PreferencesContext = createContext<{
  preferences: UserPreferences;
  dispatch: React.Dispatch<PreferencesAction>;
  
  // Convenience methods
  updateVolume: (volume: number) => void;
  updatePlaybackRate: (rate: number) => void;
  updateTheme: (theme: 'light' | 'dark' | 'system') => void;
  updateDashboardLayout: (layout: 'grid' | 'list') => void;
  toggleAutoPlay: () => void;
  toggleMiniPlayer: () => void;
  updateSkipIntervals: (forward: number, backward: number) => void;
  toggleNotifications: () => void;
  toggleQuotaWarnings: () => void;
  resetToDefaults: () => void;
} | null>(null);

// Provider component
export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, dispatch] = useReducer(preferencesReducer, defaultPreferences);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('podclip-preferences');
      if (saved) {
        const savedPreferences = JSON.parse(saved);
        dispatch({ type: 'LOAD_PREFERENCES', payload: savedPreferences });
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  }, []);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('podclip-preferences', JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }, [preferences]);

  // Apply theme changes to document
  useEffect(() => {
    const root = document.documentElement;
    
    if (preferences.theme === 'dark') {
      root.classList.add('dark');
    } else if (preferences.theme === 'light') {
      root.classList.remove('dark');
    } else {
      // System preference
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const updateTheme = (e: MediaQueryListEvent) => {
        if (e.matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      };
      
      if (mediaQuery.matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      
      mediaQuery.addEventListener('change', updateTheme);
      return () => mediaQuery.removeEventListener('change', updateTheme);
    }
  }, [preferences.theme]);

  // Convenience methods
  const updateVolume = (volume: number) => {
    dispatch({ type: 'SET_VOLUME', payload: volume });
  };

  const updatePlaybackRate = (rate: number) => {
    dispatch({ type: 'SET_PLAYBACK_RATE', payload: rate });
  };

  const updateTheme = (theme: 'light' | 'dark' | 'system') => {
    dispatch({ type: 'SET_THEME', payload: theme });
  };

  const updateDashboardLayout = (layout: 'grid' | 'list') => {
    dispatch({ type: 'SET_DASHBOARD_LAYOUT', payload: layout });
  };

  const toggleAutoPlay = () => {
    dispatch({ type: 'TOGGLE_AUTO_PLAY' });
  };

  const toggleMiniPlayer = () => {
    dispatch({ type: 'TOGGLE_MINI_PLAYER' });
  };

  const updateSkipIntervals = (forward: number, backward: number) => {
    dispatch({ type: 'SET_SKIP_FORWARD', payload: forward });
    dispatch({ type: 'SET_SKIP_BACKWARD', payload: backward });
  };

  const toggleNotifications = () => {
    dispatch({ type: 'TOGGLE_NOTIFICATIONS' });
  };

  const toggleQuotaWarnings = () => {
    dispatch({ type: 'TOGGLE_QUOTA_WARNINGS' });
  };

  const resetToDefaults = () => {
    dispatch({ type: 'RESET_TO_DEFAULTS' });
  };

  const contextValue = {
    preferences,
    dispatch,
    updateVolume,
    updatePlaybackRate,
    updateTheme,
    updateDashboardLayout,
    toggleAutoPlay,
    toggleMiniPlayer,
    updateSkipIntervals,
    toggleNotifications,
    toggleQuotaWarnings,
    resetToDefaults,
  };

  return (
    <PreferencesContext.Provider value={contextValue}>
      {children}
    </PreferencesContext.Provider>
  );
}

// Hook to use preferences context
export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}