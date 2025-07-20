# Kaizen Best Practices for Claude Code

This file contains comprehensive best practices and guidelines specifically for Claude Code when working with the Kaizen SaaS starter template (React Router v7 + Convex + Modern Stack).

## 🚨 CRITICAL PROJECT PATTERNS

### Feature Flag Architecture - ALWAYS CHECK FIRST
**THE MOST IMPORTANT RULE: Always check `config.ts` feature flags before implementing any feature.**

```typescript
// ✅ ALWAYS check feature flags first
import { isFeatureEnabled, getServiceConfig } from '~/config';

if (isFeatureEnabled('auth')) {
  // Only implement auth-related code when enabled
}

if (isFeatureEnabled('payments')) {
  // Only implement payment logic when enabled
}

// ❌ NEVER assume services are enabled
// Don't write: import { auth } from '@clerk/remix/ssr-server'
// Without checking: if (isFeatureEnabled('auth'))
```

### React Router v7 Type Safety - CRITICAL IMPORTS
**ALWAYS use proper route type imports for type safety:**

```typescript
// ✅ CORRECT - Import route types
import type { Route } from "./+types/product-details";

export async function loader({ params }: Route.LoaderArgs) {
  return { product: await getProduct(params.id) };
}

export default function ProductDetails({ loaderData }: Route.ComponentProps) {
  return <div>{loaderData.product.name}</div>;
}

// ❌ NEVER manually type route functions
// Don't write: export async function loader({ params }: any)
```

## Essential Architecture Patterns

### Environment Variable Validation
**ALWAYS validate environment variables through the config system:**

```typescript
// ✅ CORRECT - Use config validation
import { validateConfig } from '~/config';

// In app initialization
validateConfig(); // Throws if required env vars missing

// ❌ DON'T access env vars directly
// Don't write: process.env.CLERK_SECRET_KEY
// Use: getServiceConfig('clerk').secretKey
```

### Conditional Service Integration
**ALWAYS wrap service imports with feature flag checks:**

```typescript
// ✅ CORRECT - Conditional service usage
export async function someFunction() {
  if (isFeatureEnabled('convex')) {
    const { api } = await import('~/convex/_generated/api');
    // Use Convex API
  }
  
  if (isFeatureEnabled('auth')) {
    const { getAuth } = await import('@clerk/remix/ssr-server');
    // Use Clerk auth
  }
}

// ❌ DON'T import services unconditionally at module level
// Don't write: import { api } from '~/convex/_generated/api';
// Without feature flag check
```

### Database Schema Patterns (Convex)
**Follow established schema patterns when Convex is enabled:**

```typescript
// ✅ CORRECT - Follow existing table patterns
// In convex/schema.ts
export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
  }).index("by_token", ["tokenIdentifier"]),
  
  subscriptions: defineTable({
    userId: v.id("users"),
    polarSubscriptionId: v.string(),
    status: v.union(v.literal("active"), v.literal("canceled")),
  }).index("userId", ["userId"]),
});
```

## Development Workflow Rules

### Before Writing Any Code
1. **Check `config.ts`** - Understand which features are enabled
2. **Run `npm run typecheck`** - Ensure types are generated
3. **Check existing patterns** - Look at similar implementations
4. **Validate environment** - Ensure required services are configured

### Code Style Requirements
- **TypeScript-first** - All code must be properly typed
- **Feature flag respect** - Never bypass the configuration system
- **Component composition** - Use shadcn/ui patterns for UI
- **Route type safety** - Always import Route types for route modules

### Testing and Validation
- **Run typecheck** after any route changes: `npm run typecheck`
- **Test feature toggles** - Verify code works with features disabled
- **Check build** - Ensure production build succeeds: `npm run build`

## Component Development Patterns

### UI Component Guidelines
**Follow shadcn/ui patterns for consistency:**

```typescript
// ✅ CORRECT - Use shadcn/ui components
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";

export function MyComponent() {
  return (
    <Card>
      <CardHeader>Title</CardHeader>
      <CardContent>
        <Button>Action</Button>
      </CardContent>
    </Card>
  );
}

// ❌ DON'T create custom basic UI components
// Use existing shadcn/ui components instead
```

### Feature Component Structure
**Organize components by feature, not by type:**

```
app/components/
├── homepage/          # Homepage-specific components
├── dashboard/         # Dashboard-specific components
├── ui/                # Shared UI primitives (shadcn/ui)
└── subscription-status.tsx  # Feature-specific components
```

### Conditional Rendering Patterns
**Always respect feature flags in component rendering:**

```typescript
// ✅ CORRECT - Conditional feature rendering
import { isFeatureEnabled } from '~/config';

export function AppLayout() {
  return (
    <div>
      <nav>
        {isFeatureEnabled('auth') && <AuthButton />}
        {isFeatureEnabled('payments') && <SubscriptionStatus />}
      </nav>
    </div>
  );
}
```

## Data Loading and Actions

### Server-Side Data Loading
**Use React Router v7 loaders with proper typing:**

```typescript
import type { Route } from "./+types/dashboard";
import { isFeatureEnabled } from '~/config';

export async function loader({ request }: Route.LoaderArgs) {
  // Feature flag validation in loaders
  if (!isFeatureEnabled('auth')) {
    throw redirect('/');
  }
  
  const auth = await getAuth(request);
  return { user: await getUser(auth.userId) };
}
```

### Form Actions with Feature Validation
**Validate features in actions before processing:**

```typescript
export async function action({ request }: Route.ActionArgs) {
  if (!isFeatureEnabled('convex')) {
    throw new Error('Database operations not available');
  }
  
  const formData = await request.formData();
  // Process form with Convex
  return { success: true };
}
```

## Service Integration Guidelines

### Clerk Authentication (when enabled)
```typescript
// ✅ CORRECT - Conditional auth usage
if (isFeatureEnabled('auth')) {
  const { getAuth } = await import('@clerk/remix/ssr-server');
  const auth = await getAuth(request);
}
```

### Convex Database (when enabled)
```typescript
// ✅ CORRECT - Conditional database usage
if (isFeatureEnabled('convex')) {
  const { api } = await import('~/convex/_generated/api');
  const result = await ctx.db.query('users').collect();
}
```

### Polar.sh Payments (when enabled)
```typescript
// ✅ CORRECT - Conditional payment logic
if (isFeatureEnabled('payments')) {
  const config = getServiceConfig('polar');
  // Use Polar.sh API with config
}
```

## Error Handling Patterns

### Configuration Errors
```typescript
// ✅ CORRECT - Graceful configuration handling
try {
  validateConfig();
} catch (error) {
  console.error('Configuration validation failed:', error.message);
  // Provide helpful guidance
}
```

### Service Availability Errors
```typescript
// ✅ CORRECT - Handle disabled services gracefully
export function getUser() {
  if (!isFeatureEnabled('convex')) {
    return { error: 'Database service not available' };
  }
  // Proceed with database operation
}
```

## Production Deployment Rules

### Environment Variable Checklist
- **Always required**: `FRONTEND_URL`
- **Feature-dependent**: Only set env vars for enabled features
- **Validate before deploy**: Run `validateConfig()` in CI/CD

### Build Optimization
- **Type checking**: Always run `npm run typecheck` before deploy
- **Feature flags**: Verify production feature configuration
- **Asset optimization**: Ensure Vite build completes successfully

## Anti-Patterns to Avoid

### ❌ Configuration Anti-Patterns
```typescript
// DON'T bypass feature flag system
if (process.env.CLERK_SECRET_KEY) { /* ... */ }  // ❌

// DON'T assume services are available
import { api } from '~/convex/_generated/api';    // ❌
// Without checking: isFeatureEnabled('convex')

// DON'T hardcode service configurations
const clerkConfig = { /* hardcoded */ };         // ❌
```

### ❌ React Router v7 Anti-Patterns
```typescript
// DON'T manually type route functions
export async function loader({ params }: any) { /* ❌ */ }

// DON'T bypass route type system
const navigate = useNavigate();
navigate(`/products/${id}`);  // ❌ No type safety
// Use: navigate(href("/products/:id", { id }))
```

### ❌ Component Anti-Patterns
```typescript
// DON'T create custom basic UI components
function CustomButton() { /* ❌ */ }
// Use: import { Button } from "~/components/ui/button"

// DON'T ignore feature flags in components
function Header() {
  return <AuthButton />; // ❌ Always rendered
}
```

## Claude Code Specific Guidelines

### When Implementing New Features
1. **Check existing patterns** - Look for similar implementations
2. **Respect feature flags** - Never bypass the configuration system
3. **Follow type safety** - Use generated types for routes
4. **Test with toggles** - Verify feature works when enabled/disabled
5. **Update config examples** - Add new env vars to `config.example.ts`

### When Debugging Issues
1. **Check configuration** - Run `validateConfig()` first
2. **Verify feature flags** - Ensure required features are enabled
3. **Check type generation** - Run `npm run typecheck`
4. **Review service status** - Verify external services are configured

### When Refactoring Code
1. **Maintain feature flag respect** - Don't break conditional logic
2. **Preserve type safety** - Keep route type imports
3. **Follow existing patterns** - Don't introduce new architectural patterns
4. **Test thoroughly** - Verify all feature combinations work

---

*These best practices ensure consistent, maintainable, and feature-flag-aware development in the Kaizen SaaS template using React Router v7 + Convex + Modern Stack.*