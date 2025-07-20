import { Button } from "~/components/ui/button";
import { ArrowRight, Podcast, Brain, Database, CheckCircle } from "lucide-react";
import { Link } from "react-router";

export default function CoreFeaturesSection() {
  const steps = [
    {
      number: "1",
      icon: Podcast,
      title: "Select Your Podcast",
      description: "Search from our extensive database of popular shows.",
      color: "bg-primary/10 text-primary"
    },
    {
      number: "2", 
      icon: Brain,
      title: "AI Generates Summary",
      description: "Our advanced AI processes the episode and creates a concise summary with key takeaways in under 10 seconds.",
      color: "bg-accent/10 text-accent"
    },
    {
      number: "3",
      icon: Database,
      title: "Sync to Notion",
      description: "You can choose to export the notes to your Notion workspace, organized in tables with episode details and insights.",
      color: "bg-success/10 text-success"
    },
    {
      number: "4",
      icon: CheckCircle,
      title: "Collaborate & Share",
      description: "Share insights with your team and integrate into your existing research workflows.",
      color: "bg-primary/10 text-primary"
    }
  ];

  return (
    <section id="features" className="py-24 bg-gradient-subtle">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            How It All Connects
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Transform your podcast consumption into organized insights in just four simple steps.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {steps.map((step, index) => (
            <div key={index} className="text-center">
              {/* Step Number */}
              <div className="relative mb-6">
                <div className={`w-16 h-16 mx-auto rounded-full ${step.color} flex items-center justify-center text-2xl font-bold mb-4`}>
                  {step.number}
                </div>
                <div className="w-12 h-12 mx-auto bg-background rounded-lg shadow-card flex items-center justify-center -mt-8 relative z-10">
                  <step.icon className={`w-6 h-6 ${step.color.split(' ')[1]}`} />
                </div>
              </div>

              {/* Step Content */}
              <h3 className="text-xl font-semibold text-foreground mb-3">
                {step.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
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