"use client";
import { UserButton } from "@clerk/react-router";
import { Menu, X } from "lucide-react";
import React, { useCallback, useState } from "react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { config, isFeatureEnabled } from "../../../config";

const getMenuItems = () => {
  const items = [
  { name: "Home", href: "#hero" },
  { name: "Features", href: "#features" },
  { name: "Demo", href: "/demo" },
  ];

  // Only show pricing if payments are enabled
  if (isFeatureEnabled('payments') && config.ui.showPricing) {
    items.push({ name: "Pricing", href: "#pricing" });
  }

  return items;
};

export const Navbar = ({
  loaderData,
}: {
  loaderData?: { isSignedIn: boolean; hasActiveSubscription: boolean };
}) => {
  const [menuState, setMenuState] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const menuItems = getMenuItems();

  React.useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const scrolled = scrollY > 20;
      setIsScrolled(scrolled);
    };
    
    // Set initial scroll state
    handleScroll();
    
    // Add multiple event listeners for better compatibility
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("scroll", handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleNavClick = useCallback((href: string) => {
    if (href.startsWith("#")) {
      // Add a small delay to ensure DOM is ready
      setTimeout(() => {
        const element = document.querySelector(href);
        if (element) {
          console.log(`Scrolling to element: ${href}`);
          element.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        } else {
          // Fallback: try to find element by ID without the #
          const elementById = document.getElementById(href.substring(1));
          if (elementById) {
            console.log(`Scrolling to element by ID: ${href.substring(1)}`);
            elementById.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          } else {
            console.warn(`Element not found: ${href}`);
          }
        }
      }, 100);
    } else {
      // For regular links, navigate using the router
      window.location.href = href;
    }
    setMenuState(false); // Close mobile menu
  }, []);

  const handleDashboardClick = useCallback(() => {
    setIsDashboardLoading(true);
  }, []);

  // Simple computations don't need useMemo
  const authEnabled = isFeatureEnabled('auth') && config.ui.showAuth;
  
  const dashboardLink = !authEnabled 
    ? "/dashboard" 
    : !loaderData?.isSignedIn 
    ? "/sign-up" 
    : "/dashboard"; // Always allow signed-in users to access dashboard (freemium model)

  const dashboardText = "Dashboard";

  return (
    <header>
      <nav
        data-state={menuState && "active"}
        className="fixed z-50 w-full px-2"
      >
        <div
          className={cn(
            "mx-auto mt-2 max-w-6xl px-6 transition-all duration-300 lg:px-12",
            isScrolled &&
              "bg-background/50 max-w-4xl rounded-2xl border backdrop-blur-lg lg:px-5 shadow-lg"
          )}
        >
          {/* Temporary debug indicator */}
          {/* <div className="absolute top-0 left-0 bg-red-500 text-white px-2 py-1 text-xs z-10">
            Debug: {isScrolled ? 'SCROLLED' : 'NOT SCROLLED'}
          </div> */}
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
            <div className="flex w-full justify-between lg:w-auto">
              <Link
                to="/"
                aria-label="home"
                className="flex items-center space-x-2 font-semibold text-2xl text-muted-foreground"
                prefetch="viewport"
              >
                <div className="color:black font-bold">Podclip</div>
                {/* <img src="/kaizen-no-bg.png" alt="Kaizen Logo" className="w-18 h-18" /> */}
              </Link>

              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState == true ? "Close Menu" : "Open Menu"}
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
              >
                <Menu className="in-data-[state=active]:rotate-180 in-data-[state=active]:scale-0 in-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                <X className="in-data-[state=active]:rotate-0 in-data-[state=active]:scale-100 in-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
              </button>
            </div>

            <div className="absolute inset-0 m-auto hidden size-fit lg:block">
              <ul className="flex gap-8 text-base">
                {menuItems.map((item, index) => (
                  <li key={index}>
                    <div
                      onClick={() => handleNavClick(item.href)}
                      className="hover:cursor-pointer text-muted-foreground block duration-150 transition-colors"
                    >
                      <span>{item.name}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-background in-data-[state=active]:block lg:in-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border p-6 shadow-2xl shadow-zinc-300/20 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent">
              <div className="lg:hidden">
                <ul className="space-y-6 text-lg">
                  {menuItems.map((item, index) => (
                    <li key={index}>
                      <button
                        onClick={() => handleNavClick(item.href)}
                        className="text-muted-foreground hover:cursor-pointer  block duration-150 transition-colors w-full text-left"
                      >
                        <span>{item.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                {authEnabled && loaderData?.isSignedIn ? (
                  <div className="flex items-center gap-3">
                    <Button 
                      asChild 
                      size="sm" 
                      loading={isDashboardLoading}
                      onClick={handleDashboardClick}
                      className="min-w-[90px]"
                    >
                      <Link to={dashboardLink} prefetch="viewport">
                        <span>{dashboardText}</span>
                      </Link>
                    </Button>
                    <UserButton />
                  </div>
                ) : authEnabled ? (
                  <>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className={cn(isScrolled && "lg:hidden")}
                    >
                      <Link to="/sign-in" prefetch="viewport">
                        <span>Login</span>
                      </Link>
                    </Button>
                    <Button
                      asChild
                      size="sm"
                      className={cn(isScrolled && "lg:hidden")}
                    >
                      <Link to="/sign-up" prefetch="viewport">
                        <span>Sign Up</span>
                      </Link>
                    </Button>
                    <Button
                      asChild
                      size="sm"
                      className={cn(isScrolled ? "lg:inline-flex" : "hidden", "min-w-[90px]")}
                      loading={isDashboardLoading}
                      onClick={handleDashboardClick}
                    >
                      <Link to={dashboardLink} prefetch="viewport">
                        <span>{dashboardText}</span>
                      </Link>
                    </Button>
                  </>
                ) : (
                  // When auth is disabled, show a simple get started button
                  <Button
                    asChild
                    size="sm"
                    loading={isDashboardLoading}
                    onClick={handleDashboardClick}
                    className="min-w-[90px]"
                  >
                    <Link to={dashboardLink} prefetch="viewport">
                      <span>{dashboardText}</span>
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};
