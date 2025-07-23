import React from "react";
import { Zap, Shield, Clock, Workflow } from "lucide-react";

export function ConvexComparison() {
  const features = [
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Get podcast summaries in under 10 seconds with our optimized AI pipeline",
      color: "text-yellow-600"
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your data is protected with enterprise-grade security and privacy controls",
      color: "text-green-600"
    },
    {
      icon: Clock,
      title: "Save Hours",
      description: "Transform 2-hour podcast episodes into 2-minute summaries without missing key insights",
      color: "text-blue-600"
    },
    {
      icon: Workflow,
      title: "Workflow Ready",
      description: "Export to Notion, share with teams, and integrate into your existing research process",
      color: "text-purple-600"
    }
  ];

  return (
    <section className="py-24 bg-gradient-subtle">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            Built for
            <span className="text-blue-600 dark:text-blue-400"> Modern Researchers</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Every feature is designed to help you extract maximum value from podcasts with minimal effort.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="text-center group">
              <div className="w-16 h-16 mx-auto mb-6 bg-card rounded-2xl shadow-elegant border border-border flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <feature.icon className={`w-8 h-8 ${feature.color}`} />
              </div>
              
              <h3 className="text-xl font-semibold text-foreground mb-3">
                {feature.title}
              </h3>
              
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            Ready to transform your podcast experience?
          </div>
        </div>
      </div>
    </section>
  );
}