# Claude Code Best Practices & Development Rules

General best practices and development guidelines for working with Claude Code across any project.

## 🚨 CRITICAL DEVELOPMENT PRINCIPLES

### Code Safety & Security
**NEVER compromise on security or introduce vulnerabilities:**

```typescript
// ✅ CORRECT - Secure practices
// Validate input
if (!isValidInput(userInput)) {
  throw new Error('Invalid input');
}

// Sanitize before database operations
const sanitizedInput = sanitize(userInput);

// ❌ NEVER write code that:
// - Logs sensitive information
// - Exposes API keys or secrets
// - Allows SQL injection
// - Bypasses authentication/authorization
```

### Type Safety First
**ALWAYS prioritize TypeScript type safety:**

```typescript
// ✅ CORRECT - Proper typing
interface User {
  id: string;
  name: string;
  email: string;
}

function processUser(user: User): void {
  // Fully typed, compile-time safe
}

// ❌ AVOID - Loose typing
function processUser(user: any): void { /* ❌ */ }
```

## Development Workflow Standards

### Before Writing Code
1. **Understand the codebase** - Read existing patterns and conventions
2. **Check project documentation** - Look for CLAUDE.md, README, or docs
3. **Identify dependencies** - Understand what libraries/frameworks are in use
4. **Follow existing patterns** - Don't introduce new architectural styles without reason

### Code Quality Requirements
- **Consistent formatting** - Follow existing code style
- **Proper error handling** - Never leave unhandled promise rejections
- **Clear naming** - Use descriptive variable and function names
- **Documentation** - Add comments for complex logic only when necessary

### Testing Approach
- **Test critical paths** - Ensure core functionality works
- **Edge case handling** - Consider error conditions and edge cases
- **Integration verification** - Test how changes affect the broader system

## Framework-Specific Best Practices

### React Development
**Follow modern React patterns:**

```typescript
// ✅ CORRECT - Modern React patterns
import { useState, useCallback, useMemo } from 'react';

function OptimizedComponent({ items, onSelect }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  
  const filteredItems = useMemo(() => 
    items.filter(item => item.active), [items]
  );
  
  const handleSelect = useCallback((id: string) => {
    setSelected(id);
    onSelect(id);
  }, [onSelect]);
  
  return (
    <div>
      {filteredItems.map(item => (
        <button key={item.id} onClick={() => handleSelect(item.id)}>
          {item.name}
        </button>
      ))}
    </div>
  );
}

// ❌ AVOID - Outdated patterns
class ComponentWithState extends React.Component { /* ❌ */ }
```

### Node.js/Server Development
**Follow secure server practices:**

```typescript
// ✅ CORRECT - Secure server patterns
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const app = express();

// Security middleware
app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));

// Input validation
app.post('/api/users', validateInput, async (req, res) => {
  try {
    const result = await createUser(req.body);
    res.json(result);
  } catch (error) {
    console.error('User creation failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Database Operations
**Always follow safe database practices:**

```typescript
// ✅ CORRECT - Safe database operations
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().positive().max(150),
});

async function createUser(input: unknown) {
  // Validate input
  const userData = UserSchema.parse(input);
  
  // Use parameterized queries/ORM
  const user = await db.user.create({
    data: userData
  });
  
  return user;
}

// ❌ NEVER - SQL injection vulnerable
// const query = `INSERT INTO users (name) VALUES ('${userInput}')`;
```

## Git & Version Control Best Practices

### Commit Message Standards
**Write clear, descriptive commit messages:**

```bash
# ✅ GOOD commit messages
feat: add user authentication with JWT tokens
fix: resolve memory leak in websocket connections
docs: update API documentation for v2 endpoints
refactor: extract common validation logic to utils

# ❌ POOR commit messages
# update stuff
# fix bug
# changes
# wip
```

### Branch Management
```bash
# ✅ GOOD branch naming
feature/user-authentication
bugfix/memory-leak-fix
hotfix/security-vulnerability
docs/api-v2-update

# ❌ POOR branch naming
# fix
# temp
# my-branch
# test123
```

### Pull Request Guidelines
- **Clear description** - Explain what changes and why
- **Test instructions** - How to verify the changes work
- **Breaking changes** - Highlight any breaking changes
- **Screenshots/demos** - For UI changes, include visuals

## Error Handling Patterns

### Comprehensive Error Handling
**Always implement proper error boundaries:**

```typescript
// ✅ CORRECT - Comprehensive error handling
async function apiCall<T>(endpoint: string): Promise<T> {
  try {
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    
    if (error instanceof TypeError) {
      throw new Error('Network error - check connection');
    }
    
    throw error; // Re-throw for handling upstream
  }
}

// ❌ AVOID - Silent failure
async function badApiCall(endpoint: string) {
  try {
    const response = await fetch(endpoint);
    return response.json();
  } catch {
    return null; // ❌ Silent failure
  }
}
```

### User-Friendly Error Messages
```typescript
// ✅ CORRECT - User-friendly errors
function validatePassword(password: string): string[] {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return errors;
}

// ❌ AVOID - Cryptic errors
function badValidatePassword(password: string): boolean {
  return password.length >= 8; // ❌ No helpful feedback
}
```

## Performance Optimization Guidelines

### Frontend Performance
```typescript
// ✅ CORRECT - Performance optimizations
import { lazy, Suspense, memo } from 'react';

// Code splitting
const HeavyComponent = lazy(() => import('./HeavyComponent'));

// Memoization for expensive components
const ExpensiveComponent = memo(function ExpensiveComponent({ data }: Props) {
  const processedData = useMemo(() => {
    return data.map(item => expensiveTransformation(item));
  }, [data]);
  
  return <div>{/* render processed data */}</div>;
});

// Usage with loading states
function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### Backend Performance
```typescript
// ✅ CORRECT - Backend optimizations
import { LRUCache } from 'lru-cache';

// Implement caching
const cache = new LRUCache<string, any>({
  max: 1000,
  ttl: 1000 * 60 * 10, // 10 minutes
});

async function getCachedData(key: string) {
  const cached = cache.get(key);
  if (cached) return cached;
  
  const data = await expensiveDbQuery(key);
  cache.set(key, data);
  return data;
}

// Database query optimization
async function getUsers(limit = 10, offset = 0) {
  return await db.user.findMany({
    take: limit,
    skip: offset,
    select: {
      id: true,
      name: true,
      email: true,
      // Only select needed fields
    },
  });
}
```

## Documentation Standards

### Code Documentation
```typescript
// ✅ GOOD - Clear, useful comments
/**
 * Calculates the compound interest for an investment
 * @param principal - Initial investment amount
 * @param rate - Annual interest rate (as decimal, e.g., 0.05 for 5%)
 * @param time - Number of years
 * @param compoundingFrequency - Number of times interest is compounded per year
 * @returns The final amount after compound interest
 */
function calculateCompoundInterest(
  principal: number,
  rate: number,
  time: number,
  compoundingFrequency: number = 12
): number {
  return principal * Math.pow(1 + rate / compoundingFrequency, compoundingFrequency * time);
}

// ❌ POOR - Obvious or misleading comments
// Increments i by 1
i++; // ❌

// This function adds two numbers
function add(a: number, b: number): number { // ❌
  return a * b; // ❌ Comment doesn't match implementation
}
```

### README Documentation
Include in project READMEs:
- **Project purpose** - What does this project do?
- **Setup instructions** - How to get it running locally
- **Usage examples** - How to use key features
- **Contributing guidelines** - How others can contribute
- **License information** - Legal usage terms

## Security Best Practices

### Input Validation & Sanitization
```typescript
// ✅ CORRECT - Comprehensive input validation
import { z } from 'zod';
import DOMPurify from 'dompurify';

const CreatePostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  tags: z.array(z.string()).max(10),
});

function createPost(input: unknown) {
  // Validate structure
  const data = CreatePostSchema.parse(input);
  
  // Sanitize HTML content
  const sanitizedContent = DOMPurify.sanitize(data.content);
  
  return {
    ...data,
    content: sanitizedContent,
  };
}
```

### Authentication & Authorization
```typescript
// ✅ CORRECT - Secure auth patterns
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// Password hashing
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

// JWT token verification
function verifyToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    return { userId: decoded.userId };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

// Route protection
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  req.user = user;
  next();
}
```

## Anti-Patterns to Avoid

### ❌ General Anti-Patterns
```typescript
// DON'T use any type unnecessarily
function process(data: any): any { /* ❌ */ }

// DON'T ignore errors silently
try {
  riskyOperation();
} catch {} // ❌ Silent failure

// DON'T use global variables for state
var globalState = {}; // ❌

// DON'T hardcode configuration values
const API_URL = 'https://hardcoded-url.com'; // ❌
// Use: process.env.API_URL || 'default-value'

// DON'T create deeply nested code
if (condition1) {
  if (condition2) {
    if (condition3) {
      if (condition4) { // ❌ Too deep
        // logic
      }
    }
  }
}
```

### ❌ Performance Anti-Patterns
```typescript
// DON'T create objects in render loops
function BadComponent({ items }: Props) {
  return (
    <div>
      {items.map(item => (
        <Component 
          key={item.id}
          style={{ color: 'red' }} // ❌ New object every render
          onClick={() => handleClick(item.id)} // ❌ New function every render
        />
      ))}
    </div>
  );
}

// DON'T make API calls without cleanup
useEffect(() => {
  fetchData().then(setData); // ❌ No cleanup for component unmount
}, []);
```

---

*These best practices help ensure code quality, security, and maintainability across all projects using Claude Code.*