import type { LoaderFunctionArgs } from "react-router";
import { api } from "../../convex/_generated/api";
import { getAuth } from "@clerk/react-router/ssr.server";
import { ConvexHttpClient } from "convex/browser";

// Notion OAuth configuration
const NOTION_CLIENT_ID = process.env.NOTION_CLIENT_ID;
const NOTION_CLIENT_SECRET = process.env.NOTION_CLIENT_SECRET;
const REDIRECT_URI = `${process.env.FRONTEND_URL}/api/notion/oauth`;

const convexUrl = process.env.VITE_CONVEX_URL!;
const convex = new ConvexHttpClient(convexUrl);

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { userId } = await getAuth({ request });
    
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    // Handle OAuth errors
    if (error) {
      console.error("Notion OAuth error:", error);
      return new Response(
        `<html><body><script>
          window.close();
          window.opener && window.opener.postMessage({
            type: 'NOTION_OAUTH_ERROR',
            error: '${error}'
          }, '*');
        </script></body></html>`,
        {
          headers: { "Content-Type": "text/html" },
        }
      );
    }

    if (!code) {
      return new Response("Missing authorization code", { status: 400 });
    }

    // Exchange code for access token
    const tokenResponse = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${Buffer.from(`${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      return new Response("Failed to exchange authorization code", { status: 400 });
    }

    const tokenData = await tokenResponse.json();
    const { access_token, bot_id, workspace_name, workspace_id } = tokenData;

    // Store the Notion connection in Convex
    await convex.mutation(api.notion.storeNotionConnection, {
      userId,
      accessToken: access_token,
      botId: bot_id,
      workspaceName: workspace_name,
      workspaceId: workspace_id,
    });

    // Close the popup and notify the parent window
    return new Response(
      `<html><body><script>
        window.close();
        window.opener && window.opener.postMessage({
          type: 'NOTION_OAUTH_SUCCESS',
          workspaceName: '${workspace_name}'
        }, '*');
      </script></body></html>`,
      {
        headers: { "Content-Type": "text/html" },
      }
    );
  } catch (error) {
    console.error("Notion OAuth handler error:", error);
    return new Response(
      `<html><body><script>
        window.close();
        window.opener && window.opener.postMessage({
          type: 'NOTION_OAUTH_ERROR',
          error: 'Server error'
        }, '*');
      </script></body></html>`,
      {
        headers: { "Content-Type": "text/html" },
      }
    );
  }
}