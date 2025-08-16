import { memo, useState, useCallback } from "react";
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
  const [isHeroLoading, setIsHeroLoading] = useState(false);

  const handleHeroClick = useCallback(() => {
    setIsHeroLoading(true);
  }, []);
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
        <div className="mx-auto max-w-5xl px-4 md:px-6 lg:px-8 mt-[1.5rem] md:mt-[2rem]">
          <div className="grid items-center md:grid-cols-2 gap-6 lg:gap-8">
            <div className="dark:bg-muted/50 relative mx-auto w-fit order-2 md:order-1">
              
              {/* Brain Icon Illustration */}
              <div className="relative w-40 md:w-44 lg:w-48 h-40 md:h-44 lg:h-48 mx-auto">
                {/* Central Brain */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-28 md:w-30 lg:w-32 h-28 md:h-30 lg:h-32 bg-purple-200/30 dark:bg-purple-900/20 rounded-full flex items-center justify-center border-2 border-purple-300/50 dark:border-purple-700/50">
                    <Brain className="w-12 md:w-14 lg:w-16 h-12 md:h-14 lg:h-16 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                
                {/* Top Right - Database */}
                <div className="absolute -top-3 md:-top-4 -right-3 md:-right-4 w-12 md:w-14 lg:w-16 h-12 md:h-14 lg:h-16 bg-blue-200/30 dark:bg-blue-900/20 rounded-full flex items-center justify-center border-2 border-blue-300/50 dark:border-blue-700/50">
                  <Database className="w-6 md:w-7 lg:w-8 h-6 md:h-7 lg:h-8 text-blue-500 dark:text-blue-400" />
                </div>
                
                {/* Bottom Left - Lightning */}
                <div className="absolute -bottom-4 md:-bottom-5 lg:-bottom-6 -left-4 md:-left-5 lg:-left-6 w-12 md:w-14 lg:w-16 h-12 md:h-14 lg:h-16 bg-green-200/30 dark:bg-green-900/20 rounded-full flex items-center justify-center border-2 border-green-300/50 dark:border-green-700/50">
                  <Zap className="w-6 md:w-7 lg:w-8 h-6 md:h-7 lg:h-8 text-green-500 dark:text-green-400" />
                </div>
                
                {/* Mid Left - Users */}
                <div className="absolute top-6 md:top-7 lg:top-8 -left-8 md:-left-10 lg:-left-12 w-10 md:w-12 lg:w-14 h-10 md:h-12 lg:h-14 bg-purple-200/30 dark:bg-purple-900/20 rounded-full flex items-center justify-center border-2 border-purple-300/50 dark:border-purple-700/50">
                  <Users className="w-5 md:w-6 lg:w-7 h-5 md:h-6 lg:h-7 text-purple-500 dark:text-purple-400" />
                </div>
              </div>
            </div>
            <div className="mx-auto mt-4 md:mt-6 max-w-2xl space-y-4 md:space-y-6 text-center md:text-left order-1 md:order-2">
              <h2 className="text-balance text-2xl md:text-3xl lg:text-4xl font-semibold">
                Podclip
              </h2>
              <p className="text-muted-foreground text-lg md:text-xl lg:text-2xl leading-relaxed">
                Your podcast intelligence companion. Transform hours of listening into{" "}
                <span className="text-primary font-semibold">actionable insights</span> anywhere in the world.
              </p>

              {/* Feature List */}
              <div className="space-y-4 md:space-y-6">
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="w-7 md:w-8 h-7 md:h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-xs md:text-sm flex-shrink-0 mt-1">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-base md:text-lg mb-1">AI-Powered Summaries</h3>
                    <p className="text-muted-foreground text-sm md:text-base">Advanced AI generates concise summaries with key takeaways in under 10 seconds.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 md:gap-4">
                  <div className="w-7 md:w-8 h-7 md:h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-xs md:text-sm flex-shrink-0 mt-1">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-base md:text-lg mb-1 flex items-center gap-2">
                      Seamless Notion Integration
                      <span className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-full">Coming Soon</span>
                    </h3>
                    <p className="text-muted-foreground text-sm md:text-base">Automatically sync summaries to your Notion workspace in organized tables. This feature will be added in the future.</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                asChild 
                variant="hero" 
                size="lg" 
                className="group px-12 py-6 text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105" 
                loading={isHeroLoading} 
                onClick={handleHeroClick}
              >
                <Link to="/sign-up" prefetch="viewport">
                  🚀 Start For Free!
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <div className="text-center sm:text-left">
                <p className="text-sm text-muted-foreground font-medium">
                  ✨ Get your first 5 summaries absolutely free!
                </p>
              </div>
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
