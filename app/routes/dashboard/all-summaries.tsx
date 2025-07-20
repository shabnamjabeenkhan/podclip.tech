import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function AllSummaries() {
  // TODO: Get actual user ID from auth
  const userSummaries = useQuery(api.summaries.getUserSummaries, { 
    userId: "temp-user-id" 
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">All Summaries</h1>
          <p className="text-gray-600 mb-8">View all your generated podcast summaries</p>
          
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

          {/* Summaries List */}
          {userSummaries && userSummaries.length > 0 && (
            <div className="space-y-6">
              {userSummaries.map((summary: any, index: number) => (
                <div key={summary._id || index} className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-blue-900">
                        Episode Summary #{index + 1}
                      </h3>
                      <p className="text-sm text-blue-600 mt-1">
                        Generated on {new Date(summary.created_at || Date.now()).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Completed
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-blue-800 mb-2">Summary:</h4>
                      <p className="text-blue-700 leading-relaxed">
                        {summary.content || summary.summary}
                      </p>
                    </div>
                    
                    {summary.takeaways && summary.takeaways.length > 0 && (
                      <div>
                        <h4 className="font-medium text-blue-800 mb-2">Key Takeaways:</h4>
                        <ul className="space-y-1">
                          {summary.takeaways.map((takeaway: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2 text-blue-700">
                              <span className="text-blue-500 mt-1">•</span>
                              <span>{takeaway}</span>
                            </li>
                          ))}
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