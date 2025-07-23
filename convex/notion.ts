import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

// Store Notion connection information
export const storeNotionConnection = mutation({
  args: {
    userId: v.string(),
    accessToken: v.string(),
    botId: v.string(),
    workspaceName: v.optional(v.string()),
    workspaceId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already has a Notion connection
    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.userId))
      .first();

    if (existing) {
      // Update existing user with Notion token
      await ctx.db.patch(existing._id, {
        notion_token: args.accessToken,
        notion_workspace_id: args.workspaceId,
        notion_workspace_name: args.workspaceName,
      });
    } else {
      // This shouldn't happen as users should exist, but handle gracefully
      throw new Error("User not found");
    }

    console.log(`Stored Notion connection for user ${args.userId}`);
  },
});

// Get user's Notion connection status
export const getNotionConnection = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.userId))
      .first();

    if (!user) {
      return { connected: false };
    }

    return {
      connected: !!user.notion_token,
      workspaceName: user.notion_workspace_name,
      workspaceId: user.notion_workspace_id,
    };
  },
});

// Remove Notion connection
export const removeNotionConnection = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.userId))
      .first();

    if (user) {
      await ctx.db.patch(user._id, {
        notion_token: undefined,
        notion_workspace_id: undefined,
        notion_workspace_name: undefined,
      });
    }
  },
});

// Export summary to Notion
export const exportToNotion = action({
  args: {
    userId: v.string(),
    summaryData: v.object({
      episodeTitle: v.string(),
      summary: v.string(),
      takeaways: v.array(v.string()),
    }),
    pageId: v.optional(v.string()), // Optional specific page to export to
    databaseId: v.optional(v.string()), // Optional specific database to export to
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    notionUrl?: string;
    pageId?: string;
  }> => {
    // Get user's Notion token
    const user = await ctx.runQuery(api.users.findUserByToken, {
      tokenIdentifier: args.userId,
    });

    if (!user?.notion_token) {
      throw new Error("Notion not connected. Please connect your Notion account first.");
    }

    // Use the provided summary data directly
    const summary = {
      episode_title: args.summaryData.episodeTitle,
      content: args.summaryData.summary,
      takeaways: args.summaryData.takeaways,
    };

    const { Client } = require("@notionhq/client");
    const notion: any = new Client({ auth: user.notion_token });

    try {
      // If no specific page/database is provided, create in the root workspace
      let pageId = args.pageId;
      
      if (!pageId && !args.databaseId) {
        // Create a new page in the workspace
        const page: any = await notion.pages.create({
          parent: {
            type: "workspace",
            workspace: true,
          },
          properties: {
            title: {
              title: [
                {
                  text: {
                    content: `📻 ${summary.episode_title || "Podcast Summary"}`,
                  },
                },
              ],
            },
          },
          children: [
            {
              object: "block",
              type: "heading_2",
              heading_2: {
                rich_text: [
                  {
                    text: {
                      content: "AI-Generated Summary",
                    },
                  },
                ],
              },
            },
            {
              object: "block",
              type: "paragraph",
              paragraph: {
                rich_text: [
                  {
                    text: {
                      content: summary.content,
                    },
                  },
                ],
              },
            },
            {
              object: "block",
              type: "heading_3",
              heading_3: {
                rich_text: [
                  {
                    text: {
                      content: "Key Takeaways",
                    },
                  },
                ],
              },
            },
            ...summary.takeaways.map((takeaway: string) => ({
              object: "block",
              type: "bulleted_list_item",
              bulleted_list_item: {
                rich_text: [
                  {
                    text: {
                      content: takeaway,
                    },
                  },
                ],
              },
            })),
            {
              object: "block",
              type: "divider",
              divider: {},
            },
            {
              object: "block",
              type: "paragraph",
              paragraph: {
                rich_text: [
                  {
                    text: {
                      content: `Exported from PodClip on ${new Date().toLocaleDateString()}`,
                    },
                    annotations: {
                      italic: true,
                      color: "gray",
                    },
                  },
                ],
              },
            },
          ],
        });
        
        return {
          success: true,
          notionUrl: page.url,
          pageId: page.id,
        };
      } else if (args.databaseId) {
        // Export to a specific database
        const page: any = await notion.pages.create({
          parent: {
            type: "database_id",
            database_id: args.databaseId,
          },
          properties: {
            Name: {
              title: [
                {
                  text: {
                    content: `📻 ${summary.episode_title || "Podcast Summary"}`,
                  },
                },
              ],
            },
            Summary: {
              rich_text: [
                {
                  text: {
                    content: summary.content,
                  },
                },
              ],
            },
            "Export Date": {
              date: {
                start: new Date().toISOString().split('T')[0],
              },
            },
          },
          children: [
            {
              object: "block",
              type: "heading_3",
              heading_3: {
                rich_text: [
                  {
                    text: {
                      content: "Key Takeaways",
                    },
                  },
                ],
              },
            },
            ...summary.takeaways.map((takeaway: string) => ({
              object: "block",
              type: "bulleted_list_item",
              bulleted_list_item: {
                rich_text: [
                  {
                    text: {
                      content: takeaway,
                    },
                  },
                ],
              },
            })),
          ],
        });
        
        return {
          success: true,
          notionUrl: page.url,
          pageId: page.id,
        };
      } else {
        // Append to existing page
        await notion.blocks.children.append({
          block_id: pageId!,
          children: [
            {
              object: "block",
              type: "divider",
              divider: {},
            },
            {
              object: "block",
              type: "heading_2",
              heading_2: {
                rich_text: [
                  {
                    text: {
                      content: `📻 ${summary.episode_title || "Podcast Summary"}`,
                    },
                  },
                ],
              },
            },
            {
              object: "block",
              type: "paragraph",
              paragraph: {
                rich_text: [
                  {
                    text: {
                      content: summary.content,
                    },
                  },
                ],
              },
            },
            {
              object: "block",
              type: "heading_3",
              heading_3: {
                rich_text: [
                  {
                    text: {
                      content: "Key Takeaways",
                    },
                  },
                ],
              },
            },
            ...summary.takeaways.map((takeaway: string) => ({
              object: "block",
              type: "bulleted_list_item",
              bulleted_list_item: {
                rich_text: [
                  {
                    text: {
                      content: takeaway,
                    },
                  },
                ],
              },
            })),
          ],
        });
        
        return {
          success: true,
          pageId: pageId,
        };
      }
    } catch (error: any) {
      console.error("Notion export error:", error);
      throw new Error(`Failed to export to Notion: ${error.message}`);
    }
  },
});

// Get user's Notion pages/databases for selection
export const getNotionWorkspaces = action({
  args: { userId: v.string() },
  handler: async (ctx, args): Promise<{
    pages: Array<{ id: string; title: string; url: string }>;
    databases: Array<{ id: string; title: string; url: string }>;
  }> => {
    // Get user's Notion token
    const user = await ctx.runQuery(api.users.findUserByToken, {
      tokenIdentifier: args.userId,
    });

    if (!user?.notion_token) {
      throw new Error("Notion not connected");
    }

    const { Client } = require("@notionhq/client");
    const notion: any = new Client({ auth: user.notion_token });

    try {
      // Get accessible pages
      const pages: any = await notion.search({
        filter: {
          value: "page",
          property: "object",
        },
        page_size: 20,
      });

      // Get accessible databases
      const databases: any = await notion.search({
        filter: {
          value: "database",
          property: "object",
        },
        page_size: 20,
      });

      return {
        pages: pages.results.map((page: any) => ({
          id: page.id,
          title: page.properties?.title?.title?.[0]?.plain_text || "Untitled",
          url: page.url,
        })),
        databases: databases.results.map((db: any) => ({
          id: db.id,
          title: db.title?.[0]?.plain_text || "Untitled Database",
          url: db.url,
        })),
      };
    } catch (error: any) {
      console.error("Failed to fetch Notion workspaces:", error);
      throw new Error("Failed to fetch Notion pages and databases");
    }
  },
});