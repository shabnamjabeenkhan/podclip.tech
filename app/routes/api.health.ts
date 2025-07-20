import type { LoaderFunctionArgs } from "react-router";
import { healthCheck } from "../lib/openstatus";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const health = await healthCheck();
    return health;
  } catch (error) {
    console.error("Health check failed:", error);
    throw new Response(
      JSON.stringify({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Health check failed",
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}