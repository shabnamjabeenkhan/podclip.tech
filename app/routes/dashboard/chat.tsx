"use client";

import { useChat } from "@ai-sdk/react";
import { useSearchParams, useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { useUser, useAuth } from "@clerk/react-router";
import { useState, useEffect } from "react";
import Markdown from "react-markdown";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger } from "~/components/ui/select";
import { cn } from "~/lib/utils";
import { isFeatureEnabled, config } from "../../../config";
import { api } from "convex/_generated/api";

export default function Chat() {
  // Get URL parameters for episode context
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialEpisodeId = searchParams.get('episodeId');
  const initialSummaryId = searchParams.get('summaryId');
  const { user } = useUser();
  const { isSignedIn } = useAuth();
  
  // Local state for selected episode
  const [selectedSummaryId, setSelectedSummaryId] = useState<string | null>(initialSummaryId);

  // Check if user can access chat - temporarily disabled to prevent errors
  // const chatAccess = useQuery(api.users.canUserAccessChat);

  // Get user quota to fetch userId
  const userQuota = useQuery(
    api.users.getUserQuota,
    isSignedIn ? {} : "skip"
  );
  
  // Get all user summaries for the dropdown
  const userSummaries = useQuery(api.summaries.getUserSummaries, 
    isSignedIn && userQuota?.userId ? { userId: userQuota.userId } : "skip"
  );

  // Get summary data for selected episode
  const summaryData = useQuery(
    api.summaries.getSummaryById, 
    selectedSummaryId ? { summaryId: selectedSummaryId } : "skip"
  );

  // Type-check the summary to ensure it's the correct type - check for required fields
  const summary = summaryData && 'content' in summaryData && 'takeaways' in summaryData && 'user_id' in summaryData ? summaryData : null;
  
  // Get episodeId from selected summary
  const episodeId = summary?.episode_id || initialEpisodeId;

  // Early return if chat is not enabled
  if (!config.ui.showChat || !isFeatureEnabled('convex')) {
    return (
      <div className="flex flex-col w-full py-24 justify-center items-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold">Chat Not Available</h2>
          <p className="text-muted-foreground">
            Chat functionality is currently disabled or requires backend services.
          </p>
        </div>
      </div>
    );
  }

  // Temporarily disabled chat access check to prevent errors
  // if (chatAccess && !chatAccess.canAccess) {
  //   return (
  //     <div className="flex flex-col w-full py-24 justify-center items-center">
  //       <div className="text-center space-y-4 max-w-md">
  //         <h2 className="text-2xl font-semibold">Chat Access Restricted</h2>
  //         <p className="text-muted-foreground">
  //           {chatAccess.reason}
  //         </p>
  //         {chatAccess.plan === "free" && (
  //           <Button 
  //             onClick={() => window.location.href = '/pricing'} 
  //             className="mt-4"
  //           >
  //             Upgrade to Continue Chatting
  //           </Button>
  //         )}
  //       </div>
  //     </div>
  //   );
  // }

  // Safe access to environment variables only when needed
  const CONVEX_SITE_URL = config.services.convex?.url?.replace(
  /.cloud$/,
  ".site"
);

  if (!CONVEX_SITE_URL) {
    return (
      <div className="flex flex-col w-full py-24 justify-center items-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold">Chat Configuration Error</h2>
          <p className="text-muted-foreground">
            Chat functionality requires proper backend configuration.
          </p>
        </div>
      </div>
    );
  }

  // Handle episode selection from dropdown
  const handleEpisodeSelect = (summaryId: string) => {
    setSelectedSummaryId(summaryId);
    // Update URL to reflect selection
    navigate(`/dashboard/chat?summaryId=${summaryId}`, { replace: true });
  };

  const { messages, input, handleInputChange, handleSubmit, status, setMessages } =
    useChat({
      maxSteps: 10,
      api: `${CONVEX_SITE_URL}/api/chat`,
      body: {
        episodeId,
        summaryId: selectedSummaryId,
        userId: user?.id,
      },
    });
    
  // Clear messages when episode changes
  useEffect(() => {
    if (selectedSummaryId !== initialSummaryId) {
      setMessages([]);
    }
  }, [selectedSummaryId, initialSummaryId, setMessages]);

  return (
    <div className="flex flex-col w-full min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 relative overflow-x-hidden">
      <div className="flex flex-col w-full py-4 md:py-8">
        <div className="w-full max-w-2xl md:max-w-3xl lg:max-w-4xl space-y-4 lg:space-y-6 px-4 sm:px-6 lg:px-8 mx-auto">

        {/* Episode Selection Dropdown */}
        <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
          <CardHeader className="pb-3 lg:pb-4">
            <CardTitle className="text-lg lg:text-xl font-semibold text-gray-800 flex items-center gap-2 lg:gap-3">
              <div className="flex items-center justify-center w-8 lg:w-10 h-8 lg:h-10 bg-blue-100 rounded-full">
                🎧
              </div>
              <span className="text-base lg:text-xl">Select an Episode to Chat About</span>
            </CardTitle>
            <p className="text-xs lg:text-sm text-gray-600 mt-1 lg:mt-2">
              Choose from your podcast summaries to start an AI conversation
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            {userSummaries && userSummaries.length > 0 ? (
              <div className="relative w-full">
                <Select
                  value={selectedSummaryId || ""}
                  onValueChange={handleEpisodeSelect}
                >
                <SelectTrigger className="w-full min-w-0 h-16 lg:h-20 border-2 border-gray-200 hover:border-blue-300 focus:border-blue-500 !bg-white shadow-sm py-3 lg:py-4 px-3 lg:px-4 text-left overflow-hidden">
                  <div className="flex-1 min-w-0 flex flex-col justify-center px-2 lg:px-4 py-1 overflow-hidden">
                    {selectedSummaryId && summary ? (
                      <div className="font-semibold text-sm lg:text-base text-gray-900 leading-tight truncate w-full">
                        {summary.episode_title || "Episode Summary"}
                      </div>
                    ) : (
                      <div className="truncate w-full text-gray-500 text-sm lg:text-base">
                        <span className="hidden md:inline">🔍 Choose an episode from your summaries...</span>
                        <span className="md:hidden">🔍 Choose an episode...</span>
                      </div>
                    )}
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-72 border-2 border-gray-200 w-full max-w-[calc(100vw-2rem)] sm:max-w-none p-1">
                  {userSummaries.map((summary: any) => (
                    <SelectItem key={summary._id} value={summary._id} className="py-3 h-auto min-h-[3rem] hover:bg-blue-50 focus:bg-blue-50 whitespace-normal">
                      <div className="flex flex-col items-start w-full space-y-1 pb-4">
                        <div className="font-semibold text-sm text-gray-900 w-full leading-relaxed whitespace-normal">
                          {summary.episode_title || `Episode Summary`}
                        </div>
                        {summary.podcast_title && (
                          <div className="text-xs text-blue-600 w-full leading-relaxed whitespace-normal">
                            📻 {summary.podcast_title}
                          </div>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
                </Select>
              </div>
            ) : userSummaries === undefined ? (
              <div className="flex items-center justify-center py-8 bg-white rounded-lg border-2 border-dashed border-gray-200">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-base text-gray-600">Loading your summaries...</span>
              </div>
            ) : (
              <div className="text-center py-8 bg-white rounded-lg border-2 border-dashed border-gray-200">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  📝
                </div>
                <p className="text-base text-gray-700 mb-2 font-medium">
                  No summaries found
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Create your first summary to start chatting with AI about podcast episodes!
                </p>
                <Button
                  onClick={() => navigate('/dashboard/new-summary')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                >
                  ✨ Create New Summary
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat Messages */}
        {selectedSummaryId && (
          <div className="w-full max-w-2xl md:max-w-3xl mx-auto space-y-4 md:space-y-6">
            {messages.length === 0 && (
              <div className="text-center py-8 md:py-12">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                  💬
                </div>
                <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-2">Start Your Conversation</h3>
                <p className="text-sm md:text-base text-gray-600 max-w-sm md:max-w-md mx-auto px-4">
                  Ask me anything about this episode! I have access to the full summary and key takeaways.
                </p>
              </div>
            )}
            
            {messages.map((message) => {
              // Safely handle the message content
              const messageContent = message.content || '';
              const messageParts = message.parts || [];
              
              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[75%] px-4 py-3 text-base shadow-sm rounded-2xl",
                      message.role === "user"
                        ? "bg-blue-600 text-white rounded-br-md"
                        : "bg-white border border-gray-200 text-gray-900 rounded-bl-sm"
                    )}
                  >
                    {/* Fallback to message.content if parts are empty or malformed */}
                    {messageParts.length > 0 ? (
                      messageParts.map((part, partIndex) => {
                        switch (part.type) {
                          case "text":
                            const textContent = typeof part.text === 'string' ? part.text : 
                                              typeof part.text === 'object' ? JSON.stringify(part.text) : 
                                              String(part.text || '');
                            return (
                              <div
                                key={`${message.id}-${partIndex}`}
                                className={cn(
                                  "prose max-w-none prose-p:my-2 prose-li:my-1",
                                  message.role === "user" 
                                    ? "prose-invert prose-p:text-white prose-strong:text-white prose-li:text-white" 
                                    : "prose-gray prose-p:text-gray-800 prose-strong:text-gray-900"
                                )}
                              >
                                <Markdown>{textContent}</Markdown>
                              </div>
                            );
                          default:
                            return null;
                        }
                      })
                    ) : (
                      // Fallback to rendering message.content directly
                      <div
                        className={cn(
                          "prose max-w-none prose-p:my-2 prose-li:my-1",
                          message.role === "user" 
                            ? "prose-invert prose-p:text-white prose-strong:text-white prose-li:text-white" 
                            : "prose-gray prose-p:text-gray-800 prose-strong:text-gray-900"
                        )}
                      >
                        <Markdown>{typeof messageContent === 'string' ? messageContent : String(messageContent)}</Markdown>
                      </div>
                    )}
                  </div>
                  {message.role === "user" && (
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">👤</span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Loading indicator */}
            {status === 'streaming' && (
              <div className="flex justify-start">
                <div className="max-w-[75%] px-4 py-3 bg-white border border-gray-200 rounded-2xl rounded-bl-sm">
                  <div className="flex items-center space-x-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                    <span className="text-gray-600 font-medium">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Chat Input */}
        {selectedSummaryId && (
          <div className="w-full max-w-2xl md:max-w-3xl mx-auto mt-4 md:mt-6">
            <form onSubmit={handleSubmit} className="w-full">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-end">
                <Input
                  className="flex-1 border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm sm:text-base text-gray-900 placeholder:text-gray-500 !bg-white rounded-lg h-10 sm:h-12 px-3 sm:px-4 transition-all duration-200 min-w-0"
                  value={input}
                  placeholder={
                    summary && summary.episode_title
                      ? `Ask about "${summary.episode_title.substring(0, window.innerWidth < 640 ? 15 : window.innerWidth < 768 ? 20 : 30)}${summary.episode_title.length > (window.innerWidth < 640 ? 15 : window.innerWidth < 768 ? 20 : 30) ? '...' : ''}"` 
                      : "Ask about this episode..."
                  }
                  onChange={handleInputChange}
                  disabled={status !== 'ready'}
                />
                <Button 
                  type="submit" 
                  loading={status === 'streaming'} 
                  disabled={!input.trim() || status !== 'ready'}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 sm:px-6 py-2 sm:py-3 h-10 sm:h-12 text-sm sm:text-base font-medium shadow-sm transition-all duration-200 hover:shadow-md whitespace-nowrap"
                >
                  {status === 'streaming' ? "Sending..." : "Send"}
                </Button>
              </div>
            </form>
          </div>
        )}

        </div>
      </div>
    </div>
  );
}
