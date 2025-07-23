"use client";

import { useChat } from "@ai-sdk/react";
import { useSearchParams } from "react-router";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/react-router";
import Markdown from "react-markdown";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { isFeatureEnabled, config } from "../../../config";
import { api } from "../../../convex/_generated/api";

export default function Chat() {
  // Get URL parameters for episode context
  const [searchParams] = useSearchParams();
  const episodeId = searchParams.get('episodeId');
  const summaryId = searchParams.get('summaryId');
  const { user } = useUser();

  // Get summary data if we have context
  const summaryData = useQuery(
    api.summaries.getSummaryById, 
    summaryId ? { summaryId } : "skip"
  );

  // Type-check the summary to ensure it's the correct type - check for required fields
  const summary = summaryData && 'content' in summaryData && 'takeaways' in summaryData && 'user_id' in summaryData ? summaryData : null;

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

  const { messages, input, handleInputChange, handleSubmit, isLoading: chatIsLoading } =
    useChat({
      maxSteps: 10,
      api: `${CONVEX_SITE_URL}/api/chat`,
      body: {
        episodeId,
        summaryId,
        userId: user?.id,
      },
    });

  return (
    <div className="flex flex-col w-full py-8 justify-center items-center">
      <div className="w-full max-w-4xl space-y-6">
        {/* Episode Context Card */}
        {summary && (
          <Card className="mx-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                💬 Chatting about this episode
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-1">
                  EPISODE
                </h4>
                <p className="font-medium">{summary.episode_title || "Episode Chat"}</p>
              </div>
              {summary.podcast_title && (
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-1">
                    PODCAST
                  </h4>
                  <p className="text-sm">{summary.podcast_title}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {summary?.takeaways?.length || 0} key takeaways
                </Badge>
                <Badge variant="outline">AI context enabled</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chat Messages */}
        <div className="w-full max-w-2xl mx-auto space-y-4 mb-20 px-4">
          {messages.map((message, i) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] px-4 py-3 text-sm shadow-sm rounded-2xl",
                  message.role === "user"
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-gray-100 text-gray-900 rounded-bl-sm"
                )}
              >
                {message.parts.map((part) => {
                  switch (part.type) {
                    case "text":
                      return (
                        <div
                          key={`${message.id}-${i}`}
                          className="prose prose-sm max-w-none prose-p:my-1 prose-li:my-0.5"
                        >
                          <Markdown>{part.text}</Markdown>
                        </div>
                      );
                    default:
                      return null;
                  }
                })}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {chatIsLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] px-4 py-3 text-sm bg-gray-100 rounded-2xl rounded-bl-sm">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <span className="text-gray-600">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <form
          className="sticky bottom-0 w-full max-w-2xl mx-auto p-4 bg-white border-t"
          onSubmit={handleSubmit}
        >
          <div className="flex gap-2 items-end">
            <Input
              className="flex-1"
              value={input}
              placeholder={
                summary && summary.episode_title
                  ? `Ask about "${summary.episode_title.substring(0, 30)}${summary.episode_title.length > 30 ? '...' : ''}"` 
                  : "Ask about a podcast episode..."
              }
              onChange={handleInputChange}
              disabled={chatIsLoading}
            />
            <Button type="submit" disabled={chatIsLoading || !input.trim()}>
              Send
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
