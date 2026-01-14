# Rule: Debugging Issues

## Goal
To guide an AI assistant in debugging issues by analyzing problems thoroughly, identifying root causes, and proposing clean solutions.

## Process
1. **Receive Error Description**: The user provides an error description and relevant context
2. **Gather Context**: Collect all relevant debugging information (logs, screenshots, network requests, etc.)
3. **Analyze Root Causes**: Reflect on 5-7 different potential root causes
4. **Distill to Most Likely**: Narrow down to the 1-2 most likely sources of the issue
5. **Propose Solution**: Provide a simple and clean solution that fixes the bug without introducing messy code

## Required Context
When debugging, the user should provide maximum context. The more context provided, the better the agent can understand and fix the issue:

✅ **Jam.dev Replay** (Recommended) - Screen recordings with automatic console logs, network requests, and browser info
✅ **Screenshots** - Show the error visually
✅ **Server-side logs** - Backend errors, database queries, API responses
✅ **Client-side logs** - Browser console errors and warnings (add console.log statements if missing)
✅ **Network tab** - Failed requests, response payloads, status codes
✅ **Code snippets** - Relevant file sections around the error
✅ **Environment** - Dev vs production, OS, browser version
✅ **Convex data** - Use Convex MCP server to inspect database state, run functions, and check logs directly from Cursor. For custom component tables (e.g., betterAuth, resend) that MCP can't access, use CLI: `bunx convex data --component <componentName> <tableName>` (dev) or `bunx convex data --component <componentName> <tableName> --prod` (production)

## Debugging Prompt Template
Use this template when debugging:

```
I'm getting this error: [DESCRIBE ERROR]

Jam.dev replay: [PASTE JAM.DEV LINK]
(Or if not using Jam.dev, attach the following:)

[Screenshot of error]

Server-side logs:
[Paste backend/API logs]

Client-side logs:
[Paste browser console errors]
(If console logs are missing, add console.log statements to trace the issue)

Network tab:
[Paste failed requests and responses]

Relevant code in @[filename]

Context:
- When/where it occurs: [DESCRIBE]
- Which users affected: [DESCRIBE]
- Started when: [DESCRIBE]
- What changed recently: [DESCRIBE]
- Environment: [Local dev / Production]
```

**IMPORTANT: Use Convex MCP server to inspect database state and debug backend issues:**
- Call `mcp_convex_status` to get available deployments
- Call `mcp_convex_tables` to list all tables and their schemas
- Call `mcp_convex_data` to read table data (supports dev and prod deployments)
- Call `mcp_convex_logs` to check recent function execution logs
- Call `mcp_convex_functionSpec` to see available functions and their validators
- Call `mcp_convex_run` to test functions with specific arguments

**Example queries:**
- "Show me the users table" → reads table data
- "Check the last 10 log entries from production" → inspects logs
- "Run the sendEmail mutation with these params" → tests function
- "What environment variables are set in dev?" → checks env config

**Note:** For custom component tables (e.g., betterAuth, resend) that the MCP server can't access, use the CLI fallback:
- Dev: `bunx convex data --component <componentName> <tableName>`
- Production: `bunx convex data --component <componentName> <tableName> --prod`
  - Example: `bunx convex data --component betterAuth user` to view the user table in the betterAuth component

Analyse the problem thoroughly and reflect on 5-7 different potential root causes. From those, distill it down to the 1-2 most likely sources. Propose a simple and clean solution that fixes the bug without introducing messy code.

Refer to my @package.json to check which libraries are in use - this will help ensure your solution aligns with existing dependencies.

## Analysis Approach
**Multiple Root Cause Analysis**: Consider 5-7 different potential root causes:

1. **Configuration issues**
   - Environment variables missing or incorrect
   - Convex deployment configuration
   - Clerk authentication setup
   - API keys not set properly
2. **Data state problems**
   - Database schema mismatches
   - Missing required fields
   - Invalid data types
   - Convex query/mutation errors
3. **Code logic errors**
   - TypeScript type mismatches
   - React Router loader/action errors
   - Async/await issues
   - State management problems
4. **Integration/API issues**
   - External API failures (Listen Notes, OpenAI, Gemini, Deepgram)
   - Webhook delivery problems (Polar.sh, Clerk)
   - CORS or network errors
   - Rate limiting or quota exceeded
5. **Environment-specific problems**
   - Dev vs production differences
   - Vercel deployment issues
   - Convex deployment environment
   - Browser compatibility
6. **Race conditions or timing issues**
   - React Router data loading race conditions
   - Convex function execution order
   - Authentication state synchronization
   - Subscription status updates
7. **Dependency version conflicts**
   - React Router v7 compatibility
   - Convex SDK version mismatches
   - TypeScript version issues
   - Package version conflicts

**Distillation**: From the 5-7 potential causes, identify the 1-2 most likely sources based on:

- Evidence from logs and error messages
- Recent changes that correlate with the issue
- Common patterns in Kaizen's codebase
- Data state inconsistencies (check via Convex MCP)
- Stack-specific patterns (React Router, Convex, Clerk)

**Solution Design**: Propose a solution that:

- Fixes the root cause, not just symptoms
- Is simple and clean
- Doesn't introduce messy code or workarounds
- Aligns with existing dependencies (check @package.json)
- Maintains consistency with Kaizen's codebase patterns
- Uses Kaizen's stack conventions (React Router loaders/actions, Convex patterns, etc.)

## Kaizen Stack-Specific Debugging

### React Router v7 Debugging
- **Route Errors**: Check `app/routes.ts` for route configuration issues
- **Type Errors**: Run `npm run typecheck` to generate types and check for type mismatches
- **Loader/Action Errors**: Check `app/routes/[route-name].tsx` for loader/action implementations
- **ErrorBoundary**: Errors bubble to `app/root.tsx` ErrorBoundary - check there for error handling
- **Type Imports**: Always use `./+types/[routeName]` - never use relative paths like `../+types/`
- **URL Generation**: Use `href()` helper for type-safe route generation

**Common Issues:**
- Missing route types → Run `npm run typecheck`
- Loader returning wrong shape → Check Route.LoaderArgs and Route.ComponentProps types
- Action form handling → Verify Form component and action function match

### Convex Debugging
- **Use MCP Server**: Always use Convex MCP tools for debugging (see above)
- **Function Logs**: Check Convex dashboard or use `mcp_convex_logs` for function execution logs
- **Schema Validation**: Verify data matches schema in `convex/schema.ts`
- **Action vs Mutation**: Actions for external APIs, Mutations for database writes, Queries for reads
- **Error Handling**: Convex functions should throw errors with clear messages

**Common Issues:**
- Schema mismatch → Check `convex/schema.ts` and data structure
- Action timeout → External API calls may timeout, add retry logic
- Quota exceeded → Check user quota via `api.users.getUserQuota`
- Missing environment variables → Check Convex dashboard for env vars

**Debugging Commands:**
```bash
# Check Convex deployment status
bunx convex dev

# View logs
# Use Convex dashboard or mcp_convex_logs

# Test function locally
# Use mcp_convex_run with test arguments
```

### Clerk Authentication Debugging
- **Auth State**: Use `useAuth()` hook from `@clerk/react-router`
- **User Sync**: Check if user exists in Convex `users` table
- **Protected Routes**: Verify route protection logic
- **Clerk Dashboard**: Check Clerk dashboard for auth events and errors

**Common Issues:**
- User not synced to Convex → Check `upsertUser` mutation
- Auth state not updating → Verify Clerk provider setup in root
- Protected route access → Check authentication checks in loaders

### TypeScript Debugging
- **Type Errors**: Run `npm run typecheck` to see all type errors
- **Route Types**: Ensure route types are generated (`./+types/[routeName]`)
- **Convex Types**: Check `convex/_generated/api.d.ts` for Convex function types
- **Type Inference**: Let TypeScript infer types where possible, don't over-type

**Common Issues:**
- Missing route types → Run `npm run typecheck`
- Type mismatches → Check function signatures match usage
- Generic type errors → Verify imports and type definitions

### External API Debugging
- **Listen Notes API**: Check API key, rate limits, and response structure
- **OpenAI/Gemini**: Verify API keys, check quota, review error messages
- **Deepgram**: Check API key and audio URL accessibility
- **Polar.sh**: Verify webhook configuration and subscription status
- **Resend**: Check email configuration and API key

**Common Issues:**
- API key missing → Check environment variables in Convex dashboard
- Rate limit exceeded → Implement retry logic or check quota
- Invalid response format → Verify API response structure matches expectations

### Vercel Deployment Debugging
- **Build Errors**: Check Vercel build logs for compilation errors
- **Environment Variables**: Verify all env vars are set in Vercel dashboard
- **Runtime Errors**: Check Vercel function logs for runtime errors
- **SSR Issues**: Verify React Router SSR configuration

**Common Issues:**
- Build fails → Check TypeScript errors, missing dependencies
- Runtime errors → Check server logs, verify environment variables
- Route not found → Verify route configuration in `app/routes.ts`

## Best Practices

### Use Jam.dev
Recommend using Jam.dev for instant bug reports with automatic screen recording, console logs, network activity, and session replay.

### MacBook Screenshots
Use `Command-Control-Shift-4` then drag to select an area for precise screenshots.

### Convex MCP Server
Always use Convex MCP to inspect database state, check logs, and test functions when debugging Convex-related issues.

### Check Dependencies
Always refer to @package.json to ensure solutions align with existing library versions.

### Add Logging
If console logs are missing, add console.log statements to trace the issue before asking for help. In Kaizen's codebase:
- Convex functions use extensive console.log for debugging
- Client-side components log errors to browser console
- Use structured logging in Convex (e.g., `logStructured()` function)

### Error Boundaries
- React Router errors bubble to `ErrorBoundary` in `app/root.tsx`
- Check ErrorBoundary implementation for error display
- In development, error stack traces are shown

### Type Checking
- Run `npm run typecheck` before debugging to catch type errors
- Fix type errors first, as they often reveal the root cause
- Ensure route types are generated after adding new routes

### Testing Functions
- Use `mcp_convex_run` to test Convex functions with specific arguments
- Test loaders/actions locally before deploying
- Verify function validators match expected input types

## Output
Provide a clear root cause analysis:
1. **List 5-7 potential root causes** with brief explanations
2. **Identify 1-2 most likely sources** with evidence-based reasoning
3. **Propose a clean, simple solution** that:
   - Fixes the root cause
   - Aligns with Kaizen's stack and patterns
   - Doesn't introduce workarounds
   - References relevant code files and dependencies
4. **Include necessary code changes** or fixes
5. **Suggest prevention** strategies if applicable

## Kaizen-Specific Debugging Checklist

When debugging, verify:
- [ ] Route types are generated (`npm run typecheck`)
- [ ] Convex schema matches data structure
- [ ] Environment variables are set (Convex dashboard)
- [ ] User quota/subscription status is correct
- [ ] External API keys are valid
- [ ] ErrorBoundary is handling errors properly
- [ ] Loader/action return types match component props
- [ ] Authentication state is synced (Clerk → Convex)
- [ ] Webhook handlers are configured correctly
- [ ] TypeScript types are correct
