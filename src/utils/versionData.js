export const releaseNotes = [
  {
    version: "0.2.3",
    date: "2025-12-31",
    changes: [
      "Removed automatic pro access for new users during onboarding"
    ]
  },
  {
    version: "0.2.2",
    date: "2025-12-31",
    changes: [
      "Extracted core database logic into dedicated UserService and SocialService layers for improved stability",
      "Centralized database constants to prevent naming inconsistencies across the application",
      "Fixed profile image loading bug by ensuring all necessary user metadata is fetched on login",
      "Resolved 409 Conflict errors in history syncing by implementing proper upsert conflict resolution",
      "Enhanced data reliability by ensuring all Supabase calls are safely handled through the service layer"
    ]
  },
  {
    version: "0.2.1",
    date: "2025-12-31",
    changes: [
      "Fixed streak calculation bug where overlapping local and server history caused streaks to reset erroneously",
      "Implemented robust timeline merging to correctly account for continuous activity across devices",
      "Restored accuracy of streak statistics for all users"
    ]
  },
  {
    version: "0.2.0",
    date: "2025-12-26",
    changes: [
      "Introduced new About, Contact, and Privacy Policy pages",
      "Added dedicated About tab in Settings for app information",
      "Standardized 'altimer' branding across the application",
      "Prepared infrastructure for future ad-supported features"
    ]
  },
  {
    version: "0.1.3",
    date: "2024-12-25",
    changes: [
      "Changed tab title format from '{time left} | altimer' to '{time left} • altimer'",
      "Fixed smart pill time picker toggle - clicking the pencil icon now properly toggles the picker open/close",
      "Improved time picker UX - clicking outside the picker closes it smoothly"
    ]
  },
  {
    version: "0.1.2",
    date: "2024-12-25",
    changes: [
      "Implemented notion-style rail animation"
    ]
  },
  {
    version: "0.1.1",
    date: "2024-12-23",
    changes: [
      "Changed add note button cursor to default arrow pointer",
      "Updated add note button to use subtle rounded corners (rounded-sm)",
      "Added interactive glow effect to add note button that follows cursor",
      "Renamed button labels from 'Add Note'/'Create New' to 'New Note' for consistency",
      "Fixed strict mode button cursor to use default arrow pointer"
    ]
  },
  {
    version: "0.1.0",
    date: "2024-12-23",
    changes: [
      "Added version display in settings modal",
      "Implemented release notes system",
      "Added Netlify SPA routing support",
      "Version tracking with new version indicators",
      "Minimalist dark theme release notes page"
    ]
  }
];
