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
import Orb from "~/components/ui/orb";
import ShinyText from "~/components/ShinyText";
import { Spotlight } from "~/components/ui/spotlight";

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
    <section id="hero" className="relative w-full overflow-x-hidden">
      <Navbar loaderData={loaderData} />
      
      <Spotlight
        gradientFirst="radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(336, 100%, 50%, 0.08) 0, hsla(341, 100%, 55%, 0.04) 50%, hsla(336, 100%, 45%, 0) 80%)"
        gradientSecond="radial-gradient(50% 50% at 50% 50%, hsla(333, 100%, 85%, 0.08) 0, hsla(335, 100%, 55%, 0.04) 80%, transparent 100%)"
        gradientThird="radial-gradient(50% 50% at 50% 50%, hsla(332, 100%, 85%, 0.06) 0, hsla(327, 100%, 85%, 0.06) 80%, transparent 100%)"
      />
      
      {/* Animated Orb Background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div className="w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] md:w-[600px] md:h-[600px] lg:w-[800px] lg:h-[800px] xl:w-[1000px] xl:h-[1000px] opacity-30 sm:opacity-40 md:opacity-50 lg:opacity-60">
          <Orb
            hue={270}
            hoverIntensity={0.3}
            rotateOnHover={true}
            forceHoverState={false}
          />
        </div>
      </div>
      
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background pointer-events-none" />
      
      {/* Main hero content */}
      <main className="relative pb-16 pt-20 sm:pb-24 sm:pt-28 md:pb-32 md:pt-32 lg:pt-20 pointer-events-auto w-full overflow-x-hidden">
        <div className="mx-auto max-w-none sm:max-w-6xl px-3 sm:px-4 md:px-6 w-full">
          {/* Hero Title */}
          <div className="text-center mb-6 sm:mb-8 md:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight text-white mb-3 sm:mb-4 md:mb-6 leading-tight px-2 sm:px-0">
              Transform Podcasts into <br className="hidden sm:block" />
              <span className="block sm:inline">Actionable Insights</span>
            </h1>
            <p className="mx-auto mb-4 sm:mb-6 md:mb-8 mt-3 sm:mt-4 md:mt-6 max-w-lg sm:max-w-xl text-sm sm:text-base md:text-lg text-muted-foreground px-4 sm:px-2 md:px-0">
              Turn podcasts into clear summaries with jump-to timestamps, key takeaways, and business actionable insights—delivered instantly.
            </p>
            
            {/* CTA Button with enhanced styling */}
            <div className="mx-auto w-fit rounded-[calc(var(--radius)+4px)] border border-gray-950/5 p-1 dark:border-white/5 dark:bg-white/5 dark:shadow-lg dark:shadow-white/5 px-2 sm:px-4 md:px-0">
              <Button
                asChild
                size="lg"
                className="group px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4 text-sm sm:text-base md:text-lg font-semibold bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto"
                loading={isHeroLoading}
                onClick={handleHeroClick}
              >
                <Link to="/sign-up" prefetch="viewport" className="flex items-center justify-center">
                  <ShinyText text="Get Started For Free" speed={3} />
                  <ArrowRight className="ml-1 sm:ml-2 w-3 sm:w-4 md:w-5 h-3 sm:h-4 md:h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Social Proof */}
          <div className="mx-auto mt-6 sm:mt-8 md:mt-12 max-w-3xl">
            <div className="text-center mb-4 sm:mb-6">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground px-4 sm:px-2 md:px-0">
                ✨ Get your first 5 summaries absolutely free!
              </p>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="mx-auto mt-8 sm:mt-12 md:mt-16 max-w-none sm:max-w-4xl px-2 sm:px-0">
            <div className="grid gap-3 sm:gap-4 md:gap-6 md:grid-cols-2">
              {/* AI Summaries Card */}
              <div className="rounded-lg sm:rounded-xl border border-white/20 bg-white/10 backdrop-blur-md p-3 sm:p-4 md:p-6 shadow-lg hover:shadow-xl transition-all hover:bg-white/15">
                <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    <Brain className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-white text-sm sm:text-base md:text-lg mb-1 sm:mb-2">AI-Powered Summaries</h3>
                    <p className="text-white/80 text-xs sm:text-sm md:text-base leading-relaxed">Turn podcasts into clear summaries with jump-to timestamps, key takeaways, and business actionable insights—delivered instantly.</p>
                  </div>
                </div>
              </div>

              {/* Notion Integration Card */}
              <div className="rounded-lg sm:rounded-xl border border-white/20 bg-white/10 backdrop-blur-md p-3 sm:p-4 md:p-6 shadow-lg hover:shadow-xl transition-all hover:bg-white/15">
                <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    <Database className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-white text-sm sm:text-base md:text-lg mb-1 sm:mb-2 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span>Notion Integration</span>
                      <span className="px-2 py-0.5 text-xs font-medium text-blue-200 bg-blue-600/30 backdrop-blur-sm rounded-full w-fit">Coming Soon</span>
                    </h3>
                    <p className="text-white/80 text-xs sm:text-sm md:text-base leading-relaxed">Automatically sync summaries to your Notion workspace in organized tables.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
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
