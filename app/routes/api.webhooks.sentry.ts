import type { ActionFunctionArgs } from "react-router";
import { createOpenStatusMonitor } from "../lib/openstatus";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    throw new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { 
        status: 405,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
  
  const payload = await request.json();
  
  // Verify Sentry webhook signature (recommended for production)
  // const signature = request.headers.get("sentry-hook-signature");
  // if (!verifySentrySignature(payload, signature)) {
  //   throw new Response(
  //     JSON.stringify({ error: "Invalid signature" }),
  //     { 
  //       status: 401,
  //       headers: { "Content-Type": "application/json" }
  //     }
  //   );
  // }
  
  // Create incident in OpenStatus based on Sentry alert
  if (payload.action === "triggered") {
    await createOpenStatusMonitor({
      name: `Sentry Alert: ${payload.data.issue.title}`,
      url: payload.data.issue.permalink,
      description: `Error: ${payload.data.issue.culprit}`,
    });
  }
  
  return { success: true };
}