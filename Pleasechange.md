# Remaining "altimer" References to Change

This document lists all remaining references to "altimer" that require manual changes. These are **functional/backend** references that could break the app if changed without proper coordination.

---

## 1. Infrastructure URLs (Requires Netlify/DNS Changes)

| File | Reference | Action Required |
|------|-----------|-----------------|
| `supabase/functions/video-token/index.ts` | `https://altimer.netlify.app` | Update CORS origin after deploying to new domain |
| `supabase/functions/create-polar-checkout/index.ts` | `https://altimer.netlify.app` | Update CORS origin after deploying to new domain |
| `src/hooks/useSpotify.js` | Redirect URI contains `altimer.netlify.app` | Update Spotify app settings AND code simultaneously |
| `README.md` | `support@altimer.app` | Update after setting up new email domain |

---

## 2. Security Salt (Low Priority)

| File | Reference | Notes |
|------|-----------|-------|
| `src/utils/security.js` | `altimer-salt` | This is a static salt for device binding. Changing it will **invalidate all existing encrypted tokens** on user devices. Only change if you want to force re-authentication. |

---

## 3. Browser Extension Bridge (Requires Extension Update)

These must be changed **in sync** with the companion browser extension:

| File | Reference | Notes |
|------|-----------|-------|
| `src/App.jsx` | `data-altimer-extension-installed` | DOM attribute checked by extension |
| `src/App.jsx` | `ALTIMER_SYNC_REQUEST` | Message type for cross-window communication |
| `src/App.jsx` | `altimercompanion@qruciatus.com` | Firefox extension ID |
| `altimer-companion/*/content.js` | `data-altimer-extension-installed` | Must match App.jsx |
| `altimer-companion/*/content.js` | `ALTIMER_SYNC_REQUEST` | Must match App.jsx |
| `altimer-companion/*/content.js` | `https://altimer.netlify.app` in ALLOWED_ORIGINS | Update after domain change |
| `altimer-companion/*/manifest.json` | Extension name: "Altimer Companion" | Update display name |
| `altimer-companion/*/manifest.json` | Firefox ID: `altimerstrictcompanion@qruciatus.com` | Changing this = new extension identity |

---

## 4. Asset Filenames (Optional, Low Priority)

These are internal file paths. Renaming requires updating all references:

| Current Path | Notes |
|--------------|-------|
| `public/logo/altimer.svg` | Referenced in code |
| `public/logo/altimerwhite.png` | Referenced in multiple components |
| `public/logo/altimerblack.png` | Referenced in code |
| `public/logo/altimerwhiteback.png` | Referenced in code |
| `public/logo/altimerblackback.png` | Favicon in `index.html` |
| `index.html` | Favicon: `logo/altimerblackback.png` |

**If you rename these**, update:
- `index.html` (favicon link)
- `src/App.jsx` (RevealLogo components)
- `src/components/OnboardingFlow.jsx` (logo image)
- `src/components/TaskReminderSystem.jsx` (notification icon)

---

## 5. External Download URLs (Requires Re-upload)

| File | Reference | Action |
|------|-----------|--------|
| `src/pages/DownloadsPage.jsx` | `altimer_0.3.5_x64-setup.exe` Dropbox URL | Re-upload with new filename, update URL |
| `src/App.jsx` | `altimer-companion-chromium.zip` Dropbox URL | Re-upload with new filename, update URL |

---

## 6. Email Addresses (Requires Email Setup)

| File | Reference | Action |
|------|-----------|--------|
| `src/pages/ContactPage.jsx` | `altimerapp@proton.me` | Create new email, update code |
| `src/pages/PrivacyPolicyPage.jsx` | `altimerapp@proton.me` | Same as above |

---

## Recommended Order of Operations

1. **Set up new domain** (e.g., `datimer.app` or similar)
2. **Update Supabase Edge Functions** with new CORS origins
3. **Update Spotify Developer Console** with new redirect URI
4. **Rebuild and republish browser extensions** with updated names/IDs
5. **Re-upload desktop app** with new filename
6. **Set up new email address**
7. **Rename asset files** (optional, lowest priority)
8. **Update security salt** (only if you want to force re-auth)

---

*Generated during the DaTimer rename process.*
