# PRD: Episode Search Within Podcast

**Feature Name:** Episode Search Within Podcast  
**Version:** 1.0  
**Date:** January 14, 2026  
**Author:** AI Assistant  

---

## 1. Introduction/Overview

When users find and select a podcast, they currently browse episodes through pagination. For podcasts with many episodes, finding a specific episode by topic, guest, or title is time-consuming.

This feature adds an **episode search bar** above the episode list that allows users to search for episodes **within the currently selected podcast only**. It also ensures users can easily navigate back to their podcast search results without consuming additional search credits.

**Key Principle:** Episode searches within a selected podcast should **NOT** count against the user's search quota. Only initial podcast searches consume quota.

---

## 2. Goals

1. Allow users to search for specific episodes within a selected podcast by keyword (title, topic, guest name, etc.)
2. Reduce time-to-find for users looking for specific episode content
3. Maintain existing pagination functionality alongside the new search
4. Provide a clear "Back to podcasts" navigation that doesn't consume search credits
5. Ensure episode search does NOT increment the user's search count

---

## 3. User Stories

### US-1: Episode Keyword Search
**As a** user viewing a podcast's episodes,  
**I want to** search for episodes by keyword,  
**So that** I can quickly find episodes about specific topics without paginating through many pages.

**Acceptance Criteria:**
- Search bar is visible above the episode list
- User can type keywords (topic, guest name, episode title)
- Only episodes from the currently selected podcast appear in results
- Search does NOT consume user's search quota

### US-2: Clear Search & Return to All Episodes
**As a** user who searched for episodes but found no matches,  
**I want to** clear my search and see all episodes again,  
**So that** I can browse the full episode list without starting over.

**Acceptance Criteria:**
- "Clear search" or "Show all episodes" button visible when search returns no/some results
- Clicking it clears the search and returns to paginated episode list
- No quota consumption

### US-3: Back to Podcast Results
**As a** user viewing episodes,  
**I want to** go back to my podcast search results,  
**So that** I can select a different podcast without re-searching and using my quota.

**Acceptance Criteria:**
- "Back to podcasts" button is always visible on the episodes page
- Clicking it returns user to the podcast list from their original search
- Original podcast search results are preserved
- No quota consumption on back navigation

---

## 4. Functional Requirements

### 4.1 Episode Search Bar
1. **FR-1.1:** Display a search input field above the episode list when a podcast is selected
2. **FR-1.2:** Include placeholder text: "Search episodes by title, topic, guest..."
3. **FR-1.3:** Include a search button/icon to trigger the search
4. **FR-1.4:** Support pressing Enter to submit search

### 4.2 Episode Search API
5. **FR-2.1:** Call Listen Notes `/search` API with `type=episode` and `ocid` parameter set to the selected podcast's ID
6. **FR-2.2:** Do NOT call `checkUserAccessAndQuota` or `incrementSearchCount` for episode searches
7. **FR-2.3:** Return matching episodes with standard pagination info
8. **FR-2.4:** Support pagination of episode search results (offset-based)

### 4.3 Search Results Display
9. **FR-3.1:** Display matching episodes in the same format as the current episode list
10. **FR-3.2:** Show result count: "Found X episodes matching '[query]'"
11. **FR-3.3:** When no results: Display message "No episodes found for '[query]'" with options to:
    - Clear search and show all episodes
    - Go back to podcasts
12. **FR-3.4:** Existing pagination controls should work for search results

### 4.4 Navigation
13. **FR-4.1:** "Back to podcasts" button must be visible at all times on the episodes page
14. **FR-4.2:** Preserve podcast search results in state when navigating to episodes
15. **FR-4.3:** "Clear search" button visible when episode search is active
16. **FR-4.4:** Clearing search returns to the full paginated episode list

### 4.5 Quota Management
17. **FR-5.1:** Episode search within a podcast must NOT increment `searchCount`
18. **FR-5.2:** Navigating back to podcasts must NOT trigger a new search or increment quota
19. **FR-5.3:** Only fresh podcast searches (initial search bar submission) consume quota

---

## 5. Non-Goals (Out of Scope)

- **Full-text transcript search:** This feature searches episode metadata only (title, description), not transcript content
- **Cross-podcast episode search:** Users must select a podcast first; this is not a global episode search
- **Episode filtering by date/duration:** Beyond keyword search (can be added later)
- **Saved/recent episode searches:** No history or saved searches
- **Voice search:** Text input only

---

## 6. Design Considerations

### UI Layout (Episodes Page)
```
┌─────────────────────────────────────────────────────┐
│ [← Back to podcasts]                                │
├─────────────────────────────────────────────────────┤
│ Episodes (245)                                      │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ ┌────────┐  │
│ │ Search episodes by topic, guest...  │ │ Search │  │
│ └─────────────────────────────────────┘ └────────┘  │
│                                                     │
│ [Showing X results for "keyword"] [Clear search]   │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ Episode 1                                       │ │
│ │ Description...                                  │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Episode 2                                       │ │
│ │ Description...                                  │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ [← Previous]  Page 1 of N  [Next →]                │
└─────────────────────────────────────────────────────┘
```

### UI Components to Reuse
- Search input styling from existing podcast search bar
- `ArkPagination` component for episode search result pagination
- Existing episode card layout
- Button styles from `app/components/ui/`

### Empty State
When no episodes match the search:
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│     🔍 No episodes found for "keyword"              │
│                                                     │
│     Try different keywords or browse all episodes   │
│                                                     │
│     [Show All Episodes]    [← Back to Podcasts]     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 7. Technical Considerations

### 7.1 New Convex Action Required

Create `searchEpisodesWithinPodcast` action in `convex/podcasts.ts`:

```typescript
export const searchEpisodesWithinPodcast = action({
  args: {
    query: v.string(),
    podcastId: v.string(),          // ocid parameter for Listen Notes
    offset: v.optional(v.number()),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    // NO quota check - episode search is free
    // NO incrementSearchCount call
    
    const url = `https://listen-api.listennotes.com/api/v2/search?` +
      `q=${encodeURIComponent(args.query)}` +
      `&type=episode` +
      `&ocid=${args.podcastId}` +  // Limit to this podcast
      `&offset=${args.offset || 0}` +
      `&page_size=${Math.min(args.limit || 10, 10)}`;
    
    // ... fetch and return results
  }
});
```

### 7.2 State Management Changes (new-summary.tsx)

Add new state variables:
```typescript
const [episodeSearchQuery, setEpisodeSearchQuery] = useState("");
const [episodeSearchResults, setEpisodeSearchResults] = useState<any>(null);
const [isEpisodeSearchActive, setIsEpisodeSearchActive] = useState(false);
```

### 7.3 Listen Notes API

- **Endpoint:** `GET /search`
- **Key Parameter:** `ocid` - comma-delimited podcast IDs (up to 5) to limit episode search
- **Type:** `episode`
- **Pagination:** Use `offset` and `next_offset` from response

### 7.4 Route Changes

No new routes required. Feature is contained within the existing `dashboard/new-summary` route.

### 7.5 Authentication/Subscription Checks

- Episode search should work for all authenticated users
- No additional subscription checks needed (feature doesn't consume quota)

---

## 8. Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Episode search usage | 20% of users who view episodes | Track `searchEpisodesWithinPodcast` calls |
| Time to find episode | 50% reduction in avg time on episodes page | Analytics on page dwell time |
| Back button usage | Track navigation patterns | Log when users use back vs re-search |
| Zero quota complaints for episode search | 0 tickets about episode search consuming quota | Customer support tickets |

---

## 9. Open Questions

1. **Search debouncing:** Should we search as the user types (debounced) or only on submit?
   - **Recommendation:** Submit only (button/Enter) to reduce API calls

2. **Result highlighting:** Should we highlight the matched keywords in results?
   - **Recommendation:** Nice-to-have for v2, not required for initial implementation

3. **Sort order:** Should episode search results be sorted by relevance or date?
   - **Recommendation:** Use Listen Notes default (relevance) with option to sort by date in v2

4. **Minimum query length:** Should we require a minimum character count?
   - **Recommendation:** Require at least 2 characters before searching

---

## 10. Implementation Checklist

### Backend (Convex)
- [ ] Add `searchEpisodesWithinPodcast` action to `convex/podcasts.ts`
- [ ] Ensure NO quota check or increment in the new action
- [ ] Add logging for episode search calls

### Frontend (new-summary.tsx)
- [ ] Add episode search state variables
- [ ] Add episode search input component above episode list
- [ ] Implement `handleEpisodeSearch` function
- [ ] Show search results in place of paginated episodes when active
- [ ] Add "Clear search" button
- [ ] Add no-results empty state with options
- [ ] Ensure "Back to podcasts" button is always visible
- [ ] Update episode pagination to work with search results

### Testing
- [ ] Verify episode search doesn't increment user's search count
- [ ] Verify back navigation preserves podcast results
- [ ] Test pagination of episode search results
- [ ] Test empty state and clear functionality
- [ ] Test with podcasts with many episodes (100+)
