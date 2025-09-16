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
    <section id="hero" className="relative">
      <Navbar loaderData={loaderData} />
      
      <Spotlight
        gradientFirst="radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(336, 100%, 50%, 0.08) 0, hsla(341, 100%, 55%, 0.04) 50%, hsla(336, 100%, 45%, 0) 80%)"
        gradientSecond="radial-gradient(50% 50% at 50% 50%, hsla(333, 100%, 85%, 0.08) 0, hsla(335, 100%, 55%, 0.04) 80%, transparent 100%)"
        gradientThird="radial-gradient(50% 50% at 50% 50%, hsla(332, 100%, 85%, 0.06) 0, hsla(327, 100%, 85%, 0.06) 80%, transparent 100%)"
      />
      
      {/* Animated Orb Background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[400px] h-[400px] sm:w-[500px] sm:h-[500px] md:w-[700px] md:h-[700px] lg:w-[900px] lg:h-[900px] xl:w-[1000px] xl:h-[1000px] opacity-40 sm:opacity-50 md:opacity-60">
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
      <main className="relative pb-20 pt-24 sm:pb-32 sm:pt-32 md:pb-40 md:pt-40 lg:pt-20 pointer-events-auto">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {/* Hero Title */}
          <div className="text-center mb-8 sm:mb-10 md:mb-8">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-4 sm:mb-6 leading-tight">
              Transform Podcasts into <br className="hidden sm:block" />
              <span className="block sm:inline">Actionable Insights</span>
            </h1>
            <p className="mx-auto mb-6 sm:mb-8 mt-4 sm:mt-6 max-w-xl text-base sm:text-lg text-muted-foreground px-4 sm:px-0">
              Turn podcasts into clear summaries with jump-to timestamps, key takeaways, and business actionable insights—delivered instantly.
            </p>
            
            {/* CTA Button with enhanced styling */}
            <div className="mx-auto w-fit rounded-[calc(var(--radius)+4px)] border border-gray-950/5 p-1 dark:border-white/5 dark:bg-white/5 dark:shadow-lg dark:shadow-white/5 px-4 sm:px-0">
              <Button
                asChild
                size="lg"
                className="group px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto"
                loading={isHeroLoading}
                onClick={handleHeroClick}
              >
                <Link to="/sign-up" prefetch="viewport" className="flex items-center justify-center">
                  <ShinyText text="Get Started For Free" speed={3} />
                  <ArrowRight className="ml-2 w-4 sm:w-5 h-4 sm:h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Social Proof */}
          <div className="mx-auto mt-8 sm:mt-12 max-w-3xl md:mt-20">
            <div className="text-center mb-6">
              <p className="text-sm font-medium text-muted-foreground px-4 sm:px-0">
                ✨ Get your first 5 summaries absolutely free!
              </p>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="mx-auto mt-12 sm:mt-16 max-w-4xl">
            <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
              {/* AI Summaries Card */}
              <div className="rounded-xl border border-white/20 bg-white/10 backdrop-blur-md p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all hover:bg-white/15">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    <Brain className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-base sm:text-lg mb-2">AI-Powered Summaries</h3>
                    <p className="text-white/80 text-sm sm:text-base">Turn podcasts into clear summaries with jump-to timestamps, key takeaways, and business actionable insights—delivered instantly.</p>
                  </div>
                </div>
              </div>

              {/* Notion Integration Card */}
              <div className="rounded-xl border border-white/20 bg-white/10 backdrop-blur-md p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all hover:bg-white/15">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    <Database className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-base sm:text-lg mb-2 flex flex-col sm:flex-row sm:items-center gap-2">
                      Notion Integration
                      <span className="px-2 py-1 text-xs font-medium text-blue-200 bg-blue-600/30 backdrop-blur-sm rounded-full w-fit">Coming Soon</span>
                    </h3>
                    <p className="text-white/80 text-sm sm:text-base">Automatically sync summaries to your Notion workspace in organized tables.</p>
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
