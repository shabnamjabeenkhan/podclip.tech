import { isRouteErrorResponse, useRouteError } from "react-router";

function AppErrorBoundary() {
  const error = useRouteError();
  
  if (isRouteErrorResponse(error)) {
    return (
      <div className="error-page flex flex-col items-center justify-center min-h-screen p-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-red-600">Oops! Something went wrong</h1>
          <p className="text-lg text-gray-600">Status: {error.status}</p>
          <p className="text-gray-500">{error.statusText}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="error-page flex flex-col items-center justify-center min-h-screen p-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-red-600">Oops! Something went wrong</h1>
        <p className="text-gray-600">An unexpected error occurred. Please try again.</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

// Simple error boundary without Sentry integration
// For Convex backend errors: Use built-in exception reporting via Dashboard
// See: https://docs.convex.dev/production/integrations/exception-reporting
export const ErrorBoundary = AppErrorBoundary;