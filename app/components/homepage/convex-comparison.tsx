import React from "react";
import { MessageCircle, Send, Bot, User } from "lucide-react";
import { Button } from "~/components/ui/button";

export function ConvexComparison() {
  const chatMessages = [
    {
      type: "user",
      message: "What are the main insights from the Lex Fridman episode about the future of artificial intelligence?",
      timestamp: "2:34 PM"
    },
    {
      type: "ai",
      message: "Based on the episode summary, here are the key insights:\n\n• **AI Safety**: The importance of developing alignment techniques before achieving AGI to ensure AI systems remain beneficial to humanity\n• **Consciousness in AI**: Discussion on whether future AI systems might develop consciousness and what that means for ethics\n• **Human-AI Collaboration**: The future likely involves AI amplifying human capabilities rather than replacing humans entirely\n• **Timeline Predictions**: Most experts predict significant AI breakthroughs within the next 5-10 years\n• **Regulatory Challenges**: The need for thoughtful governance frameworks that promote innovation while managing risks\n\nWould you like me to elaborate on any of these points or find related episodes that explore these concepts further?",
      timestamp: "2:34 PM"
    }
  ];

  return (
    <section className="py-24 bg-gradient-subtle">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            Chat with Your
            <span className="text-blue-600 dark:text-blue-400"> Podcast Library</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Ask questions about any podcast episode you've summarized. Get instant, intelligent answers powered by AI.
          </p>
        </div>

        {/* Chat Demo Interface */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-card rounded-2xl shadow-elegant overflow-hidden border border-border">
            {/* Chat Header */}
            <div className="bg-gradient-primary p-4 text-primary-foreground">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-foreground/20 rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Podclip AI Assistant</h3>
                  <p className="text-sm text-primary-foreground/80">Ask me about your podcast summaries</p>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="p-6 space-y-6 min-h-[400px]">
              {chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-4 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.type === 'ai' && (
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  
                  <div className={`max-w-[80%] ${msg.type === 'user' ? 'order-2' : ''}`}>
                    <div
                      className={`p-4 rounded-2xl ${
                        msg.type === 'user'
                          ? 'bg-primary text-primary-foreground ml-auto'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="whitespace-pre-line leading-relaxed">{msg.message}</p>
                    </div>
                    <p className={`text-xs text-muted-foreground mt-2 ${msg.type === 'user' ? 'text-right' : ''}`}>
                      {msg.timestamp}
                    </p>
                  </div>

                  {msg.type === 'user' && (
                    <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0 order-3">
                      <User className="w-4 h-4 text-accent" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <div className="border-t border-border p-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Ask about any episode..."
                  className="flex-1 px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled
                />
                <Button size="lg" className="px-6">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Feature Highlights */}
          {/* <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Natural Conversations</h3>
              <p className="text-sm text-muted-foreground">
                Chat naturally about your podcast content using plain English
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Bot className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Instant Insights</h3>
              <p className="text-sm text-muted-foreground">
                Get immediate answers about themes, quotes, and key concepts
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7v10c0 5.55 3.84 10 9 10s9-4.45 9-10V7l-10-5z"/>
                  <path d="M8 11l2 2 4-4"/>
                </svg>
              </div>
              <h3 className="font-semibold text-foreground mb-2">Context Aware</h3>
              <p className="text-sm text-muted-foreground">
                AI remembers all your summaries for cross-episode insights
              </p>
            </div>
          </div> */}
        </div>
      </div>
    </section>
  );
} 