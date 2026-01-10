export const releaseNotes = [
  {
    version: "0.3.2",
    date: "2026-01-10",
    changes: [
      "Fixed currency selector in Command Palette to update settings immediately without requiring page refresh",
      "Enhanced currency selection UI with searchable list of all 150+ supported currencies",
      "Added quick-access pills for commonly used currencies (USD, EUR, GBP, INR, JPY, CAD, AUD)",
      "Implemented real-time search filtering by currency code or name",
      "Added visual feedback with checkmark indicator for currently selected default currency",
      "Removed deprecated currency setting from Settings menu in favor of Command Palette integration"
    ]
  },
  {
    version: "0.3.1",
    date: "2026-01-09",
    changes: [
      "Added Currency Converter to Command Menu (supports 150+ currencies)",
      "Implemented smart fuzzy parsing for currency inputs (e.g. '100 uds' auto-corrects to 'USD')",
      "Added inline settings to quickly change default currency directly from search results",
      "Improved Command Menu selection logic for faster copy-pasting of results"
    ]
  },
  {
    version: "0.3.0",
    date: "2026-01-09",
    changes: [
      "Enhanced security with encrypted local storage for sensitive tokens",
      "Implemented server-side validation for video calls and checkout sessions",
      "Improved privacy by filtering real-time presence updates to friends only",
      "Secured wallet and inventory system with server-authoritative sync",
      "Fixed code injection vulnerability in Command Menu calculator",
      "Removed legacy demo mode and unused AI integrations"
    ]
  },
  {
    version: "0.2.4",
    date: "2026-01-09",
    changes: [
      "Fixed friend request error where adding a friend would fail due to missing user ID mapping"
    ]
  },
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
