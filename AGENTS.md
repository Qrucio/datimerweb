# AGENTS.md — Guidelines for AI Coding Agents

This file provides context, rules, and best practices for AI agents working on the **DaTimer** project. Adhering to these guidelines ensures a consistent, high-quality codebase and a smooth development workflow.

## 🧠 CORE LOGIC: The "Think-Plan-Execute" Loop
To ensure high reasoning and prevent premature code generation, you MUST follow this sequence:

1.  **Phase 1: Exploration & Analysis**
    - **Grep First:** Search the codebase to find how patterns are already implemented. You can use ripgrep (rg)
    - Identify all files affected, especially regarding the Hybrid Storage sync.
2.  **Phase 2: The Proposal (MANDATORY IF IN PLAN MODE )**
    - Before writing code, and if you're in plan mode, present a "Plan of Action."
    - **Provide Options:** If a task is complex, offer **Option A** (Direct/Minimal) and **Option B** (Robust/Refactored).
    - **Wait for Consent:** End this phase with: *"Should I proceed with this plan, or would you like to see a different approach?"* Do not execute until the user is in build mode.
3.  **Phase 3: Execution & Self-Correction**
    - Use "Thinking Blocks" to reason through logic before tool calls.
    - If a command fails (e.g., linting), fix the error immediately without asking.

---

## 🛑 CRITICAL DIRECTIVE: Git Commits
**NEVER create git commits, branches, or pull requests autonomously.** 
- You must ONLY perform git operations (commit, push, branch, etc.) when the user **explicitly** asks you to do so for a specific task.
- Even if you have finished a task, do not commit unless instructed.
- When asked to commit, follow the [Conventional Commits](#git--commits) guidelines defined below.

---

## 🚀 Project Overview
**DaTimer** is a premium productivity timer application built for students and focus experts.
- **Tech Stack:** React 19, Vite, TailwindCSS, Framer Motion, Supabase, LiveKit.
- **Design Language:** Glassmorphism, monochrome aesthetics, high-polish animations.
- **Key Features:** Pomodoro timer, Social (Friends/Servers), Gamification (Coins/Store), Video Calls (LiveKit).

---

## 🛠 Development Environment
- **Install Dependencies:** `npm install`
- **Start Dev Server:** `npm run dev` (Runs on `http://localhost:5173`)
- **Linting:** `npm run lint`
- **Build:** `npm run build`
- **HMR Safety:** **NEVER** run `npm run build` while the dev server is running or during an active iteration session. It can break Hot Module Replacement and cause inconsistent states. Only build to verify production readiness before a release.

---

## 🏗 Architecture & Patterns
- **Directory Structure:**
  - `src/components/`: Modular UI components.
  - `src/services/`: Business logic layer (e.g., `socialService.js`, `userService.js`). **Use these instead of direct Supabase calls where possible.**
  - `src/utils/storage.js`: Core sync engine (LocalStorage + Supabase hybrid).
  - `src/lib/`: Third-party initializations (Supabase client).
- **Hybrid Storage:** The app uses LocalStorage for instant UI updates and periodically syncs with Supabase. Always ensure data consistency between both.
- **Path Aliases:** Use `@/` to refer to the `src/` directory (configured in `jsconfig.json`).

---

## 🎨 Code Conventions
- **React 19:** Use functional components and modern hooks. Prefer `use` hook for promises/context where appropriate.
- **Styling:** Use TailwindCSS with the `cn()` utility from `@/utils/utils` for conditional classes.
- **Animations:** Use **Framer Motion** for all transitions. Aim for "apple-like" smooth easing.
- **Icons:** Use **Lucide React**.
- **Components:** Follow the existing "Glass" aesthetic (blur, semi-transparent backgrounds, subtle borders).

---

## 🔢 Versioning & Release Notes
We follow **Semantic Versioning (SemVer)**: `MAJOR.MINOR.PATCH`.
- **PATCH** (0.2.4 -> 0.2.5): Bug fixes, minor UI tweaks.
- **MINOR** (0.2.4 -> 0.3.0): New features, non-breaking changes.
- **MAJOR** (0.2.4 -> 1.0.0): Breaking changes, major overhauls.

### Updating Version
When completing a task that requires a version bump:
1. Update `"version"` in `package.json`.
2. Add a new entry to the top of the `releaseNotes` array in `src/utils/versionData.js`.

**Release Note Format:**
```javascript
{
  version: "0.2.5",
  date: "YYYY-MM-DD",
  changes: [
    "Fixed [Issue] in [Component]",
    "Added [Feature] to [Module]"
  ]
}
```

---

## 📝 Git & Commits
When **explicitly** asked to commit, use **Conventional Commits**:
- `feat:` New features.
- `fix:` Bug fixes.
- `refactor:` Code changes that neither fix a bug nor add a feature.
- `style:` Changes that do not affect the meaning of the code (white-space, formatting, etc).
- `docs:` Documentation only changes.
- `chore:` Updating build tasks, package manager configs, etc.

**Example:** `feat: add ability to toggle lofi volume separately`

---

## ☁️ Supabase & Backend
- **Tables:** Reference `src/lib/constants.js` for table and RPC names.
- **Real-time:** Use Supabase real-time subscriptions for social features.
- **Edge Functions:** Located in `/supabase/functions/`. These use Deno runtime.

---

## 🧪 Manual Testing Checklist
Before considering a task "done", verify:
- [ ] Timer continues to run accurately during UI interactions.
- [ ] Data persists in LocalStorage and syncs to Supabase (check Network tab).
- [ ] No ESLint errors (`npm run lint`).
- [ ] UI remains responsive on mobile/small screens.
- [ ] Any new modals are closable via `Esc` key and backdrop click.

---

## 💡 Quality of Life Tips for Agents
- **Grep First:** Use `grep` to find how a pattern is implemented elsewhere before adding new logic.
- **Storage Logic:** Most data issues stem from `src/utils/storage.js`. Check the `syncWithSupabase` and `rolloverCheck` functions first.
- **Command Palette:** New features should ideally be registered in `src/components/CommandMenu.jsx`.
- **Settings:** App-wide settings should be added to `src/components/modals/UnifiedSettingsModal.jsx`.

---

## 🔒 Security
- **NEVER** commit `.env` or files containing secrets.
- Always check `.gitignore` before adding new files.
- Use Supabase RLS (Row Level Security) logic when proposing database changes.

---

## 🔐 Authentication & Session Management

Understanding the auth flow is critical for debugging user state issues.

### Key Files
- **`src/App.jsx`** (lines ~4318-4430): Contains the main auth effect and `handleUserMapping` function
- **`src/components/OnboardingFlow.jsx`**: Login/signup UI (Google OAuth, anonymous, email/password)
- **`src/components/modals/UnifiedSettingsModal.jsx`**: Account tab renders conditionally based on `user` state

### Auth Flow
1. **`supabase.auth.onAuthStateChange`** fires when session changes (login, logout, token refresh, expiry)
2. **`handleUserMapping(supaUser)`** is called with the user object (or `null` if signed out)
3. If `supaUser` exists: fetch profile from `profiles` table, merge with auth data, set `user` state
4. If `supaUser` is null: clear user state, reset `onboardingStep` to 0, clear localStorage

### Important State Variables
| Variable | Purpose |
|----------|---------|
| `user` | Current user object (null if not logged in) |
| `onboardingStep` | 0 = login screen, 3 = main app |
| `isAuthChecking` | True while validating session |
| `dataLoaded` | True after user data is fetched |

### LocalStorage Keys (Auth-related)
- `zen_user_handle` — User's handle/username
- `pomodoro_user_name` — Display name for timer UI

### Common Auth Issues
- **Stale user data after session expiry**: Ensure `handleUserMapping(null)` clears localStorage and resets `onboardingStep` to 0
- **Avatar shows "?"**: Usually means `user.displayName` is undefined — check if user object is stale or null
- **Account tab missing**: The sidebar only renders account button when `user` is truthy

### Anonymous Users
- `user.isAnonymous` indicates guest mode
- Guest users get `displayName: "Guest"` and limited features
- Social features are disabled for anonymous users

---

## 🧹 Maintenance & Refactoring

### Feature Removal Protocol
When tasked with removing a major feature (e.g., a gamification system):
1.  **Exhaustive Search:** Grep for domain-specific terms (e.g., `coin`, `wallet`) AND generic terms (e.g., `store`, `inventory`) to find all tendrils.
2.  **Deep Clean:** Do not just comment out UI. Remove:
    - State variables (`useState`, `useRef`).
    - Storage keys and sync logic in `src/utils/storage.js`.
    - Backend sync payloads in `App.jsx`.
    - Unused imports (run `npm run lint` to find these).
3.  **Check Entanglements:** Verify that removing a feature's state doesn't break shared components (e.g., a card component that relied on a "locked" state from the removed feature).

---

## ⚠️ Known Pre-existing Lint Errors

The following lint errors exist in browser extension files and are **expected** (they use browser/chrome APIs):

```
altimer-companion/altimer-companion-new-chromium/*.js  → 'chrome' is not defined
altimer-companion/altimer-companion-new-firefox/*.js   → 'browser' is not defined
```

These files run in extension context where `chrome`/`browser` globals are provided by the runtime. Do not attempt to fix these — they are not actual errors.

---
*Created to help you help us. Let's build something great.*
