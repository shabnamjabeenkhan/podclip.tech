# Rule: Generating a Product Requirements Document (PRD)

## Goal
To guide an AI assistant in creating a detailed Product Requirements Document (PRD) in Markdown format, based on an initial user prompt. The PRD should be clear, actionable, and suitable for a junior developer to understand and implement the feature.

## Process
1. **Receive Initial Prompt**: The user provides a brief description or request for a new feature or functionality.
2. **Ask Clarifying Questions**: Before writing the PRD, the AI must ask only the most essential clarifying questions needed to write a clear PRD. Limit questions to 3-5 critical gaps in understanding. The goal is to understand the "what" and "why" of the feature, not necessarily the "how" (which the developer will figure out). Make sure to provide options in letter/number lists so I can respond easily with my selections.
3. **Generate PRD**: Based on the initial prompt and the user's answers to the clarifying questions, generate a PRD using the structure outlined below.
4. **Save PRD**: Save the generated document as `prd-[feature-name].md` inside the `/docs` directory.

## Clarifying Questions (Guidelines)
Ask only the most critical questions needed to write a clear PRD. Focus on areas where the initial prompt is ambiguous or missing essential context. Common areas that may need clarification:

- **Problem/Goal**: If unclear - "What problem does this feature solve for the user?"
- **Core Functionality**: If vague - "What are the key actions a user should be able to perform?"
- **Scope/Boundaries**: If broad - "Are there any specific things this feature should not do?"
- **Success Criteria**: If unstated - "How will we know when this feature is successfully implemented?"

**Important**: Only ask questions when the answer isn't reasonably inferable from the initial prompt. Prioritize questions that would significantly impact the PRD's clarity.

### Formatting Requirements
- Number all questions (1, 2, 3, etc.)
- List options for each question as A, B, C, D, etc. for easy reference
- Make it simple for the user to respond with selections like "1A, 2C, 3B"

### Example Format
```
1. What is the primary goal of this feature?
   A. Improve user onboarding experience
   B. Increase user retention
   C. Reduce support burden
   D. Generate additional revenue

2. Who is the target user for this feature?
   A. New users only
   B. Existing users only
   C. All users
   D. Admin users only

3. What is the expected timeline for this feature?
   A. Urgent (1-2 weeks)
   B. High priority (3-4 weeks)
   C. Standard (1-2 months)
   D. Future consideration (3+ months)
```

## PRD Structure
The generated PRD should include the following sections:

1. **Introduction/Overview**: Briefly describe the feature and the problem it solves. State the goal.
2. **Goals**: List the specific, measurable objectives for this feature.
3. **User Stories**: Detail the user narratives describing feature usage and benefits.
4. **Functional Requirements**: List the specific functionalities the feature must have. Use clear, concise language (e.g., "The system must allow users to upload a profile picture."). Number these requirements.
5. **Non-Goals (Out of Scope)**: Clearly state what this feature will not include to manage scope.
6. **Design Considerations (Optional)**: Link to mockups, describe UI/UX requirements, or mention relevant components/styles if applicable.
7. **Technical Considerations**: Mention any known technical constraints, dependencies, or suggestions specific to Kaizen's stack (see Tech Stack section below).
8. **Success Metrics**: How will the success of this feature be measured? (e.g., "Increase user engagement by 10%", "Reduce support tickets related to X").
9. **Open Questions**: List any remaining questions or areas needing further clarification.

## Kaizen Tech Stack (Technical Considerations)
When writing technical considerations, reference Kaizen's stack:

### Frontend
- **React Router v7** - Full-stack React framework with SSR
- **TypeScript** - Type safety throughout
- **TailwindCSS v4** - Utility-first CSS framework
- **shadcn/ui** - Component library built on Radix UI
- **Route Configuration** - Use `app/routes.ts` for route definitions
- **Type Generation** - Run `npm run typecheck` after adding routes
- **Route Types** - Always import from `./+types/[routeName]` (never use relative paths)

### Backend & Services
- **Convex** - Real-time database and serverless functions
  - Use `actions` for external API calls
  - Use `mutations` for database writes
  - Use `queries` for database reads
  - Store schema in `convex/schema.ts`
- **Clerk** - Authentication and user management
  - Use `@clerk/react-router` hooks (`useAuth`, etc.)
  - User data synced to Convex `users` table
- **Polar.sh** - Subscription billing and payments
  - Webhooks update subscription status in Convex
  - Check subscription via `api.users.getUserQuota`
- **Resend** - Email notifications (via Convex)
  - Use `@convex-dev/resend` package
- **AI Services**:
  - **OpenAI** - Primary AI provider (`@ai-sdk/openai`)
  - **Google Gemini** - Alternative (`@google/generative-ai`)
  - **Deepgram** - Audio transcription (`@deepgram/sdk`)

### External APIs
- **Listen Notes API** - Podcast/episode data
- **Notion API** - Export functionality (`@notionhq/client`)

### Development & Deployment
- **Vite** - Build tool
- **Vercel** - Deployment platform
- **TypeScript** - Type checking

### Common Patterns
- **Data Loading**: Use React Router `loader` functions for server-side data fetching
- **Form Handling**: Use React Router `action` functions with `<Form>` component
- **Type Safety**: Always use generated route types from `./+types/[routeName]`
- **URL Generation**: Use `href()` helper for type-safe route generation
- **Error Handling**: Errors bubble to `ErrorBoundary` in `root.tsx`
- **Quota Management**: Check user quota before allowing actions (search, summary generation)

### File Organization
- Routes: `app/routes/`
- Components: `app/components/`
- Convex functions: `convex/`
- Types: Auto-generated in `./+types/` relative to each route
- Documentation: `docs/`

## Target Audience
Assume the primary reader of the PRD is a junior developer. Therefore, requirements should be explicit, unambiguous, and avoid jargon where possible. Provide enough detail for them to understand the feature's purpose and core logic.

## Output
- **Format**: Markdown (.md)
- **Location**: `/docs/`
- **Filename**: `prd-[feature-name].md`

## Final Instructions
- **Do NOT** start implementing the PRD
- **Make sure** to ask the user clarifying questions first
- **Take** the user's answers to the clarifying questions and improve the PRD
- **Reference** Kaizen's tech stack when writing technical considerations
- **Consider** existing patterns and conventions in the codebase
- **Specify** which Convex functions/actions/mutations/queries are needed
- **Mention** any new routes that need to be added to `app/routes.ts`
- **Note** any UI components that should be reused from `app/components/ui/`
- **Indicate** if authentication/subscription checks are required
