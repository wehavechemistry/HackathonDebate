# 🦀 DebateCrab

**Master the Art of Debate** — Learn, practice, and compete in debates with AI-powered coaching.

DebateCrab is a full-stack web application built with React, TypeScript, Tailwind CSS, and Express. It provides structured debate lessons, AI opponent battles, skill training exercises, and smart preparation tools — all bilingual (English / Vietnamese).

---

## Tech Stack

| Layer   | Technology                                                                 |
| ------- | -------------------------------------------------------------------------- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, Framer Motion, Zustand, React Router |
| Backend  | Express 4, SQLite3, bcryptjs, express-session                              |
| AI      | OpenRouter API (any LLM), configurable API keys with fallback               |
| Build   | Vite, vite-plugin-singlefile, concurrently                                  |

---

## Project Structure

```
HackathonDebate/
├── index.html                  # App shell
├── package.json                # Frontend dependencies & scripts
├── vite.config.ts              # Vite config (proxy /api → :3000, singlefile plugin)
├── tsconfig.json               # TypeScript config
├── .gitignore
├── server/
│   ├── package.json
│   ├── server.js               # Express backend (SQLite, auth, AI proxy, admin CRUD)
│   ├── debatecrab.sqlite       # Main database (users, lessons, topics, bots, announcements, AI keys)
│   ├── motions.db              # External debate motions database
│   ├── sessions.sqlite         # Session store
│   └── ...
└── src/
    ├── main.tsx                # Entry point
    ├── App.tsx                 # Root component (routing, theme)
    ├── store.ts                # Zustand global state
    ├── types.ts                # TypeScript interfaces
    ├── api.ts                  # AI prompt builders & callOpenRouter
    ├── i18n.ts                 # Translations (EN/VI)
    ├── index.css               # Tailwind base, custom theme, animations
    ├── utils/
    │   └── cn.ts               # clsx + tailwind-merge utility
    ├── components/
    │   ├── Navbar.tsx           # Navigation bar (links, theme/lang toggle, user menu)
    │   ├── BotAvatars.tsx       # SVG avatars for AI opponents (Duy, Thái, Hân, Bách, Dũng, Tôm)
    │   ├── CoachCrab.tsx        # Animated crab mascot SVG
    │   ├── LoadingScreen.tsx    # Loading spinner with CoachCrab
    │   └── MarkdownRenderer.tsx # ReactMarkdown + GFM rendering
    └── pages/
        ├── Home.tsx             # Landing page with features overview
        ├── Login.tsx            # Login form
        ├── Register.tsx         # Registration form
        ├── Dashboard.tsx        # User dashboard (activity, notes, quick links)
        ├── Learn.tsx            # Structured lesson library & reader
        ├── Battle.tsx           # Full debate arena vs AI opponents
        ├── Training.tsx         # Training exercises (rebuttal, speech, POI, keyword, fallacy, weighing, case, framing)
        ├── Prep.tsx             # Debate prep assistant
        ├── Topics.tsx           # Topic browser by category
        ├── Profile.tsx          # User profile with stats & settings
        ├── Settings.tsx         # API key & app settings
        └── Admin.tsx            # Admin panel (CRUD for lessons, users, bots, topics, AI keys, announcements)
```

---

## Features

### 📚 Structured Learning
- 17 progressive lessons across **Beginner** (6), **Intermediate** (6), **Advanced** (5) levels
- Sequential unlocking — complete a lesson to unlock the next
- Pinned lessons support
- Content in English and Vietnamese

### ⚔️ AI Battle Arena
- Debate against AI opponents with **unique personalities** (Duy, Thái, Hân, Bách, Dũng, Tôm)
- Customizable opponent strength (1–10)
- **Custom Engine** mode for adjustable difficulty
- Configurable speech time, prep time, speaker order
- **Randomize** button for motion, side, opponent, and difficulty
- Built-in timer, notes, and AI hint system
- **Auto-judging** — AI evaluates the debate with structured scores and feedback
- Star rating system for opponents

### 🎯 Training Ground
- **Rebuttal Practice** — Read an argument, write a rebuttal, get AI feedback
- **Speech Practice** — Deliver a speech, receive structured evaluation (structure, argumentation, evidence, delivery)
- **POI Practice** — Practice Points of Information (sharpness, relevance, pressure)
- **Keyword Battle** — AI builds an argument from 5 keywords, evaluates creativity/coherence/persuasiveness
- **Fallacy Spotting** — Spot the hidden logical fallacy in an AI-generated argument
- **Weighing Practice** — Compare competing arguments with weighing criteria
- **Case Building** — Build a full debate case (model, arguments, preemptive rebuttal, weighing)
- **Framing Practice** — Write a framing paragraph (rights-based, utilitarian, etc.)
- XP, streak tracking, and tier system (bronze → silver → gold → diamond)
- XP penalty for poor submissions

### 💡 Smart Preparation
- AI-assisted debate prep: key arguments, opponent rebuttals, counters, POIs, opening speech draft
- Save prep sheets as personal notes

### 🌐 Bilingual
- Full English / Vietnamese support
- UI translations, lesson content, bot bios, AI prompts

### 🎨 Themes
- Dark mode (default) and light mode
- Grain overlay texture, glass morphism cards, custom scrollbars, fluid animations

### 🔐 Authentication & Roles
- Email/password registration and login
- Session-based auth (SQLite session store)
- **Roles**: user, admin, head_admin
- Head admin can promote users to admin

### 🛠️ Admin Panel
- CRUD management: lessons, topics, bots
- User management: view, ban/unban
- AI API key management (add/edit/delete, priority, enable/disable)
- Announcement management
- Admin account creation (head_admin only)

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repo
git clone https://github.com/wehavechemistry/HackathonDebate.git
cd HackathonDebate

# Install frontend dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..
```

### Configuration

1. Place your debate motions database at `server/motions.db` (SQLite with `motions(id, motion, category)`).  
   If absent, the app still runs but motions will be empty.

2. **First run** creates `server/debatecrab.sqlite` with seed data (admin account, default lessons, topics, bots).  
   Default admin credentials:  
   - Email: `dodungtri402@gmail.com`  
   - Password: `admin123`

3. Configure AI in the Settings page or Admin > AI Keys. Add an **OpenRouter API key** to enable AI features.

### Development

```bash
# Run both frontend + backend concurrently
npm run dev

# Or run separately:
npm run dev:frontend   # Vite dev server (localhost:5173)
npm run dev:backend    # Express API (localhost:3000)
```

The Vite dev server proxies `/api/*` requests to `localhost:3000`.

### Production Build

```bash
npm run build
npm run preview
```

The Express server serves the built frontend from `dist/`.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get current session user |
| PUT | `/api/auth/profile` | Update user profile/progress |
| GET | `/api/content` | Get all content (lessons, topics, bots, motions, announcements) |
| GET | `/api/ai/config` | AI configuration status |
| POST | `/api/ai/chat` | Proxy chat to OpenRouter (fallback across keys) |
| POST/DELETE | `/api/lessons` | Admin: create/delete lesson |
| PUT | `/api/lessons/:id` | Admin: update lesson |
| POST/DELETE | `/api/topics` | Admin: create/delete topic |
| PUT | `/api/topics/:id` | Admin: update topic |
| POST/DELETE | `/api/bots` | Admin: create/delete bot |
| PUT | `/api/bots/:id` | Admin: update bot |
| POST/DELETE | `/api/announcements` | Admin: create/delete announcement |
| GET | `/api/admin/users` | Admin: list all users |
| POST | `/api/admin/users/:id/ban` | Admin: ban/unban user |
| POST | `/api/admin/create-admin` | Head admin: create admin account |
| GET | `/api/admin/ai-keys` | Admin: list AI keys |
| POST | `/api/admin/ai-keys` | Admin: add AI key |
| PUT | `/api/admin/ai-keys/:id` | Admin: update AI key |
| DELETE | `/api/admin/ai-keys/:id` | Admin: delete AI key |

---

## AI Opponents

| Bot | Strength | Personality |
|-----|----------|-------------|
| **Duy** | 2 | Awkward coder, simple logic, limited knowledge |
| **Thái** | 5 | TikTok enthusiast, aggressive, trash-talker, persuasive |
| **Hân** | 3.5 | Young girl (born 2014), surprisingly smart and creative |
| **Bách** | 6.5 | AI robot assistant, structured, vast knowledge but robotic |
| **Dũng** | 7 | School debate champion, principled, strong technically |
| **Tôm** | 1 (hidden: 10) | Shrimp friend of Coach Crab, appears weak but is a master debater |

---

## Database

The app uses SQLite3 with three database files:

| File | Purpose |
|------|---------|
| `server/debatecrab.sqlite` | Main DB — users, lessons, topics, bots, announcements, ai_api_keys |
| `server/motions.db` | External read-only debate motions (user-provided) |
| `server/sessions.sqlite` | Express session store |

---

## License

MIT