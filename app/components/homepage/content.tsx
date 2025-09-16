import { Button } from "~/components/ui/button";
import { GraduationCap, Heart, Laptop, Search, ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { useState, useCallback } from "react";
import ShinyText from "~/components/ShinyText";

export default function ContentSection() {
  const [isSignUpLoading, setIsSignUpLoading] = useState(false);

  const handleSignUpClick = useCallback(() => {
    setIsSignUpLoading(true);
  }, []);
  return (
    <section id="content" className="py-16 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            Transform Podcast Content into <span className="text-primary">Actionable Business Intelligence</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Extract strategic insights, market intelligence, and competitive advantages from thousands of business podcasts. Make data-driven decisions with AI-powered content analysis.
          </p>
        </div>

        {/* Use Cases Grid with Central Element */}
        <div className="relative max-w-5xl mx-auto">
          {/* Top Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="bg-card rounded-xl p-8 shadow-card hover:shadow-elegant transition-all duration-300">
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                <GraduationCap className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Academia & Research</h3>
              <p className="text-muted-foreground mb-6">
                Extract key findings from research podcasts, academic interviews, and educational content. 
                Perfect for literature reviews and staying current with your field.
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-primary">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Research findings
                </div>
                <div className="flex items-center gap-2 text-primary">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Academic discussions
                </div>
                <div className="flex items-center gap-2 text-primary">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Expert interviews
                </div>
                <div className="flex items-center gap-2 text-primary">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Educational content
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl p-8 shadow-card hover:shadow-elegant transition-all duration-300">
              <div className="w-16 h-16 bg-accent/10 rounded-xl flex items-center justify-center mb-6">
                <Heart className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Mental Health & Wellness</h3>
              <p className="text-muted-foreground mb-6">
                Quickly access therapeutic insights, mindfulness techniques, and expert advice from mental health 
                professionals and wellness podcasts.
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-accent">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  Therapeutic techniques
                </div>
                <div className="flex items-center gap-2 text-accent">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  Expert advice
                </div>
                <div className="flex items-center gap-2 text-accent">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  Wellness strategies
                </div>
                <div className="flex items-center gap-2 text-accent">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  Self-care tips
                </div>
              </div>
            </div>
          </div>

          {/* Central Element */}
          <div className="flex justify-center mb-12">
            <div className="w-32 h-32 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-elegant border-4 border-primary/20">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">Podclip</div>
                <div className="text-sm text-blue-500 dark:text-blue-300">AI Insights</div>
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-card rounded-xl p-8 shadow-card hover:shadow-elegant transition-all duration-300">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mb-6">
                <Laptop className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Technology & Innovation</h3>
              <p className="text-muted-foreground mb-6">
                Stay updated with the latest tech trends, startup insights, and industry developments without 
                spending hours listening to full episodes.
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
                  Tech trends
                </div>
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
                  Startup insights
                </div>
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
                  Industry news
                </div>
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
                  Innovation updates
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl p-8 shadow-card hover:shadow-elegant transition-all duration-300">
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                <Search className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">True Crime Analysis</h3>
              <p className="text-muted-foreground mb-6">
                Follow complex cases and investigations with clear summaries that highlight key evidence, 
                timelines, and investigative insights.
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-primary">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Case analysis
                </div>
                <div className="flex items-center gap-2 text-primary">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Key evidence
                </div>
                <div className="flex items-center gap-2 text-primary">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Timeline tracking
                </div>
                <div className="flex items-center gap-2 text-primary">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Investigation insights
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Text and CTA */}
          <div className="text-center mt-12">
            <p className="text-lg text-muted-foreground mb-8">
              All features working together for your podcast insight journey
            </p>
            <Button asChild variant="default" size="lg" className="group" loading={isSignUpLoading} onClick={handleSignUpClick}>
              <Link to="/sign-up" prefetch="viewport" className="flex items-center">
                🚀 <ShinyText text="Start Summarising!" speed={3} />
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
