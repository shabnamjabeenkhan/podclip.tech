# Podclip MVP – System Architecture

```mermaid
flowchart TD
  A[User Browser]
  B[React Router v7 App\nSSR on Vercel]
  C[Convex Functions & DB]
  D[Clerk Auth]
  E[Polar.sh Payments]
  F[Resend Email]
  G[OpenAI API]
  H[Listen Notes API]
  I[(Bonus) Notion API]

  A-->|HTTP/HTTPS|B
  B-->|API Calls|C
  B-->|Auth|D
  B-->|Payments|E
  C-->|Send Email|F
  C-->|Fetch Podcast Data|H
  C-->|AI Summaries|G
  C-->|Send to Notion|I
  D-->|User Info|C
  E-->|Webhook Events|C
  F-->|Transactional Email|A
  G-->|AI Responses|C
  H-->|Podcast Metadata|C
  I-->|Exported Content|C
```

## Summary
- **Frontend:** React Router v7 app deployed on Vercel (SSR for SEO/performance)
- **Backend:** Convex handles all data, business logic, and API integrations
- **Authentication:** Clerk for user sign-up/login, integrated with frontend and Convex
- **Payments:** Polar.sh for monthly/lifetime plans; webhooks update user access in Convex
- **Email:** Resend for transactional emails triggered by Convex
- **AI:** OpenAI API (or alternative) called by Convex for summaries/takeaways
- **Podcast Data:** Listen Notes API called by Convex, results cached in DB
- **(Bonus) Notion:** Convex sends summaries/takeaways to Notion API for export
- **Data Flow:** All user actions (search, playback, summary generation, export) flow through Convex, which orchestrates external API calls and updates the DB 