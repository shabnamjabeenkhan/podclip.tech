import React from 'react';
import { AudioProvider } from './audio-context';
import { PreferencesProvider } from './preferences-context';

// Combined provider component
export function AppContextProvider({ children }: { children: React.ReactNode }) {
  return (
    <PreferencesProvider>
      <AudioProvider>
        {children}
      </AudioProvider>
    </PreferencesProvider>
  );
}

// Re-export hooks for convenience
export { useAudio } from './audio-context';
export { usePreferences } from './preferences-context';
export type { Episode } from './audio-context';
export type { UserPreferences } from './preferences-context';