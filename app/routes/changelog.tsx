import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import type { Route } from "./+types/changelog";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Changelog - Kaizen" },
    { name: "description", content: "Stay updated with the latest changes and improvements to Kaizen." },
  ];
}

export default function Changelog() {
  const changes = [
    {
      version: "v1.1.0",
      date: "July 18, 2025",
      title: "Development Experience Improvements",
      changes: [
        "Added rules files for both Cursor and Claude Code to dramatically improve LLM code generation accuracy ✅",
        "Claude now plays a sound 🔊 when it needs your attention or if the task is complete ✅"
      ]
    },
    {
      version: "v1.0.0", 
      date: "July 7, 2025",
      title: "Initial Launch",
      changes: [
        "🎉 Initial launch of Kaizen - Modern full-stack SaaS starter template",
        "React Router v7 with SSR support",
        "Convex real-time database integration", 
        "Clerk authentication system",
        "Polar.sh payment processing",
        "Configurable feature flag system",
        "shadcn/ui component library",
        "TailwindCSS v4 styling",
        "TypeScript-first development experience"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="mb-12">
          <Button asChild variant="ghost" size="sm" className="mb-6">
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </Button>
          <h1 className="text-4xl font-bold text-foreground mb-4">Changelog</h1>
          <p className="text-lg text-muted-foreground">
            Keep track of all the latest updates, improvements, and new features.
          </p>
        </div>

        <div className="space-y-12">
          {changes.map((release, index) => (
            <div key={release.version} className="relative">
              {index !== changes.length - 1 && (
                <div className="absolute left-4 top-16 bottom-0 w-px bg-border" />
              )}
              
              <div className="flex items-start space-x-6">
                <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-primary-foreground rounded-full" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-semibold text-foreground mb-1">
                        {release.title}
                      </h2>
                      <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                        <span className="px-2 py-1 bg-secondary rounded-md font-medium">
                          {release.version}
                        </span>
                        <span>{release.date}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-card border rounded-lg p-6">
                    <ul className="space-y-3">
                      {release.changes.map((change, changeIndex) => (
                        <li key={changeIndex} className="flex items-start space-x-3">
                          <div className="flex-shrink-0 w-1.5 h-1.5 bg-primary rounded-full mt-2" />
                          <span className="text-card-foreground leading-relaxed">
                            {change}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}