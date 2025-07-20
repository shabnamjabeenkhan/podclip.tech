import { isServiceEnabled, getServiceConfig } from "../../config";

export async function createOpenStatusMonitor(config: {
  name: string;
  url: string;
  description?: string;
}) {
  if (!isServiceEnabled("openstatus")) return;
  
  const openStatusConfig = getServiceConfig("openstatus");
  if (!openStatusConfig?.apiKey) {
    console.warn("OpenStatus API key not configured");
    return;
  }
  
  try {
    const response = await fetch(`https://api.openstatus.dev/v1/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-openstatus-key": openStatusConfig.apiKey,
      },
      body: JSON.stringify({
        name: config.name,
        url: config.url,
        description: config.description || `Monitor for ${config.name}`,
        regions: ["us-east-1", "eu-west-1"], // Multi-region monitoring
        interval: 60000, // 1 minute intervals
      }),
    });
    
    if (!response.ok) {
      throw new Error(`OpenStatus API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Failed to create OpenStatus monitor:", error);
    // Note: Frontend errors will be captured by Sentry if enabled
    // Convex backend errors use built-in exception reporting
  }
}

// Health check endpoint for monitoring
export async function healthCheck() {
  return {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "unknown",
  };
}