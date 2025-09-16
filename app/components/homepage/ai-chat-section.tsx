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
    <section className="relative w-full py-16 md:py-32">
      {/* Background Effects */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-br from-indigo-400/10 to-cyan-500/10 rounded-full blur-3xl"></div>
      </div>
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium border border-blue-200/50 dark:border-blue-800/50">
                <MessageCircle className="w-4 h-4" />
                AI-Powered Chat
              </div>
              
              <h2 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
                Chat with Your
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent block">Podcast Library</span>
              </h2>
              
              <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
                Have conversations with your podcast collection. Ask questions, get insights, 
                and discover connections across all your summaries with our intelligent AI assistant.
              </p>
            </div>

            {/* Feature Grid */}
            <div className="grid sm:grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <div key={index} className="group flex items-start gap-4 p-6 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-lg hover:shadow-xl hover:bg-white/15 transition-all duration-300">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors">{feature.title}</h3>
                    <p className="text-sm text-white/80 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300" loading={isChatLoading} onClick={handleChatClick}>
                <Link to="/sign-up" prefetch="viewport" className="flex items-center justify-center">
                  <MessageCircle className="mr-2 w-5 h-5" />
                  Try AI Chat
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-2 hover:bg-card/50" loading={isLearnMoreLoading} onClick={handleLearnMoreClick}>
                <Link to="#features" className="flex items-center justify-center">
                  Learn More
                </Link>
              </Button>
            </div>
          </div>

          {/* Right Visual */}
          <div className="relative">
            {/* Chat Interface Mockup */}
            <div className="bg-card/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-border/50 overflow-hidden hover:shadow-3xl transition-all duration-500">
              {/* Chat Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 flex items-center gap-4">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">AI Assistant</h3>
                  <p className="text-blue-100 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    Ready to help with your podcasts
                  </p>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="p-6 space-y-6 h-96 overflow-y-auto bg-gradient-to-b from-transparent to-muted/10">
                {/* User Message */}
                <div className="flex justify-end">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-3 rounded-2xl rounded-br-md max-w-sm shadow-lg">
                    <p className="text-sm leading-relaxed">What were the main points in the Tim Ferriss episode about productivity?</p>
                  </div>
                </div>

                {/* AI Response */}
                <div className="flex justify-start">
                  <div className="bg-muted/50 border border-border/50 text-foreground px-5 py-4 rounded-2xl rounded-bl-md max-w-md shadow-sm">
                    <p className="text-sm mb-3 leading-relaxed">Based on your Tim Ferriss episode summary, the main productivity points were:</p>
                    <ul className="text-sm space-y-2 mb-3">
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                        <span>The 80/20 rule for focus</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                        <span>Morning routines for success</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                        <span>Eliminating decision fatigue</span>
                      </li>
                    </ul>
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Would you like me to elaborate on any of these points?</p>
                  </div>
                </div>

                {/* User Message */}
                <div className="flex justify-end">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-3 rounded-2xl rounded-br-md max-w-sm shadow-lg">
                    <p className="text-sm leading-relaxed">Tell me more about morning routines</p>
                  </div>
                </div>

                {/* AI Typing */}
                <div className="flex justify-start">
                  <div className="bg-muted/50 border border-border/50 text-foreground px-5 py-4 rounded-2xl rounded-bl-md shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      <span className="text-sm text-muted-foreground font-medium">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Input */}
              <div className="border-t border-border/50 p-6">
                <div className="flex gap-3">
                  <div className="flex-1 bg-muted/30 border border-border/50 rounded-full px-5 py-3">
                    <p className="text-sm text-muted-foreground">Ask about your podcast library...</p>
                  </div>
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center hover:scale-110 transition-transform cursor-pointer shadow-lg">
                    <ArrowRight className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-gradient-to-br from-indigo-400/20 to-cyan-400/20 rounded-full blur-xl animate-pulse" style={{animationDelay: '1s'}}></div>
            <div className="absolute top-1/2 -right-2 w-16 h-16 bg-gradient-to-br from-purple-400/15 to-pink-400/15 rounded-full blur-lg animate-pulse" style={{animationDelay: '2s'}}></div>
          </div>
        </div>
      </div>
    </section>
  );
}