# Altimer (Zen Timer App)

## Project Overview
Altimer is a comprehensive productivity application built with **React** and **Vite**. It combines a Pomodoro-style timer with social features, gamification, and multimedia integrations to enhance focus and study efficiency. The app features real-time collaboration, video calls, and a rich set of productivity tools like notes and task reminders.

### Key Features
*   **Core Timer:** Customizable focus/break sessions with strict mode options.
*   **Social Connectivity:** Friend system, real-time status updates, and group servers.
*   **Video Calls:** Integrated Picture-in-Picture (PiP) video conferencing via LiveKit.
*   **Gamification:** Coins, XP, and unlockable features (Wallet/Inventory).
*   **Productivity Tools:** Smart notes, calendar integration, and task reminders.
*   **Multimedia:** Built-in Spotify/Lofi player and ambient sounds.

## Tech Stack
*   **Frontend:** React 19, Vite, Tailwind CSS, Framer Motion.
*   **Backend / BaaS:** Supabase (Auth, Database, Realtime).
*   **Edge Functions:** Deno (Supabase Edge Functions).
*   **Video/Real-time:** LiveKit.
*   **State Management:** React Context + Hooks.

## Project Structure
```text
C:\Users\divya\Documents\Divyansh\codingfiles\apps\altimer\
├── src/
│   ├── components/         # Feature-specific UI components
│   │   ├── chat/           # Chat interface components
│   │   ├── games/          # Built-in games (Snake, Typing)
│   │   ├── gamification/   # Wallet and reward UI
│   │   ├── modals/         # Global application modals
│   │   ├── notes/          # Smart note editor and calendar
│   │   ├── social/         # Friends and server management
│   │   ├── ui/             # Reusable UI primitives (Buttons, Inputs)
│   │   └── video/          # LiveKit video integration
│   ├── contexts/           # Global state (VideoContext)
│   ├── hooks/              # Custom React hooks (usePiP, useSpotify)
│   ├── lib/                # Third-party library configs (Supabase)
│   ├── pages/              # Static content pages
│   ├── utils/              # Helper functions and constants
│   ├── App.jsx             # Main application layout and logic
│   └── main.jsx            # Entry point
├── supabase/
│   └── functions/          # Deno-based Edge Functions
├── public/                 # Static assets (images, sounds, icons)
└── package.json            # Project dependencies and scripts
```

## Development Workflow

### Prerequisites
*   Node.js (LTS recommended)
*   NPM
*   Supabase CLI (for backend development)

### Key Commands
*   **Start Dev Server:** `npm run dev`
    *   Runs Vite on `localhost`.
*   **Build for Production:** `npm run build`
    *   Outputs static files to `dist/`.
*   **Lint Code:** `npm run lint`
    *   Runs ESLint.
*   **Preview Build:** `npm run preview`

### Configuration
*   **Environment Variables:** Managed via `.env` (accessed via `import.meta.env`).
    *   `VITE_SUPABASE_URL`: Supabase project URL.
    *   `VITE_SUPABASE_ANON_KEY`: Supabase public API key.
    *   `VITE_GEMINI_API_KEY`: Google Gemini API key for AI features.
*   **Styling:** Tailwind CSS is configured in `tailwind.config.js` and `postcss.config.js`.

### Architecture Notes
*   **Strict Mode:** The app interfaces with a companion browser extension (Chrome/Firefox) to enforce strict blocking during focus sessions.
*   **Real-time:** Heavily relies on Supabase Realtime for social status updates and LiveKit for video/audio presence.
*   **Design System:** Uses a "Glassmorphism" aesthetic with Tailwind utilities and custom CSS animations (Framer Motion).
