import { isFeatureEnabled, isServiceEnabled } from "../../config";
import AboutUs1 from "~/components/mvpblocks/about-us-1";
import CoreFeaturesSection from "~/components/homepage/core-features";
import FooterGlow from "~/components/mvpblocks/footer-glow";
import Integrations from "~/components/homepage/integrations";
import Pricing from "~/components/homepage/pricing";
import FAQ from "~/components/homepage/faq";
import RadialOrbitalTimeline from "~/components/ui/radial-orbital-timeline";
import DemoSection from "~/components/homepage/demo-section";
import { PulseBeamsSection } from "~/components/homepage/pulse-beams-section";
import { api } from "../../convex/_generated/api";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  const title = "Podclip - AI-Powered Podcast Summaries";
  const description =
    "Transform your podcast listening experience with AI-generated summaries and key takeaways. Save time and never miss important insights from your favorite shows.";
  const keywords = "podcast summaries, AI summaries, podcast player, key takeaways, audio summaries, podcast insights";
  const siteUrl = "https://podclip.tech";
  const imageUrl = "/podclip.png"; // Update with your podcast app logo

  return [
    { title },
    {
      name: "description",
      content: description,
    },

    // Open Graph / Facebook
    { property: "og:type", content: "website" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: imageUrl },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:url", content: siteUrl },
    { property: "og:site_name", content: "Podclip" },

    // Twitter Card
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    {
      name: "twitter:description",
      content: description,
    },
    { name: "twitter:image", content: imageUrl },
    {
      name: "keywords",
      content: keywords,
    },
    { name: "author", content: "Podclip" },
    { name: "favicon", content: imageUrl },
  ];
}

export async function loader(args: Route.LoaderArgs) {
  const authEnabled = isFeatureEnabled("auth") && isServiceEnabled("clerk");
  const convexEnabled = isFeatureEnabled("convex") && isServiceEnabled("convex");
  const paymentsEnabled = isFeatureEnabled("payments") && isServiceEnabled("polar");

  // 1. Auth: get userId if auth enabled, else null
  let userId: string | null = null;
  if (authEnabled) {
    const { getAuth } = await import("@clerk/react-router/ssr.server");
    ({ userId } = await getAuth(args));
  }

  // 2. Fetch subscription status & plans only if Convex enabled
  let subscriptionData: { hasActiveSubscription: boolean } | null = null;
  let plans: any = null;

  if (convexEnabled) {
    const { fetchQuery, fetchAction } = await import("convex/nextjs");

    const promises: Promise<any>[] = [
      userId
        ? fetchQuery(api.subscriptions.checkUserSubscriptionStatus, {
            userId,
          }).catch((error: unknown) => {
            console.error("Failed to fetch subscription data:", error);
            return null;
          })
        : Promise.resolve(null),
    ];

    // Only fetch plans if payments are enabled
    if (paymentsEnabled) {
      promises.push(
        fetchAction(api.subscriptions.getAvailablePlans).catch((error: unknown) => {
          console.error("Failed to fetch plans:", error);
          return null;
        })
      );
    } else {
      promises.push(Promise.resolve(null));
    }

    [subscriptionData, plans] = await Promise.all(promises);
  }

  return {
    isSignedIn: !!userId,
    hasActiveSubscription: subscriptionData?.hasActiveSubscription || false,
    plans,
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <Integrations loaderData={loaderData} />
      <DemoSection />
      <AboutUs1 />
      <RadialOrbitalTimeline />
      <CoreFeaturesSection />
      <Pricing loaderData={loaderData} />
      <FAQ />
      <PulseBeamsSection />
      <FooterGlow />
    </>
  );
}
