"use client";

import { useChat } from "@ai-sdk/react";
import { useSearchParams, useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { useUser, useAuth } from "@clerk/react-router";
import { useState, useEffect } from "react";
import Markdown from "react-markdown";
import { FileText, Link, Files } from "lucide-react";
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/20/solid';
import { AnimatedAIChat } from "~/components/ui/animated-ai-chat";
import { EmptyState } from "~/components/ui/empty-state";
import { cn } from "~/lib/utils";
import clsx from 'clsx';
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
  const [query, setQuery] = useState('');

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
    <div className="flex flex-col w-full min-h-screen bg-white relative overflow-x-hidden">
      <style dangerouslySetInnerHTML={{
        __html: `
          input[data-headlessui-combobox-input] {
            color: #000000 !important;
          }
          .combobox-input-black {
            color: #000000 !important;
          }
        `
      }} />

      <div className="flex flex-col w-full py-4 md:py-8 relative z-10">
        <div className="w-full max-w-none sm:max-w-2xl md:max-w-3xl lg:max-w-4xl space-y-4 lg:space-y-6 px-4 sm:px-6 lg:px-8 mx-auto">

        {/* Episode Selection Dropdown */}
        {userSummaries && userSummaries.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-lg lg:text-xl font-semibold text-black">
              Select an Episode to Chat About
            </h2>
            <div className="relative w-full">
                <Combobox
                  value={userSummaries?.find((s: any) => s._id === selectedSummaryId) || null}
                  onChange={(value) => value && handleEpisodeSelect(value._id)}
                  onClose={() => setQuery('')}
                >
                  <div className="relative">
                    <ComboboxInput
                      style={{
                        color: '#000000 !important',
                      } as React.CSSProperties}
                      className={clsx(
                        'w-full min-w-0 h-16 lg:h-20 border border-black/[0.05] hover:border-black/20 focus:border-black/30 bg-white shadow-sm py-3 lg:py-4 px-3 lg:px-4 pr-10 text-left overflow-hidden rounded-lg',
                        'focus:outline-none focus:ring-2 focus:ring-black/10 placeholder:text-black/60',
                        '[&>*]:!text-black [&]:!text-black combobox-input-black'
                      )}
                      displayValue={(summary: any) => summary?.episode_title || ''}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Choose an episode from your summaries..."
                    />
                    <ComboboxButton className="group absolute inset-y-0 right-0 px-2.5">
                      <ChevronDownIcon
                        className="size-5 text-black group-hover:text-black/80"
                        style={{ color: '#000000', fill: '#000000', stroke: '#000000' }}
                      />
                    </ComboboxButton>
                  </div>

                  <ComboboxOptions
                    anchor="bottom"
                    transition
                    className={clsx(
                      'w-[--input-width] rounded-lg border border-black/[0.05] bg-white/90 backdrop-blur-xl p-1 [--anchor-gap:--spacing(1)] empty:invisible max-h-72 overflow-y-auto',
                      'transition duration-100 ease-in data-leave:data-closed:opacity-0'
                    )}
                  >
                    {userSummaries
                      ?.filter((summary: any) =>
                        query === '' ||
                        summary.episode_title?.toLowerCase().includes(query.toLowerCase()) ||
                        summary.podcast_title?.toLowerCase().includes(query.toLowerCase())
                      )
                      ?.map((summary: any) => (
                        <ComboboxOption
                          key={summary._id}
                          value={summary}
                          className="group flex cursor-default items-start gap-2 rounded-lg px-3 py-3 select-none data-focus:bg-black/[0.05] min-h-[3rem]"
                        >
                          <CheckIcon className="invisible size-4 fill-black mt-1 group-data-selected:visible flex-shrink-0" />
                          <div className="flex flex-col items-start w-full space-y-1">
                            <div className="font-semibold text-sm text-black w-full leading-relaxed">
                              {summary.episode_title || `Episode Summary`}
                            </div>
                            {summary.podcast_title && (
                              <div className="text-xs text-black/60 w-full leading-relaxed">
                                📻 {summary.podcast_title}
                              </div>
                            )}
                          </div>
                        </ComboboxOption>
                      ))}
                  </ComboboxOptions>
                </Combobox>
              </div>
            </div>
        ) : userSummaries === undefined ? (
          <div className="flex items-center justify-center py-8 bg-white rounded-lg border border-dashed border-black/[0.05]">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black/60 mr-3"></div>
            <span className="text-base text-black/70">Loading your summaries...</span>
          </div>
        ) : (
          <div className="flex justify-center py-8">
            <EmptyState
              title="No summaries found"
              description="Create your first summary to start chatting with AI about podcast episodes!"
              icons={[FileText, Link, Files]}
              action={{
                label: "Create New Summary",
                onClick: () => navigate('/dashboard/new-summary')
              }}
            />
          </div>
        )}

        {/* Chat Interface */}
        {selectedSummaryId && (
          <div className="w-full max-w-none sm:max-w-2xl md:max-w-3xl mx-auto space-y-4 md:space-y-6">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center min-h-[50vh]">
                <AnimatedAIChat
                  value={input}
                  onChange={handleInputChange}
                  onSubmit={handleSubmit}
                  placeholder="Ask about this episode..."
                  disabled={status !== 'ready'}
                  isLoading={status === 'streaming'}
                  episodeTitle={summary?.episode_title}
                />
              </div>
            ) : (
              <>
                {/* Chat Messages */}
                <div className="space-y-4 md:space-y-6">
                  {messages.map((message) => {
                    // Safely handle the message content and remove word count text
                    let messageContent = message.content || '';
                    // Remove word count text like "(Word Count 163)" from the message
                    messageContent = messageContent.replace(/\(Word Count \d+\)/g, '').trim();
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
                              ? "bg-white text-black rounded-br-md"
                              : "bg-black/[0.02] border border-black/[0.05] text-black rounded-bl-sm"
                          )}
                        >
                          {/* Fallback to message.content if parts are empty or malformed */}
                          {messageParts.length > 0 ? (
                            messageParts.map((part, partIndex) => {
                              switch (part.type) {
                                case "text":
                                  let textContent = typeof part.text === 'string' ? part.text :
                                                    typeof part.text === 'object' ? JSON.stringify(part.text) :
                                                    String(part.text || '');
                                  // Remove word count text from part content as well
                                  textContent = textContent.replace(/\(Word Count \d+\)/g, '').trim();
                                  return (
                                    <div
                                      key={`${message.id}-${partIndex}`}
                                      className={cn(
                                        "prose max-w-none prose-p:my-2 prose-li:my-1",
                                        message.role === "user"
                                          ? "prose-gray prose-p:text-black prose-strong:text-black prose-li:text-black"
                                          : "prose-gray prose-p:text-black prose-strong:text-black prose-li:text-black"
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
                                  ? "prose-gray prose-p:text-black prose-strong:text-black prose-li:text-black"
                                  : "prose-gray prose-p:text-black prose-strong:text-black prose-li:text-black"
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
                      <div className="max-w-[75%] px-4 py-3 bg-black/[0.02] border border-black/[0.05] rounded-2xl rounded-bl-sm">
                        <div className="flex items-center space-x-3">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-black/60 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-black/60 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-black/60 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          </div>
                          <span className="text-black/70 font-medium">AI is thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input when there are messages - use AnimatedAIChat */}
                <div className="w-full max-w-2xl mx-auto">
                  <AnimatedAIChat
                    value={input}
                    onChange={handleInputChange}
                    onSubmit={handleSubmit}
                    placeholder={
                      summary && summary.episode_title
                        ? `Ask about "${summary.episode_title.substring(0, 30)}${summary.episode_title.length > 30 ? '...' : ''}"`
                        : "Ask about this episode..."
                    }
                    disabled={status !== 'ready'}
                    isLoading={status === 'streaming'}
                    episodeTitle={summary?.episode_title}
                  />
                </div>
              </>
            )}
          </div>
        )}

        </div>
      </div>
    </div>
  );
}
