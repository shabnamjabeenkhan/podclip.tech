# Podclip MVP – Technical Design Doc (TDD)

## Overview
This document describes the technical approach for building the Podclip MVP, focusing on podcast playback and AI-generated summaries/takeaways. Notion integration is included as a bonus if feasible. The stack leverages React Router v7 (SSR), Convex, Clerk, Polar.sh, Resend, and OpenAI (or best-value alternative).

## Architecture
- **Frontend:** React Router v7 app (SSR on Vercel)
- **Backend/Database:** Convex for data storage and serverless functions
- **Authentication:** Clerk for user sign-up/login
- **Payments:** Polar.sh for monthly/lifetime plans
- **Email:** Resend for transactional emails
- **AI:** OpenAI API (or alternative) for summaries/takeaways
- **(Bonus) Notion API:** For exporting summaries

## Data Model (Convex)
- **users:** Clerk user ID, plan (monthly/lifetime), summary_count, notion_token (optional)
- **podcasts:** Listen Notes podcast ID, title, description, thumbnail
- **episodes:** Listen Notes episode ID, podcast_id, title, description, audio_url
- **summaries:** id, episode_id, user_id, content, takeaways (array)

## Core Feature Implementation
### 1. Podcast Playback
- Fetch podcast/episode metadata from Listen Notes API via Convex function.
- Store/cached podcast and episode data in Convex for performance and API cost control.
- Audio player UI in React with play, pause, skip, and speed controls.
- Responsive design for mobile/desktop.

### 2. AI-Generated Summaries & Takeaways
- User requests summary for an episode (button click).
- Convex function checks user quota, then calls OpenAI API with optimized prompt.
- Store summary and takeaways in Convex, linked to user and episode.
- Cache results for future access; increment summary_count for user.
- Enforce quota: 50 summaries per user (monthly for subscription, one-time for lifetime).

### 3. (Bonus) Notion Integration
- User authenticates with Notion via OAuth; store access token in Convex.
- User selects destination page/database.
- Convex function formats and sends summary/takeaways to Notion API.

## Auth & Payments
- All users must sign up/login via Clerk.
- Onboarding flow: After sign-up, user selects plan and completes payment via Polar.sh.
- On successful payment, user is granted access to dashboard/features.
- Convex tracks plan type and summary quota.

## Email
- Use Resend to send transactional emails (welcome, payment confirmation, quota warnings).
- Triggered by Convex functions on relevant user actions.

## Deployment & Scalability
- Deploy frontend and Convex API to Vercel for auto-scaling and SSR.
- Use Convex for real-time data and serverless backend logic.
- Cache Listen Notes and AI outputs in Convex to minimize API costs and latency.
- Monitor API usage and performance; optimize prompts and caching as needed. 