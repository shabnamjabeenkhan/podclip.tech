import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function AllSummaries() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const userQuota = useQuery(api.users.getUserQuota);
  const userSummaries = useQuery(api.summaries.getUserSummaries, 
    userQuota?.userId ? { userId: userQuota.userId } : "skip"
  );

  // Filter and sort summaries based on search and sort criteria
  const filteredAndSortedSummaries = useMemo(() => {
    if (!userSummaries) return [];

    let filtered = userSummaries;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = userSummaries.filter(summary => {
        const title = (summary.episode_title || '').toLowerCase();
        const content = (summary.content || '').toLowerCase();
        // Handle both old string format and new object format for takeaways
        const takeaways = (summary.takeaways || [])
          .map((takeaway: any) => typeof takeaway === 'object' ? takeaway.text : takeaway)
          .join(' ')
          .toLowerCase();
        
        return title.includes(query) || 
               content.includes(query) || 
               takeaways.includes(query);
      });
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "newest") {
        return b.created_at - a.created_at;
      } else {
        return a.created_at - b.created_at;
      }
    });

    return sorted;
  }, [userSummaries, searchQuery, sortBy]);

  const handleCopy = async (text: string, summaryId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(summaryId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">All Summaries</h1>
              <p className="text-gray-600">View all your generated podcast summaries</p>
            </div>
            {userQuota && (
              <div className="text-right">
                <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                  !userQuota.summaries?.canGenerate 
                    ? 'bg-red-100 text-red-800' 
                    : userQuota.summaries?.remaining !== -1 && (userQuota.summaries?.remaining || 0) <= 2
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                }`}>
                  {userQuota.summaries?.limit === -1 
                    ? "Unlimited" 
                    : `${userQuota.summaries?.used || 0}/${userQuota.summaries?.limit || 0} used`}
                </div>
                {userQuota.summaries?.remaining !== -1 && (userQuota.summaries?.remaining || 0) > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {userQuota.summaries?.remaining} remaining{userQuota.plan === 'monthly' ? ' this month' : ''}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search summaries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "newest" | "oldest")}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>
          </div>

          {/* Results Summary */}
          {searchQuery && (
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                {filteredAndSortedSummaries.length} result{filteredAndSortedSummaries.length !== 1 ? 's' : ''} 
                {searchQuery && ` for "${searchQuery}"`}
              </p>
            </div>
          )}
          
          {/* Loading State */}
          {userSummaries === undefined && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading summaries...</span>
            </div>
          )}

          {/* Empty State */}
          {userSummaries && userSummaries.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No summaries yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Generate your first summary from the New Summary page.
              </p>
              <div className="mt-6">
                <a
                  href="/dashboard/new-summary"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Create New Summary
                </a>
              </div>
            </div>
          )}

          {/* No Results for Search */}
          {userSummaries && userSummaries.length > 0 && filteredAndSortedSummaries.length === 0 && searchQuery && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No results found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search terms or clear the search to see all summaries.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setSearchQuery("")}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Clear Search
                </button>
              </div>
            </div>
          )}

          {/* Summaries List */}
          {userSummaries && userSummaries.length > 0 && filteredAndSortedSummaries.length > 0 && (
            <div className="space-y-6">
              {filteredAndSortedSummaries.map((summary: any, index: number) => (
                <div key={summary._id || index} className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-blue-900">
                        {summary.episode_title || `Episode Summary #${index + 1}`}
                      </h3>
                      <p className="text-sm text-blue-600 mt-1">
                        Generated on {new Date(summary.created_at || Date.now()).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopy(summary.content, summary._id)}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Copy summary"
                      >
                        {copiedId === summary._id ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Completed
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-blue-800 mb-2">Summary:</h4>
                      <p className="text-blue-700 leading-relaxed">
                        {summary.content}
                      </p>
                    </div>
                    
                    {summary.takeaways && summary.takeaways.length > 0 && (
                      <div>
                        <h4 className="font-medium text-blue-800 mb-2">Key Takeaways:</h4>
                        <ul className="space-y-1">
                          {summary.takeaways.map((takeaway: any, idx: number) => {
                            // Handle both old string format and new object format
                            const text = typeof takeaway === 'object' ? takeaway.text : takeaway;
                            
                            // Check if this is a placeholder and replace it with meaningful content
                            const isPlaceholder = text && text.match(/^\[Takeaway \d+\]$/);
                            const displayText = isPlaceholder 
                              ? `Key insight from ${summary.episode_title || 'this episode'}`
                              : text;
                            
                            return (
                              <li key={idx} className="flex items-start gap-2 text-blue-700">
                                <span className="text-blue-500 mt-1">•</span>
                                <span>{displayText}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}