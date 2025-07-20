# Podclip MVP – User Flows

## 1. Sign Up & Payment
1. User visits Podclip and clicks “Sign Up”
2. User creates an account via Clerk (email/social login)
3. User selects a plan (monthly or lifetime)
4. User completes payment via Polar.sh checkout
5. On successful payment, user is redirected to the dashboard with access to all features

## 2. Podcast Discovery & Playback
1. User searches for podcasts or episodes (search bar powered by Listen Notes API)
2. User browses results and selects a podcast or episode
3. On the episode detail page, user sees audio player and episode info
4. User plays, pauses, skips, or changes playback speed as desired

## 3. Generate AI Summary & Takeaways
1. On the episode detail page, user clicks “Generate Summary”
2. System checks user's summary quota (50 per month/lifetime)
3. If quota available, Convex function calls AI API to generate summary and takeaways
4. Summary and takeaways are displayed on the episode page and cached for future visits
5. User’s summary count is incremented
6. If quota is reached, “Generate Summary” button is disabled and user is notified

## 4. (Bonus) Export to Notion
1. User clicks “Export to Notion” on a summary/takeaways
2. If not already connected, user authenticates with Notion (OAuth)
3. User selects destination page/database in Notion
4. System sends summary/takeaways to Notion via API
5. User sees confirmation of successful export 