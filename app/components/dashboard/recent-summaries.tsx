import { useQuery } from "convex/react";
import { useAuth } from "@clerk/react-router";
import { api } from "../../../convex/_generated/api";
import { useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import { useState, useCallback } from "react";

export function RecentSummaries() {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
  const [createSummaryLoading, setCreateSummaryLoading] = useState(false);
  const [viewAllLoading, setViewAllLoading] = useState(false);

  const handleCreateSummaryClick = useCallback(() => {
    setCreateSummaryLoading(true);
    navigate("/dashboard/new-summary");
  }, [navigate]);

  const handleViewAllClick = useCallback(() => {
    setViewAllLoading(true);
    navigate("/dashboard/all-summaries");
  }, [navigate]);
  
  const userQuota = useQuery(
    api.users.getUserQuota,
    isSignedIn ? {} : "skip"
  );
  const userSummaries = useQuery(
    api.summaries.getUserSummaries, 
    isSignedIn && userQuota?.userId ? { userId: userQuota.userId } : "skip"
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
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Recent Summaries</h3>
        <div className="text-center py-6 sm:py-8">
          <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h4 className="mt-2 text-sm font-medium text-gray-900">No summaries yet</h4>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">Generate your first AI summary</p>
          <div className="mt-4 sm:mt-6">
            <Button
              loading={createSummaryLoading}
              onClick={handleCreateSummaryClick}
              className="inline-flex items-center px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium"
            >
              Create Summary
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Recent Summaries</h3>
        <Button
          variant="link"
          loading={viewAllLoading}
          onClick={handleViewAllClick}
          className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap p-0 h-auto"
        >
          View all
        </Button>
      </div>
      <div className="space-y-3 sm:space-y-4">
        {recentSummaries.map((summary, index) => (
          <div key={summary._id || index} className="p-3 sm:p-4 border border-gray-100 rounded-lg hover:shadow-sm transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2 mb-2">
              <h4 className="text-sm font-medium text-gray-900 line-clamp-2 pr-0 sm:pr-2">
                {summary.episode_title || `Episode Summary #${index + 1}`}
              </h4>
              <span className="text-xs text-gray-500 flex-shrink-0 self-start">
                {new Date(summary.created_at).toLocaleDateString()}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 sm:line-clamp-3 mb-2 sm:mb-3">
              {(summary.content || '').substring(0, 120)}...
            </p>
            {summary.takeaways && summary.takeaways.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="text-xs text-gray-500 flex-shrink-0">Key takeaways:</span>
                <div className="flex flex-wrap gap-1">
                  {summary.takeaways.slice(0, 2).map((takeaway: string, i: number) => (
                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {takeaway.length > 15 ? `${takeaway.substring(0, 15)}...` : takeaway}
                    </span>
                  ))}
                  {summary.takeaways.length > 2 && (
                    <span className="text-xs text-gray-500 self-center">+{summary.takeaways.length - 2} more</span>
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