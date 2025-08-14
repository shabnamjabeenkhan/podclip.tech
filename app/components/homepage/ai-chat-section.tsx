import { Button } from "~/components/ui/button";
import { ArrowRight, MessageCircle, Brain, Sparkles, Zap } from "lucide-react";
import { Link } from "react-router";
import { useState, useCallback } from "react";

export default function AiChatSection() {
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isLearnMoreLoading, setIsLearnMoreLoading] = useState(false);

  const handleChatClick = useCallback(() => {
    setIsChatLoading(true);
  }, []);

  const handleLearnMoreClick = useCallback(() => {
    setIsLearnMoreLoading(true);
  }, []);
  const features = [
    {
      icon: MessageCircle,
      title: "Conversational AI",
      description: "Ask natural questions about any podcast episode"
    },
    {
      icon: Brain,
      title: "Context Aware",
      description: "AI understands summaries, takeaways, and episode content"
    },
    {
      icon: Sparkles,
      title: "Deep Insights",
      description: "Explore topics, get clarifications, and discover connections"
    },
    {
      icon: Zap,
      title: "Instant Responses",
      description: "Get answers in seconds, powered by advanced AI"
    }
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium">
                <MessageCircle className="w-4 h-4" />
                AI-Powered Chat
              </div>
              
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
                Chat with Your
                <span className="text-blue-600 block">Podcast Library</span>
              </h2>
              
              <p className="text-xl text-gray-600 leading-relaxed">
                Have conversations with your podcast collection. Ask questions, get insights, 
                and discover connections across all your summaries with our intelligent AI assistant.
              </p>
            </div>

            {/* Feature Grid */}
            <div className="grid sm:grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start gap-3 p-4 bg-white rounded-lg border border-gray-100 shadow-sm">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <Button asChild variant="hero" size="lg" className="group" loading={isChatLoading} onClick={handleChatClick}>
                <Link to="/sign-up" prefetch="viewport">
                  Try AI Chat
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" loading={isLearnMoreLoading} onClick={handleLearnMoreClick}>
                <Link to="#features">Learn More</Link>
              </Button>
            </div>
          </div>

          {/* Right Visual */}
          <div className="relative">
            {/* Chat Interface Mockup */}
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
              {/* Chat Header */}
              <div className="bg-blue-600 text-white p-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold">AI Assistant</h3>
                  <p className="text-blue-200 text-sm">Ready to help with your podcasts</p>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="p-4 space-y-4 h-80 overflow-y-auto">
                {/* User Message */}
                <div className="flex justify-end">
                  <div className="bg-blue-600 text-white px-4 py-2 rounded-2xl rounded-br-md max-w-xs">
                    <p className="text-sm">What were the main points in the Tim Ferriss episode about productivity?</p>
                  </div>
                </div>

                {/* AI Response */}
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-900 px-4 py-3 rounded-2xl rounded-bl-md max-w-sm">
                    <p className="text-sm">Based on your Tim Ferriss episode summary, the main productivity points were:</p>
                    <ul className="text-sm mt-2 space-y-1 list-disc list-inside">
                      <li>The 80/20 rule for focus</li>
                      <li>Morning routines for success</li>
                      <li>Eliminating decision fatigue</li>
                    </ul>
                    <p className="text-sm mt-2 text-blue-600">Would you like me to elaborate on any of these points?</p>
                  </div>
                </div>

                {/* User Message */}
                <div className="flex justify-end">
                  <div className="bg-blue-600 text-white px-4 py-2 rounded-2xl rounded-br-md max-w-xs">
                    <p className="text-sm">Tell me more about morning routines</p>
                  </div>
                </div>

                {/* AI Typing */}
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-900 px-4 py-3 rounded-2xl rounded-bl-md">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      <span className="text-sm text-gray-500">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Input */}
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <div className="flex-1 bg-gray-100 rounded-full px-4 py-2">
                    <p className="text-sm text-gray-500">Ask about your podcast library...</p>
                  </div>
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-blue-500/10 rounded-full blur-xl"></div>
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-purple-500/10 rounded-full blur-xl"></div>
          </div>
        </div>
      </div>
    </section>
  );
}