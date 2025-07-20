import { memo } from "react";
import { Link } from "react-router";
import { LogoIcon } from "~/components/logo";
import {
  Convex,
  Polar,
  ReactIcon,
  ReactRouter,
  ClerkLogo,
} from "~/components/logos";
import Resend from "~/components/logos/Resend";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { Navbar } from "./navbar";
import { Brain, Database, Zap, Users, ArrowRight } from "lucide-react";

export default function IntegrationsSection({
  loaderData,
}: {
  loaderData?: { isSignedIn: boolean; hasActiveSubscription: boolean };
}) {
  return (
    <section id="hero">
      <Navbar loaderData={loaderData} />
      <div className="bg-muted dark:bg-background py-24 md:py-32">
        <div className="flex justify-center mb-8">
          {/* <Link
            to="https://codeandcreed.tech"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2 shadow-sm"
          >
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Powering Code&Creed Startups
            </span>
          </Link> */}
        </div>
        <div className="mx-auto max-w-5xl px-6 mt-[2rem]">
          <div className="grid items-center sm:grid-cols-2">
            <div className="dark:bg-muted/50 relative mx-auto w-fit">
              <div className="bg-radial to-muted dark:to-background absolute inset-0 z-10 from-transparent to-75%"></div>
              
              {/* Brain Icon Illustration */}
              <div className="relative w-48 h-48 mx-auto">
                {/* Central Brain */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 bg-purple-200/30 dark:bg-purple-900/20 rounded-full flex items-center justify-center border-2 border-purple-300/50 dark:border-purple-700/50">
                    <Brain className="w-16 h-16 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                
                {/* Top Right - Database */}
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-blue-200/30 dark:bg-blue-900/20 rounded-full flex items-center justify-center border-2 border-blue-300/50 dark:border-blue-700/50">
                  <Database className="w-8 h-8 text-blue-500 dark:text-blue-400" />
                </div>
                
                {/* Bottom Left - Lightning */}
                <div className="absolute -bottom-6 -left-6 w-16 h-16 bg-green-200/30 dark:bg-green-900/20 rounded-full flex items-center justify-center border-2 border-green-300/50 dark:border-green-700/50">
                  <Zap className="w-8 h-8 text-green-500 dark:text-green-400" />
                </div>
                
                {/* Mid Left - Users */}
                <div className="absolute top-8 -left-12 w-14 h-14 bg-purple-200/30 dark:bg-purple-900/20 rounded-full flex items-center justify-center border-2 border-purple-300/50 dark:border-purple-700/50">
                  <Users className="w-7 h-7 text-purple-500 dark:text-purple-400" />
                </div>
              </div>
            </div>
            <div className="mx-auto mt-6 max-w-2xl space-y-6 text-center sm:mt-0 sm:text-left">
              <h2 className="text-balance text-3xl font-semibold md:text-4xl">
                Podclip
              </h2>
              <p className="text-muted-foreground text-xl md:text-2xl leading-relaxed">
                Your podcast intelligence companion. Transform hours of listening into{" "}
                <span className="text-primary font-semibold">actionable insights</span> anywhere in the world.
              </p>

              {/* Feature List */}
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 mt-1">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-lg mb-1">AI-Powered Summaries</h3>
                    <p className="text-muted-foreground">Advanced AI generates concise summaries with key takeaways in under 10 seconds.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 mt-1">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-lg mb-1">Seamless Notion Integration</h3>
                    <p className="text-muted-foreground">Automatically sync summaries to your Notion workspace in organized tables.</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/sign-up" prefetch="viewport">
              <Button  variant="hero" size="lg" className="group">
                🚀 Start summarising!
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              </Link>
            </div>

              {/* <div className="flex gap-2 justify-center sm:justify-start">
                <Button variant="outline" size="sm" asChild>
                  <Link
                    to="https://github.com/ObaidUr-Rahmaan/kaizen"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ⭐️ Star on GitHub
                  </Link>
                </Button>

                <Button variant="outline" size="sm" asChild>
                  <Link
                    to="https://blueprint.codeandcreed.tech/building-with-kaizen/kaizen"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Go to Docs
                  </Link>
                </Button>
              </div> */}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const IntegrationCard = memo(({
  children,
  className,
  borderClassName,
}: {
  children: React.ReactNode;
  className?: string;
  borderClassName?: string;
}) => {
  return (
    <div
      className={cn(
        "bg-background relative flex size-20 rounded-xl dark:bg-transparent",
        className
      )}
    >
      <div
        role="presentation"
        className={cn(
          "absolute inset-0 rounded-xl border border-black/20 dark:border-white/25",
          borderClassName
        )}
      />
      <div className="relative z-20 m-auto size-fit *:size-8">{children}</div>
    </div>
  );
});
