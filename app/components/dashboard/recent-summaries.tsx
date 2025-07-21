import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Link } from "react-router";

export function RecentSummaries() {
  const userQuota = useQuery(api.users.getUserQuota);
  const userSummaries = useQuery(
    api.summaries.getUserSummaries, 
    userQuota?.userId ? { userId: userQuota.userId } : "skip"
  );

  if (!userSummaries) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Summaries</h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const recentSummaries = userSummaries.slice(0, 3); // Show only 3 most recent

  if (recentSummaries.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Summaries</h3>
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h4 className="mt-2 text-sm font-medium text-gray-900">No summaries yet</h4>
          <p className="mt-1 text-sm text-gray-500">Generate your first AI summary</p>
          <div className="mt-6">
            <Link
              to="/dashboard/new-summary"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Create Summary
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Recent Summaries</h3>
        <Link
          to="/dashboard/all-summaries"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          View all
        </Link>
      </div>
      <div className="space-y-4">
        {recentSummaries.map((summary, index) => (
          <div key={summary._id || index} className="p-4 border border-gray-100 rounded-lg hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900 line-clamp-2">
                {summary.episode_title || `Episode Summary #${index + 1}`}
              </h4>
              <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                {new Date(summary.created_at).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">
              {(summary.content || '').substring(0, 150)}...
            </p>
            {summary.takeaways && summary.takeaways.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Key takeaways:</span>
                <div className="flex gap-1">
                  {summary.takeaways.slice(0, 2).map((takeaway: string, i: number) => (
                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {takeaway.length > 20 ? `${takeaway.substring(0, 20)}...` : takeaway}
                    </span>
                  ))}
                  {summary.takeaways.length > 2 && (
                    <span className="text-xs text-gray-500">+{summary.takeaways.length - 2} more</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}