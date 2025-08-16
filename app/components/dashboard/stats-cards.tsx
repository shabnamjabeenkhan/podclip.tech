import { useQuery } from "convex/react";
import { useAuth } from "@clerk/react-router";
import { api } from "../../../convex/_generated/api";

export function StatsCards() {
  const { isSignedIn } = useAuth();
  
  const userQuota = useQuery(
    api.users.getUserQuota,
    isSignedIn ? {} : "skip"
  );
  const listeningStats = useQuery(
    api.listening.getListeningStats,
    isSignedIn ? {} : "skip"
  );

  // Helper function to format time saved
  const formatTimeSaved = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h ${remainingMinutes}m`;
  };

  if (!userQuota || !listeningStats) {
    return (
      <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`p-4 sm:p-6 rounded-lg border animate-pulse ${i === 1 ? 'bg-gradient-to-br from-green-50 to-emerald-100 border-green-200' : 'bg-white border-gray-200'}`}>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  const stats = [
    // Highlighted Time Saved card (first position)
    {
      title: "Time Saved",
      value: formatTimeSaved(userQuota.timeSavedMinutes),
      subtitle: userQuota.timeSavedMinutes > 0 ? `${userQuota.summaries.used} summaries generated` : "Generate summaries to save time",
      color: "time-saved",
      highlighted: true,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      title: "Summaries Generated",
      value: userQuota.summaries.used.toString(),
      subtitle: userQuota.summaries.limit === -1 ? "Unlimited plan" : `${userQuota.summaries.remaining} remaining`,
      color: "blue",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      title: "Searches Performed",
      value: userQuota.searches.used.toString(),
      subtitle: userQuota.searches.limit === -1 ? "Unlimited plan" : `${userQuota.searches.remaining} remaining`,
      color: "indigo",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: "text-blue-600 bg-blue-50",
      indigo: "text-indigo-600 bg-indigo-50",
      green: "text-green-600 bg-green-50",
      purple: "text-purple-600 bg-purple-50",
      "time-saved": "text-green-700 bg-green-100",
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => (
        <div 
          key={stat.title} 
          className={`p-4 sm:p-6 rounded-lg border transition-all duration-300 ${
            stat.highlighted 
              ? 'bg-gradient-to-br from-green-50 to-emerald-100 border-green-200 shadow-lg hover:shadow-xl hover:scale-[1.02] ring-2 ring-green-200/50' 
              : 'bg-white border-gray-200 hover:shadow-md'
          }`}
        >
          <div className="flex items-center">
            <div className={`p-2 rounded-lg flex-shrink-0 ${getColorClasses(stat.color)} ${stat.highlighted ? 'shadow-md' : ''}`}>
              {stat.icon}
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <p className={`text-xs sm:text-sm font-medium truncate ${stat.highlighted ? 'text-green-800' : 'text-gray-600'}`}>
                {stat.title}
              </p>
              <p className={`text-xl sm:text-2xl font-bold ${stat.highlighted ? 'text-green-900' : 'text-gray-900'}`}>
                {stat.value}
              </p>
              <p className={`text-xs truncate ${stat.highlighted ? 'text-green-700' : 'text-gray-500'}`}>
                {stat.subtitle}
              </p>
            </div>
          </div>
          {stat.highlighted && (
            <div className="mt-3 pt-3 border-t border-green-200">
              <p className="text-xs text-green-600 font-medium">
                ⚡ Keep generating summaries to save more time!
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}