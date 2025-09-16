import { useQuery } from "convex/react";
import { useAuth } from "@clerk/react-router";
import { api } from "../../convex/_generated/api";

export default function DebugQuota() {
  const { isSignedIn } = useAuth();
  
  const systemStatus = useQuery(
    api.users.getSystemStatus,
    isSignedIn ? {} : "skip"
  );

  if (!isSignedIn) {
    return <div className="p-4">Please sign in to view debug information.</div>;
  }

  if (!systemStatus) {
    return <div className="p-4">Loading debug information...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Quota Debug Information</h1>
      
      <div className="space-y-6">
        {/* User Information */}
        <div className="bg-white p-4 rounded-lg border">
          <h2 className="text-lg font-semibold mb-3">User Information</h2>
          <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
            {JSON.stringify(systemStatus.user, null, 2)}
          </pre>
        </div>

        {/* Subscription Status */}
        <div className="bg-white p-4 rounded-lg border">
          <h2 className="text-lg font-semibold mb-3">Subscription Status</h2>
          <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
            {JSON.stringify(systemStatus.subscription, null, 2)}
          </pre>
        </div>

        {/* Current Quota */}
        <div className="bg-white p-4 rounded-lg border">
          <h2 className="text-lg font-semibold mb-3">Current Quota</h2>
          <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
            {JSON.stringify(systemStatus.currentQuota, null, 2)}
          </pre>
        </div>

        {/* Debug Info */}
        <div className="bg-white p-4 rounded-lg border">
          <h2 className="text-lg font-semibold mb-3">Debug Information</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Database Summary Count:</span>
              <span className="font-mono">{systemStatus.user.summary_count}</span>
            </div>
            <div className="flex justify-between">
              <span>Actual Summaries in DB:</span>
              <span className="font-mono">{systemStatus.actualSummaryCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Count Mismatch:</span>
              <span className={`font-mono ${systemStatus.summaryMismatch ? 'text-red-600' : 'text-green-600'}`}>
                {systemStatus.summaryMismatch ? 'YES' : 'NO'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Plan:</span>
              <span className="font-mono">{systemStatus.debugInfo.planType}</span>
            </div>
            <div className="flex justify-between">
              <span>Quota Logic Path:</span>
              <span className="font-mono">{systemStatus.debugInfo.quotaLogicPath}</span>
            </div>
          </div>
        </div>

        {/* Raw Debug Info */}
        <div className="bg-white p-4 rounded-lg border">
          <h2 className="text-lg font-semibold mb-3">Raw Debug Info</h2>
          <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
            {JSON.stringify(systemStatus.debugInfo, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}