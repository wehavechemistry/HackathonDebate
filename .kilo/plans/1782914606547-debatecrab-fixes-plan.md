# Implementation Plan: DebateCrab Fixes

## Issues to Fix

### 1. Light Mode Readability
**Files:**
- `src/index.css` — extend `.light` overrides for slates, borders, backgrounds, navbar colors, glass-card, premium-input, and interactive-row to ensure sufficient contrast on light backgrounds.
- `src/components/Navbar.tsx` — navbar uses `text-[#9494a8]` (medium grey) which is low-contrast in light mode; adjust for light mode.

### 2. Auth Guards for Interactive Pages
Add `if (!currentUser) return <Navigate to="/login" />;` to pages requiring login:
- `src/pages/Battle.tsx`
- `src/pages/Training.tsx`
- `src/pages/Prep.tsx`
- `src/pages/Dashboard.tsx` (already has it)
- `src/pages/Profile.tsx` (already has it)
- `src/pages/Settings.tsx` (already has it)
- `src/pages/Admin.tsx` (already has it)

Public pages remain open: `/`, `/login`, `/register`, `/learn` (roadmap view), `/topics`.

### 3. Remove API Key Config from Settings
**File:**
- `src/pages/Settings.tsx` — remove the entire API Config section (lines 44–96), keeping only Theme & Language settings.

### 4. Fix Create Admin Bug
**File:**
- `server/server.js` line ~911 — SQL INSERT has 19 bound values but only 18 `?` placeholders because `banned` is hardcoded as literal `0`. Fix: change `0` to `?` so there are 19 placeholders matching the 19 values array items.

### 5. Admin Permissions Already Correct
No code change needed. The `admin` role already passes all `requireAdmin` checks (lessons, users, bots, topics, announcements, AI keys). Only `head_admin` can create new admins. Once the SQL bug in #4 is fixed, created admins will automatically have the full management permissions.

## Validation
- Start dev server and navigate to `/battle`, `/training`, `/prep` while logged out — should redirect to `/login`.
- Log in as head admin and create a new admin — should succeed without server error.
- Log in as the new `admin` and verify access to Admin Panel → Lessons, Users, Bots, Topics, Announcements, AI Keys tabs.
- Toggle light mode and verify text is readable across Home, Navbar, Learn, Battle, Settings, etc.
