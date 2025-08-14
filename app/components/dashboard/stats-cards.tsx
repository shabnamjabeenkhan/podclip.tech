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

  if (!userQuota || !listeningStats) {
    return (
      <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  const stats = [
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
    {
      title: "Episodes Listened",
      value: listeningStats.totalEpisodes.toString(),
      subtitle: `${listeningStats.completedEpisodes} completed`,
      color: "green",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.01M15 10h1.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: "Listening Time",
      value: listeningStats.totalListenedFormatted,
      subtitle: "Total time",
      color: "purple",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.title} className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg flex-shrink-0 ${getColorClasses(stat.color)}`}>
              {stat.icon}
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{stat.title}</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 truncate">{stat.subtitle}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}