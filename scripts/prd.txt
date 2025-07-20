# Podclip MVP – Product Requirements Document (PRD)

## Introduction
Podclip addresses the need for deeper, more productive podcast engagement. The app enables users to listen to full podcast episodes and instantly receive AI-generated summaries and key takeaways, saving time and boosting knowledge retention. The vision is to make podcasts actionable and accessible for busy, knowledge-driven users.

## Objectives & Goals
- Deliver instant, accurate AI-generated summaries and takeaways for any podcast episode.
- Provide seamless podcast playback with intuitive controls.
- (Bonus) Allow users to export insights to Notion for productivity.
- Require users to sign up and select a paid plan (monthly or lifetime) to access core features.

## Target Users & Roles
- **Casual Listeners:** Want quick insights and easy playback.
- **Knowledge Workers/Students:** Need actionable summaries and takeaways for learning and productivity.
- **Power Users:** Export summaries to Notion for further use.

## Core Features for MVP
1. **Podcast Playback**
   - Listen to full podcast episodes with play, pause, skip, and speed controls.
   - Clean, responsive audio player UI.
2. **AI-Generated Summaries & Takeaways**
   - Instantly generate concise, accurate written summaries (150–200 words) and 3–5 key takeaways per episode.
   - Summaries are generated on-demand and cached for future access.
   - Quota: 50 summaries per user (monthly for subscription, one-time for lifetime plan).
3. **(Bonus) Notion Integration**
   - Export summaries and takeaways to user’s Notion workspace.
   - OAuth authentication and destination selection.

## Future Scope
- AI chat assistant for episode-specific Q&A and brainstorming.
- Tag-based organization and filtering.
- Full episode transcriptions (lifetime plan only).
- Social sharing, personalized recommendations, and more integrations.

## User Journey
1. **Sign Up & Payment**
   - User signs up via Clerk and selects a plan (monthly or lifetime) via Polar.sh checkout.
   - On successful payment, user is redirected to the dashboard.
2. **Podcast Discovery & Playback**
   - User searches for podcasts/episodes, selects an episode, and uses the audio player.
3. **Generate & View Summaries**
   - User clicks to generate a summary/takeaways for an episode (if quota allows).
   - Summary and takeaways are displayed and cached for future visits.
4. **(Bonus) Export to Notion**
   - User clicks “Export to Notion” to send summary/takeaways to their Notion workspace.

## Tech Stack
- **Frontend:** React Router v7 (SSR)
- **Backend/Database:** Convex
- **Authentication:** Clerk
- **Payments:** Polar.sh
- **Email:** Resend
- **AI:** OpenAI API (or best-value alternative)
- **Deployment:** Vercel
- **(Bonus) Notion API** 