import { Button } from "~/components/ui/button";
import { ArrowRight, Podcast, Brain, Database, CheckCircle } from "lucide-react";
import { Link } from "react-router";
import HighlightCard from "~/components/ui/highlight-card";

export default function CoreFeaturesSection() {
  const highlightCards = [
    {
      title: "Podcast Discovery",
      description: [
        "Embark on intelligent podcast exploration,",
        "discover episodes from millions of shows,",
        "search with precision and purpose,",
        "and build your audio knowledge library."
      ],
      icon: <Podcast className="w-8 h-8 text-white" />
    },
    {
      title: "Instant Insights",
      description: [
        "Transform hours of audio into insights,",
        "extract key takeaways automatically,",
        "generate summaries in seconds,",
        "and never miss important points again."
      ],
      icon: <Brain className="w-8 h-8 text-white" />
    },
    {
      title: "Share & Collaborate",
      description: [
        "Connect insights with your team,",
        "share discoveries across platforms,",
        "build collective knowledge together,",
        "and amplify your research impact."
      ],
      icon: <CheckCircle className="w-8 h-8 text-white" />
    }
  ];

  return (
    <section id="features" className="relative w-full overflow-hidden py-16 sm:py-20 md:py-24">
      {/* Background Effects - removed */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
      </div>
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-14 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6">
            Explore Your Podcast Universe
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto px-4 sm:px-0">
            Embark on a journey of discovery, transform audio into insights, and share knowledge with your network.
          </p>
        </div>

        {/* Highlight Cards Grid */}
        <div className="flex flex-wrap justify-center gap-8 mb-12 sm:mb-14 md:mb-16">
          {highlightCards.map((card, index) => (
            <HighlightCard
              key={index}
              title={card.title}
              description={card.description}
              icon={card.icon}
            />
          ))}
        </div>

        {/* Result Section */}
        {/* <div className="bg-card rounded-2xl p-8 md:p-12 shadow-elegant text-center">
          <div className="inline-flex items-center gap-2 bg-success/10 text-success px-4 py-2 rounded-full mb-6">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Result</span>
          </div>
          
          <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Research with confidence, knowing your podcast insights are always covered
          </h3>
          
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Never miss important insights again. Build your knowledge base systematically and share discoveries with your team seamlessly.
          </p>

          <Button asChild variant="hero" size="lg" className="group">
            <Link to="/sign-up" prefetch="viewport">
              Start Planning Your Research
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div> */}

      </div>
    </section>
  );
} 