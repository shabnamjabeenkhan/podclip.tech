# Kaizen 改善

A modern, production-ready SaaS starter template for building full-stack React applications using React Router v7, Convex, Clerk, Resend, and Polar.sh. Ready for Vercel deployment with built-in AI chat capabilities.

## Features

- 🚀 **React Router v7** - Modern full-stack React framework with SSR
- ⚡️ **Hot Module Replacement (HMR)** - Fast development experience
- 📦 **Asset bundling and optimization** - Production-ready builds
- 🔄 **Data loading and mutations** - Built-in loader/action patterns
- 🔒 **TypeScript by default** - Type safety throughout
- 🎨 **TailwindCSS v4** - Modern utility-first CSS
- 🔐 **Authentication with Clerk** - Complete user management
- 💳 **Subscription management with Polar.sh** - Billing and payments
- 🗄️ **Real-time database with Convex** - Serverless backend
- 📧 **Email with Resend via Convex** - Email notifications and transactional emails
- 📊 **Built-in Exception Reporting** - Convex Pro automatic error tracking with Sentry
- 🤖 **AI Chat Integration** - OpenAI-powered chat functionality
- 🎯 **Webhook handling** - Payment and subscription events
- 📱 **Responsive Design** - Mobile-first approach
- 🚢 **Vercel Deployment Ready** - One-click deployment

## Tech Stack

### Frontend
- **React Router v7** - Full-stack React framework
- **TailwindCSS v4** - Utility-first CSS framework
- **shadcn/ui** - Modern component library with Radix UI
- **Lucide React & Tabler Icons** - Beautiful icon libraries
- **Recharts** - Data visualization
- **Motion** - Smooth animations

### Backend & Services
- **Convex** - Real-time database and serverless functions
- **Clerk** - Authentication and user management
- **Polar.sh** - Subscription billing and payments
- **Resend via Convex** - Email notifications and transactional emails
- **OpenAI** - AI chat capabilities
- **Convex Built-in Exception Reporting** - Automatic error tracking with Sentry (Pro feature)

### Development & Deployment
- **Vite** - Fast build tool
- **TypeScript** - Type safety
- **Vercel** - Deployment platform

## Configuration

**🔧 Flexible Configuration System** - Enable/disable features based on your needs!

Kaizen includes a powerful configuration system that allows you to easily enable or disable major features:

- **Authentication** (Clerk)
- **Payments** (Polar.sh)
- **Backend** (Convex)
- **Email** (Resend via Convex component)
- **Monitoring** (Convex built-in exception reporting)
- **AI Chat** (OpenAI)

### Quick Start Configurations

**1. Full SaaS App (Default)**
```typescript
// config.ts
features: {
  auth: true,
  payments: true,
  convex: true,
  email: true,
  monitoring: true,
}
```

**2. Simple Frontend App**
```typescript
// config.ts
features: {
  auth: false,
  payments: false,
  convex: false,
  email: false,
  monitoring: false,
}
```

**3. Auth-Only App**
```typescript
// config.ts
features: {
  auth: true,
  payments: false,
  convex: true,
  email: false,
  monitoring: true,
}
```

See `config.example.ts` for more configuration examples.

## Getting Started

### Prerequisites

**Required for all configurations:**
- Node.js 20+ 

```bash
nvm install 20
```

**Optional (based on enabled features):**
- Clerk account for authentication
- Convex account for database
- Polar.sh account for subscriptions
- OpenAI API key (for AI chat features)

### Installation

1. Clone the repository and install dependencies:

```bash
npm install --legacy-peer-deps
```

2. **⚠️ IMPORTANT: Configure your features FIRST** in `config.ts`:

Edit the feature flags to match your needs:

```typescript
export const config: AppConfig = {
  features: {
    auth: true,        // Enable/disable Clerk authentication
    payments: true,    // Enable/disable Polar.sh payments
    convex: true,      // Enable/disable Convex backend
    email: true,       // Enable/disable Resend email
    monitoring: true,  // Enable/disable Convex built-in exception reporting
  },
  // ... rest of config
};
```

**Choose one of these common configurations:**
- **Full SaaS**: `auth: true, payments: true, convex: true` (like in the tutorial)
- **Frontend Only**: `auth: false, payments: false, convex: false` (static site)
- **Auth Only**: `auth: true, payments: false, convex: true` (user management)

3. Copy the environment file and configure your credentials:

```bash
cp .env.example .env.local
```

4. **Set up your environment variables** in `.env.local` (only for enabled features):

### If you enabled convex: true
```bash
# Run this command first:
npx convex dev

# This will automatically add to .env.local:
CONVEX_DEPLOYMENT=your_convex_deployment_here
VITE_CONVEX_URL=your_convex_url_here
```

### If you enabled auth: true
```bash
# Get these from Clerk Dashboard:
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
CLERK_SECRET_KEY=your_clerk_secret_key_here
```

### If you enabled payments: true
```bash
# Get these from Polar Dashboard and add them to the Environment Variables section of the Convex Dashboard:
POLAR_ACCESS_TOKEN=your_polar_access_token_here
POLAR_ORGANIZATION_ID=your_polar_organization_id_here
POLAR_WEBHOOK_SECRET=your_polar_webhook_secret_here
```

### If you want AI chat (requires convex: true)
```bash
# Get this from OpenAI:
OPENAI_API_KEY=your_openai_api_key_here
```

### Always required for production
```bash
# Your deployed frontend URL:
FRONTEND_URL=http://localhost:5173  # for development
```

5. **Follow the detailed setup guide** based on your configuration:
   - See `guides/testing-locally.md` for step-by-step instructions
   - The guide will tell you which steps to skip based on your config

6. Start the development server:

```bash
npm run dev
```

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

### Vercel Deployment (Recommended)

This starter kit is optimized for Vercel deployment with the `@vercel/react-router` preset:

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

The `react-router.config.ts` includes the Vercel preset for seamless deployment.

### Docker Deployment

To build and run using Docker:

```bash
docker build -t my-app .

# Run the container
docker run -p 3000:3000 my-app
```

The containerized application can be deployed to any platform that supports Docker:

- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean App Platform
- Fly.io
- Railway

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is production-ready.

Make sure to deploy the output of `npm run build`

```
├── package.json
├── package-lock.json
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
├── convex/                # Convex backend functions
├── public/                # Static assets
└── docs/                  # Documentation
```

## Key Dependencies

- `react` & `react-dom` v19 - Latest React
- `react-router` v7 - Full-stack React framework
- `@clerk/react-router` - Authentication
- `convex` - Real-time database
- `@polar-sh/sdk` - Subscription management
- `@ai-sdk/openai` & `ai` - AI chat capabilities
- `@vercel/react-router` - Vercel deployment
- `tailwindcss` v4 - Styling
- `@radix-ui/*` - UI primitives

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run typecheck` - Run TypeScript checks

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

This project is licensed under the MIT License.

---

**Stop rebuilding the same foundation over and over.** RSK eliminates months of integration work by providing a complete, production-ready SaaS template with authentication, payments, AI chat, and real-time data working seamlessly out of the box.

Built with ❤️ using React Router v7, Convex, Clerk, Polar.sh, and OpenAI.

## Architecture

### Key Routes
- `/` - Homepage with pricing
- `/pricing` - Dynamic pricing page
- `/dashboard` - Protected user dashboard
- `/dashboard/chat` - AI-powered chat interface
- `/dashboard/settings` - User settings
- `/success` - Subscription success page
- `/api/webhooks/polar` - Polar.sh webhook handler

### Key Components

#### Authentication & Authorization
- Protected routes with Clerk authentication
- Server-side user data loading with loaders
- Automatic user synchronization

#### Subscription Management
- Dynamic pricing cards fetched from Polar.sh
- Secure checkout flow with redirect handling
- Real-time subscription status updates
- Customer portal for subscription management
- Webhook handling for payment events

#### Error Reporting & Monitoring
- **Convex Built-in Exception Reporting** - Automatic backend error tracking (Pro feature)
- Rich error metadata: function name, type, runtime, request ID, environment, user context
- Zero code changes required - all Convex function errors automatically captured
- Frontend error boundaries for graceful error handling

#### Dashboard Features
- Interactive sidebar navigation
- Real-time data updates
- User profile management
- AI chat functionality
- Subscription status display

#### AI Chat Integration
- OpenAI-powered conversations
- Real-time message streaming
- Chat history persistence
- Responsive chat interface

## Environment Variables

### Core (Always Required)
- `CONVEX_DEPLOYMENT` - Your Convex deployment name
- `VITE_CONVEX_URL` - Your Convex client URL

### Authentication (if auth: true)
- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
- `CLERK_SECRET_KEY` - Clerk secret key

### Payments (if payments: true)
- `POLAR_ACCESS_TOKEN` - Polar.sh API access token
- `POLAR_ORGANIZATION_ID` - Your Polar.sh organization ID
- `POLAR_WEBHOOK_SECRET` - Polar.sh webhook secret

### Email (if email: true)
- `RESEND_API_KEY` - Resend API key for email sending
- `RESEND_WEBHOOK_SECRET` - Resend webhook secret

### AI Features (if using chat)
- `OPENAI_API_KEY` - OpenAI API key for chat features

### Monitoring (if monitoring: true)
- **Backend**: Configure via Convex Dashboard → Integrations → Exception Reporting (requires Pro)
- **Frontend** (optional): `VITE_SENTRY_DSN` - Sentry DSN for manual frontend error tracking

### Production
- `FRONTEND_URL` - Your production frontend URL

## Project Structure

```
├── app/
│   ├── components/         # Reusable UI components
│   │   ├── ui/            # shadcn/ui components
│   │   ├── homepage/      # Homepage sections
│   └── dashboard/         # Dashboard components
├── routes/                # React Router routes
├── convex/                # Convex backend functions
├── guides/                # Setup documentation
├── public/                # Static assets
└── config.ts              # Feature configuration
```