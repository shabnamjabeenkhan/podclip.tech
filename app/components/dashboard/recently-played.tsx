import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Link } from "react-router";

export function RecentlyPlayed() {
  const recentlyPlayed = useQuery(api.listening.getRecentlyPlayed, { limit: 5 });

  if (!recentlyPlayed) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recently Played</h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (recentlyPlayed.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recently Played</h3>
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <h4 className="mt-2 text-sm font-medium text-gray-900">No episodes played yet</h4>
          <p className="mt-1 text-sm text-gray-500">Start listening to podcasts to see them here</p>
          <div className="mt-6">
            <Link
              to="/dashboard/new-summary"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Find Podcasts
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Recently Played</h3>
        <Link
          to="/dashboard/new-summary"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          <span className="hidden sm:inline">Browse more</span>
          <span className="sm:hidden">More</span>
        </Link>
      </div>
      <div className="space-y-3 sm:space-y-4">
        {recentlyPlayed.map((episode) => (
          <div key={episode._id} className="flex items-center gap-3 sm:gap-4 p-2 sm:p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="relative flex-shrink-0">
              {episode.episode_thumbnail && (
                <img 
                  src={episode.episode_thumbnail} 
                  alt={episode.episode_title}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover"
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <button className="w-6 h-6 sm:w-8 sm:h-8 bg-green-600 text-white rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity touch-manipulation">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 truncate">{episode.episode_title}</h4>
              <p className="text-xs sm:text-sm text-gray-500 truncate">{episode.podcast_title}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                <span className="hidden sm:inline">{new Date(episode.last_played_at).toLocaleDateString()}</span>
                <span className="sm:hidden">{new Date(episode.last_played_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
                {episode.completed && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <span className="hidden sm:inline">Completed</span>
                    <span className="sm:hidden">✓</span>
                  </span>
                )}
              </div>
            </div>
            <div className="flex-shrink-0">
              {!episode.completed && (
                <div className="w-6 sm:w-8 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{ 
                      width: `${Math.min(100, (episode.last_position / episode.duration) * 100)}%` 
                    }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}