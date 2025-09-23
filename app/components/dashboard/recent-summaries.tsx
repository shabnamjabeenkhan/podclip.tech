import { useQuery } from "convex/react";
import { useAuth } from "@clerk/react-router";
import { api } from "../../../convex/_generated/api";
import { useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import { useCallback } from "react";

export function RecentSummaries() {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();

  const handleCreateSummaryClick = useCallback(() => {
    navigate("/dashboard/new-summary");
  }, [navigate]);

  const handleViewAllClick = useCallback(() => {
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
      <div className="bg-[#26282B] rounded-lg border border-gray-600 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Summaries</h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-600 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-600 rounded w-full mb-1"></div>
              <div className="h-3 bg-gray-600 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const recentSummaries = userSummaries.slice(0, 3); // Show only 3 most recent

  if (recentSummaries.length === 0) {
    return (
      <div className="bg-[#26282B] rounded-lg border border-gray-600 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Recent Summaries</h3>
        <div className="text-center py-6 sm:py-8">
          <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h4 className="mt-2 text-sm font-medium text-white">No summaries yet</h4>
          <p className="mt-1 text-xs sm:text-sm text-gray-300">Generate your first AI summary</p>
          <div className="mt-4 sm:mt-6">
            <Button
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
    <div className="bg-[#26282B] rounded-lg border border-gray-600 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-white">Recent Summaries</h3>
        <Button
          variant="link"
          onClick={handleViewAllClick}
          className="text-xs sm:text-sm text-white hover:text-gray-200 font-medium whitespace-nowrap p-0 h-auto"
        >
          View all
        </Button>
      </div>
      <ul className="mt-4 divide-y divide-gray-600">
        {recentSummaries.map((summary, index) => (
          <li key={summary._id || index} className="py-5 flex items-start justify-between">
            <div className="flex gap-3 flex-1">
              <div className="flex-none w-12 h-12 rounded-lg bg-[hsl(158,62%,50%)]/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-[hsl(158,62%,50%)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-semibold text-white line-clamp-2 pr-2">
                    {summary.episode_title || `Episode Summary #${index + 1}`}
                  </h4>
                  <span className="text-xs text-gray-300 flex-shrink-0">
                    {new Date(summary.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-300 line-clamp-2 mb-3">
                  {(summary.content || '').substring(0, 120)}...
                </p>
                {summary.takeaways && summary.takeaways.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {summary.takeaways.slice(0, 2).map((takeaway: any, i: number) => {
                      // Handle both old string format and new timestamp format
                      const rawText = typeof takeaway === 'object' ? takeaway.text : takeaway;
                      // Ensure text is always a string to prevent React rendering errors
                      const text = typeof rawText === 'string' ? rawText :
                                 typeof rawText === 'object' ? JSON.stringify(rawText) :
                                 String(rawText || '');
                      return (
                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[hsl(158,62%,50%)]/20 text-[hsl(158,62%,50%)]">
                          {text.length > 15 ? `${text.substring(0, 15)}...` : text}
                        </span>
                      );
                    })}
                    {summary.takeaways.length > 2 && (
                      <span className="text-xs text-gray-400">+{summary.takeaways.length - 2} more</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}