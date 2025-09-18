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
import { ArrowRight } from "lucide-react";
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
    <section id="hero" className="relative w-full">
      <Navbar loaderData={loaderData} />
      
      <Spotlight
        gradientFirst="radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(336, 100%, 50%, 0.08) 0, hsla(341, 100%, 55%, 0.04) 50%, hsla(336, 100%, 45%, 0) 80%)"
        gradientSecond="radial-gradient(50% 50% at 50% 50%, hsla(333, 100%, 85%, 0.08) 0, hsla(335, 100%, 55%, 0.04) 80%, transparent 100%)"
        gradientThird="radial-gradient(50% 50% at 50% 50%, hsla(332, 100%, 85%, 0.06) 0, hsla(327, 100%, 85%, 0.06) 80%, transparent 100%)"
      />
      
      
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background pointer-events-none" />
      
      {/* Main hero content */}
      <main className="relative pb-16 pt-32 sm:pb-24 sm:pt-40 md:pb-32 md:pt-48 lg:pt-32 xl:pt-40 pointer-events-auto w-full overflow-x-hidden">
        <div className="mx-auto max-w-none sm:max-w-6xl px-3 sm:px-4 md:px-6 w-full">
          {/* Hero Title */}
          <div className="text-center mb-6 sm:mb-8 md:mb-8 w-full">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-white mb-3 sm:mb-4 md:mb-6 leading-[0.9] px-2 sm:px-0 max-w-full word-wrap break-words">
              <span className="block">Zero in on What Matters:</span>
              <span className="block">Turn Podcast Hours into</span>
              <span className="block">Business Breakthroughs</span>
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
              <p className="text-sm sm:text-base md:text-lg font-medium text-muted-foreground px-4 sm:px-2 md:px-0">
                ✨ Get your first 5 summaries absolutely free!
              </p>
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
