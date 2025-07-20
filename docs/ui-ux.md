# Podclip MVP – UI/UX Design

## Main Screens & Components

### 1. Sign Up & Payment
- **Sign Up/Login Page:**
  - Simple form for email/social login (Clerk)
  - Clear call-to-action to sign up or log in
- **Plan Selection:**
  - Two options: Monthly Subscription, Lifetime Access
  - Pricing, features, and CTA for each plan
- **Checkout:**
  - Polar.sh embedded checkout flow
  - Success/failure feedback

### 2. Dashboard (Post-Payment)
- **Header:**
  - App logo, user avatar/menu, logout
- **Podcast Search:**
  - Prominent search bar with autocomplete
  - Filters for category/duration (future)
- **Results List/Grid:**
  - Podcast/episode cards with thumbnail, title, description
  - Clickable to view details

### 3. Episode Detail Page
- **Audio Player:**
  - Play, pause, skip, speed control (0.5x–2x)
  - Progress bar, download button (future)
- **Episode Info:**
  - Title, description, podcast info
- **Summary/Takeaways Section:**
  - “Generate Summary” button (disabled if quota reached)
  - Display summary (150–200 words) and 3–5 bullet takeaways
  - Loading state while generating
- **(Bonus) Notion Export:**
  - “Export to Notion” button
  - Modal for OAuth and destination selection
  - Success/failure feedback

## Accessibility
- All interactive elements are keyboard accessible
- Sufficient color contrast for text/buttons
- Audio player supports screen readers (ARIA labels)
- Focus indicators for navigation

## Responsive Design
- Mobile-first layout: collapsible nav, stacked cards, large touch targets
- Desktop: grid/list layouts, persistent sidebar/header
- Audio player adapts to screen size (sticky on mobile)

## Design Principles
- Minimal, distraction-free UI
- Clear CTAs and feedback for all actions
- Fast, intuitive navigation between search, playback, and summaries 