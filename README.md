# Contempla — Contemplative Practice with Friends

A meditation and contemplative practice tracking app with social features. Built as a cross-platform application that runs on web (as a PWA) and iOS (via Capacitor).

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend Framework** | React + TypeScript | 18.3 / 5.8 |
| **Build Tool** | Vite (with SWC) | 5.4 |
| **Styling** | Tailwind CSS + shadcn/ui | 3.4 |
| **UI Components** | Radix UI + 50+ shadcn components | — |
| **Routing** | React Router DOM | v6 |
| **Data Fetching** | TanStack React Query | v5 |
| **Forms** | React Hook Form + Zod | — |
| **Charts** | Recharts | 2.15 |
| **Backend** | Supabase (PostgreSQL + Auth + Realtime) | — |
| **Edge Functions** | Deno (Supabase Functions) | — |
| **Mobile Native** | Capacitor | 8.0 |
| **PWA** | vite-plugin-pwa + Workbox | 1.2 |
| **Audio** | Web Audio API | Native |
| **Icons** | Lucide React | — |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Apps                              │
├──────────────────────┬──────────────────────┬───────────────────┤
│    Web (PWA)         │   iOS (Capacitor)    │   (Future Android)│
│  Service Worker      │   Native Wrapper     │                   │
│  Offline Support     │   Native APIs        │                   │
│  Add to Home Screen  │   Deep Linking       │                   │
└──────────────────────┴──────────────────────┴───────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     React Application                            │
├─────────────────────────────────────────────────────────────────┤
│  5 Main Views (2,619 lines)                                     │
│  • TimerView (697 lines) — Meditation timer with progress       │
│  • LibraryView (720 lines) — Technique management               │
│  • HistoryView (295 lines) — Calendar & session history         │
│  • CommunityView (326 lines) — Social feed & friends            │
│  • SettingsView (581 lines) — Profile & preferences             │
├─────────────────────────────────────────────────────────────────┤
│  73 Components (shadcn/ui + custom)                             │
│  10 Custom Hooks (Spotify, Analytics, Haptics, Sound, etc.)    │
│  8 Utility Libraries (Deep Linking, Notifications, etc.)        │
├─────────────────────────────────────────────────────────────────┤
│  React Query (caching) + Supabase Client                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Supabase Backend                               │
├──────────────────────┬──────────────────────────────────────────┤
│  PostgreSQL Database │  4 Edge Functions (Deno)                 │
│  • 13 Tables         │  • spotify-auth (OAuth)                  │
│  • 41 Migrations     │  • spotify-playlists (fetch)             │
│  • Row-Level Security│  • spotify-play (playback)               │
│  • Database Functions│  • ping (health check)                   │
├──────────────────────┼──────────────────────────────────────────┤
│  Auth System         │  Realtime Subscriptions                  │
│  • Email/Password    │  • Activity feed updates                 │
│  • Google OAuth      │  • Friend requests                       │
│  • JWT tokens        │  • Session kudos                         │
└──────────────────────┴──────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   External Integrations                          │
├──────────────────────┬──────────────────────────────────────────┤
│  Spotify API         │  Future Integrations                     │
│  • OAuth login       │  • Apple Health (planned)                │
│  • Playlist fetch    │  • HealthKit (planned)                   │
│  • Playback control  │  • App Store Connect (in-app purchase)   │
└──────────────────────┴──────────────────────────────────────────┘
```

## Core Features

### 🧘 Timer View
**Purpose:** Core meditation session experience

**Features:**
- ⏱️ Circular progress timer with elegant visualization
- 📖 Technique selection dropdown (sorted by recency)
- 🔔 Multiple meditation sounds:
  - 4 Tibetan bowl variations
  - 2 bell sounds
  - 1 gong sound
  - Silent option
- 📳 Haptic vibration feedback (start & completion)
- 🔒 Screen wake lock (prevents device sleep)
- 🔕 Background notifications when screen locked
- 💾 Session auto-save with elapsed time tracking
- ⏲️ Preset durations: 10, 30, 45, 60 minutes
- 📝 Partial session saving (if stopped early)
- 🎵 **Spotify integration** — Auto-play meditation playlists
- ⚡ Timer accuracy via elapsed-time calculation (handles screen lock)

**Technical Implementation:**
- Uses `Date.now()` timestamps instead of interval-based countdown
- Survives app backgrounding and screen lock
- Schedules local notifications with custom sounds
- Maximum haptic intensity (800ms vibrations × 3)

---

### 📚 Library View
**Purpose:** Manage meditation techniques

**Features:**
- 📋 Personal technique collection
- 🌍 Global library with community techniques
- ✨ Admin approval workflow for submitted techniques
- ⭐ Favorite marking system
- ➕ Add/edit/delete techniques
- 🔍 Search & filter by tradition
- 🏷️ Tag support for categorization
- 📤 Technique submission dialog

**Database:**
- `techniques` table (personal)
- `global_techniques` table (community-shared)
- Approval status tracking

---

### 📅 History View
**Purpose:** Track meditation practice over time

**Features:**
- 📆 Monthly calendar with session indicators
- 🔥 Streak calculation and display
- 📊 Session history list
- ✍️ Manual session entry (for offline practice)
- ⏮️ ⏭️ Month navigation (prev/next)
- 🎯 Technique association per session
- ⏱️ Total minutes tracking
- 📍 Date-based session lookup

**Data Model:**
- Sessions stored in UTC
- Converted to user's local timezone for display
- Streak logic based on consecutive days

---

### 👥 Community View
**Purpose:** Social engagement and motivation

**Features:**
- 📰 Activity feed (friends' meditation sessions)
- 👏 Kudos system (like/appreciate sessions)
- 👤 Friend management:
  - Send/accept/reject friend requests
  - View friend list
  - Remove friends
- 📊 User statistics cards:
  - Current streak (🔥)
  - Favorite technique
  - Total minutes practiced
- 🔒 **Privacy controls** (granular):
  - Streak visibility (all/friends/private)
  - Technique visibility (all/friends/private)
  - Practice history visibility (all/friends/private)
  - Session feed sharing (all/friends/none)

**Realtime Features:**
- Live updates when friends complete sessions
- Instant kudos notifications
- Friend request notifications

---

### ⚙️ Settings View
**Purpose:** Configure app preferences and profile

**Features:**

**Account Management:**
- 👤 Profile editing (name, handle, email, password)
- 🔐 Password reset flow
- 🗑️ Account deletion
- 🚪 Logout

**Privacy Controls:**
- 🔒 Granular visibility settings (per-feature)
- 🌐 Profile visibility toggles
- 📊 Session feed sharing preferences

**Timer Preferences:**
- 📳 Haptic feedback toggle (with test button)
- 🔒 Screen wake lock toggle
- 🔔 Start sound toggle
- 🔊 Notification preferences

**Integrations:**
- 🎵 Spotify setup & authentication
- 📊 Edge function diagnostics

**Admin Features:**
- 👑 Admin panel (for approved admins)
- ✅ Technique approval workflow
- 👥 User role management

**Premium:**
- ✨ Contempla+ modal (future monetization)

---

## Database Schema

**Core Tables:**

| Table | Rows | Purpose |
|-------|------|---------|
| `profiles` | 1:1 with users | User profiles with name, handle, privacy settings |
| `techniques` | Many per user | Personal meditation techniques |
| `global_techniques` | Shared | Community-submitted techniques (approval workflow) |
| `sessions` | Many per user | Logged meditation sessions (date, duration, technique) |
| `session_kudos` | Many per session | Likes/appreciation on sessions |
| `friendships` | Many-to-many | Friend connections with status (pending/accepted) |
| `conversations` | Many-to-many | Direct message conversations |
| `messages` | Many per conversation | Direct messages between users |
| `analytics_events` | Event log | User engagement tracking |
| `analytics_backups` | Archive | Historical analytics snapshots |
| `user_roles` | Many-to-many | Admin/role assignments |
| `spotify_settings` | 1:1 with users | Spotify OAuth tokens & preferences |
| `subscription_interest` | Event log | Contempla+ interest tracking |

**Unused Tables (Safe to Remove):**
- `mastery_scores` — Technique mastery levels (no UX implemented)
- `mastery_history` — Historical mastery tracking (no UX implemented)
- `mock_health_metrics` — Health data mockups (future feature)

**Database Features:**
- **Row-Level Security (RLS):** Privacy enforced at DB level
- **Database Functions:** Automated profile creation on signup
- **Triggers:** Auto-create profile on user registration
- **Realtime Subscriptions:** Activity feed, friend requests, kudos

---

## Mobile & Native Capabilities

**Capacitor Plugins:**

| Plugin | Purpose | Usage in App |
|--------|---------|--------------|
| `@capacitor/core` | Platform detection | Check if running on native iOS |
| `@capacitor/splash-screen` | Launch screen | Hide splash after app loads |
| `@capacitor/status-bar` | Status bar styling | Dark theme, custom background |
| `@capacitor/local-notifications` | Native alerts | Timer completion, reminders |
| `@capacitor/haptics` | Vibration feedback | Timer start/completion |
| `@capacitor/share` | Native share sheet | Share sessions to other apps |
| `@capacitor/app` | App lifecycle | Deep linking, app open/close events |
| `@capacitor/browser` | External links | Open URLs in system browser |

**Custom Native Utilities (`/src/lib/`):**
- `haptics.ts` — Vibration patterns (800ms × 3 for max intensity)
- `notifications.ts` — Local notification scheduling with custom sounds
- `native-share.ts` — Share meditation sessions via native sheet
- `deep-linking.ts` — Handle `contempla://` URL schemes
- `app-review.ts` — Prompt for App Store review after 50 sessions

**Native Sound Files (`/public/sounds/`):**
- `tibetan-bowl-struck-1.wav` through `tibetan-bowl-struck-4.wav`
- `small-bell-1.wav`, `small-bell-2.wav`
- `gong-sweet.wav`

---

## Spotify Integration

**Flow:**
1. User clicks "Connect Spotify" in Settings
2. OAuth redirect to Spotify authorization
3. `spotify-auth` edge function exchanges code for tokens
4. Tokens stored in `spotify_settings` table
5. User selects meditation playlist in Settings
6. Timer auto-plays playlist when meditation starts

**Edge Functions:**
- `spotify-auth` — OAuth token exchange (verify_jwt=false)
- `spotify-playlists` — Fetch user's playlists (verify_jwt=true)
- `spotify-play` — Start playback on selected device (verify_jwt=true)

**Device Prioritization:**
- Prefers smartphones/tablets over computers
- Ensures music plays on iPhone, not desktop

---

## PWA (Progressive Web App)

**Features:**
- 📱 **Add to Home Screen** — Installable web app
- 🔄 **Service Worker** — Offline caching via Workbox
- 💾 **Offline Support** — Manual session entry when offline
- 📦 **Caching Strategies:**
  - Fonts (Google Fonts: Inter, Playfair Display)
  - Static assets (images, icons)
  - App shell (instant loading)

**Manifest:**
- App name: "Contempla"
- Theme color: Dark navy/amber
- Icons: 192×192, 512×512 (auto-generated)

---

## Project Structure

```
Contempla/
├── src/                          # React application (73 components, 10 hooks, 8 libs)
│   ├── App.tsx                   # Root with routing & auth
│   ├── main.tsx                  # Entry point
│   ├── index.css                 # Global styles (Tailwind + theme)
│   ├── pages/
│   │   ├── Index.tsx            # Main app shell (5-tab layout)
│   │   └── Auth.tsx             # Login/signup/reset
│   ├── components/
│   │   ├── views/               # 5 main views (2,619 lines)
│   │   │   ├── TimerView.tsx    # (697 lines)
│   │   │   ├── LibraryView.tsx  # (720 lines)
│   │   │   ├── HistoryView.tsx  # (295 lines)
│   │   │   ├── CommunityView.tsx # (326 lines)
│   │   │   └── SettingsView.tsx  # (581 lines)
│   │   ├── ui/                  # 50+ shadcn/ui components
│   │   ├── timer/               # Timer dialogs & controls
│   │   ├── library/             # GlobalLibraryTab, UploadTechniqueDialog
│   │   ├── settings/            # ProfileEditDialog, SpotifySettings, AdminPanel
│   │   ├── community/           # FriendsListDialog, ActivityFeed
│   │   ├── shared/              # SessionFeed, PullToRefreshIndicator
│   │   ├── auth/                # HandlePromptDialog, OAuthButtons
│   │   ├── admin/               # AdminApprovalPanel
│   │   ├── layout/              # AppContainer
│   │   └── BottomNav.tsx        # Tab navigation (Timer emphasized)
│   ├── hooks/                    # 10 custom hooks
│   │   ├── use-spotify.ts       # Spotify integration
│   │   ├── use-timer-sound.ts   # Audio playback
│   │   ├── use-analytics.ts     # Event tracking
│   │   ├── use-haptics.ts       # Vibration feedback
│   │   ├── use-nosleep.ts       # Stay-awake functionality
│   │   ├── use-wake-lock.ts     # Screen wake lock
│   │   ├── use-pull-to-refresh.ts
│   │   └── use-toast.ts         # Toast notifications
│   ├── lib/                      # 8 utility modules
│   │   ├── deep-linking.ts      # Native app linking
│   │   ├── notifications.ts     # Local notifications
│   │   ├── haptics.ts           # Haptic feedback
│   │   ├── date-utils.ts        # Date/time utilities
│   │   ├── app-review.ts        # App Store review prompts
│   │   └── native-share.ts      # Native sharing
│   └── integrations/supabase/    # Supabase client & types
│       ├── client.ts            # Supabase JS client
│       └── types.ts             # Auto-generated DB types
├── ios/                          # Capacitor iOS app
│   ├── App/                      # Xcode project
│   ├── App.xcodeproj            # iOS project config
│   └── CapApp-SPM/              # Swift Package Manager
├── supabase/                     # Backend configuration
│   ├── config.toml              # Edge function settings
│   ├── functions/               # 4 Deno edge functions
│   │   ├── spotify-auth/        # OAuth
│   │   ├── spotify-play/        # Playback
│   │   ├── spotify-playlists/   # Fetch
│   │   └── ping/                # Health check
│   └── migrations/              # 41 SQL migrations
├── public/                       # Static assets
│   ├── sounds/                  # Meditation sounds (7 WAV files)
│   └── teacher-portraits/       # Future feature assets
├── package.json                 # Dependencies
├── vite.config.ts              # Build config + PWA
├── tailwind.config.ts          # Tailwind theme
├── tsconfig.json               # TypeScript config
└── capacitor.config.ts         # Capacitor native config
```

---

## Getting Started

### Prerequisites

- **Node.js** v18+ ([install with nvm](https://github.com/nvm-sh/nvm))
- **npm** (comes with Node)
- **Xcode** (for iOS development, macOS only)

### Development

```bash
# Install dependencies
npm install

# Start development server (localhost:8080)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

### iOS Development

See [IOS_SETUP_GUIDE.md](./IOS_SETUP_GUIDE.md) for detailed instructions.

```bash
# 1. Build web assets
npm run build

# 2. Sync to iOS project
npx cap sync ios

# 3. Open in Xcode
npx cap open ios

# 4. Build & run in Xcode
# - Select target device/simulator
# - Press Cmd+R to build & run
```

**iOS Configuration:**
- Bundle ID: `app.lovable.c0338147c3324b2cb5d7a5ad61c0e9ec` (update for your app)
- Capabilities: Push Notifications, Background Modes (audio)
- Signing: Requires Apple Developer account

---

## Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

**Note:** The app has fallback values in `vite.config.ts` for production builds.

---

## Deployment

### Frontend (via Lovable)

This project uses [Lovable](https://lovable.dev) for deployment.

**Project URL:** https://lovable.dev/projects/7df366e1-29c8-4092-b7aa-f7ab0eae8e3d

**How it works:**
1. Push code to GitHub repository
2. Lovable automatically builds and deploys
3. Frontend is served as a PWA
4. Supabase migrations and edge functions deploy automatically

### Backend (Supabase)

**⚠️ Do NOT manually deploy to Supabase using CLI.**

All Supabase resources are deployed through Lovable's integration:
- Database migrations in `supabase/migrations/`
- Edge functions in `supabase/functions/`
- Configuration changes

This ensures consistency between development and production.

### iOS App Store

1. Archive build in Xcode
2. Upload to App Store Connect
3. Submit for review
4. Configure:
   - App icons
   - Screenshots
   - Privacy policy
   - In-app purchases (if using Contempla+)

---

## Key Design Patterns

### Authentication Flow
1. User lands on `/auth`
2. Sign up via email/password or Google OAuth
3. Supabase creates user → DB trigger creates profile
4. `HandlePromptDialog` prompts for username (@handle)
5. Redirect to `/` (main app)

### Timer Accuracy Pattern
- **Problem:** iOS suspends JavaScript when screen locks
- **Solution:** Elapsed-time calculation
  - Store `timerStartTime` and `timerEndTime` as timestamps
  - Calculate remaining time: `timerEndTime - Date.now()`
  - Timer survives app backgrounding and screen lock

### Deep Linking
- **URL Scheme:** `contempla://`
- **Examples:**
  - `contempla://timer?tab=timer` (from notification)
  - `contempla://auth/callback` (OAuth redirect)
  - `contempla://spotify/callback` (Spotify OAuth)

### Data Fetching Strategy
- React Query for server state (caching, background refetching)
- Supabase client for DB queries
- Optimistic updates for instant UX (kudos, friend requests)
- Realtime subscriptions for live features

### Privacy Architecture
- Granular controls (3 levels: all/friends/private)
- Enforced at DB level via Row-Level Security
- Privacy settings stored in `profiles` table
- DB functions check visibility before returning data

---

## Styling & Theming

**Tailwind Config:**
- **Theme:** Dark navy (`hsl(222.2 84% 4.9%)`) with gold/amber accents
- **Typography:**
  - Sans: Inter (Google Fonts)
  - Serif: Playfair Display (Google Fonts)
- **Custom Utilities:**
  - `safe-top`, `safe-bottom`, `safe-all` (iOS safe area insets)
  - Glow effects for premium feel
  - Pulse animations for timer completion

**Design System:**
- **shadcn/ui** — Pre-built, customizable components
- **Radix UI** — Accessible primitives (WCAG compliant)
- **Lucide Icons** — Consistent icon library
- **Mobile-First** — Touch targets, bottom sheets, pull-to-refresh

---

## Performance Optimizations

- **React Query caching** — Reduce DB calls
- **Memoization** — Prevent unnecessary re-renders
- **Code splitting** — Dynamic imports (future optimization)
- **Image optimization** — WebP format, lazy loading
- **Service worker** — Cache static assets, fonts
- **Debounced inputs** — Search, autocomplete

---

## Analytics & Monitoring

**Event Tracking:**
- Session completion
- Library opened
- Calendar opened
- Technique added/deleted
- Friend request sent/accepted
- Kudos given
- Spotify connected

**Storage:**
- Events logged to `analytics_events` table
- Periodic backups to `analytics_backups`

**Future Integrations:**
- Google Analytics (planned)
- Sentry error tracking (planned)

---

## Recent Changes

### Latest Updates (Jan 2025)
- ✅ **Audio Mixing Fix** — Meditation bells now play over Spotify without interruption (see [AUDIO_MIXING_SOLUTION.md](./AUDIO_MIXING_SOLUTION.md))

### Previous Updates (Dec 2024)
- ✅ **Flash Screen Removal** — Removed redundant flash overlay before completion screen
- ✅ **Lock Screen Meditation Rollback** — Removed experimental time-sensitive notifications feature
- ✅ **Timer Accuracy Fix** — Implemented elapsed-time calculation (survives screen lock)
- ✅ **Haptic Intensity Maximized** — 800ms vibrations × 3 for unmistakable feedback
- ✅ **Spotify Device Prioritization** — Prefers iPhone over desktop for playback
- ✅ **Custom Notification Sounds** — Maps user's selected sound to notification

---

## Contributing

### Code Style
- **TypeScript** — Strict typing (where practical)
- **ESLint** — React hooks rules enforced
- **Path Aliases** — Use `@/` for `./src/`
- **Comments** — Explain "why", not "what"

### Commit Message Format
```
<type>: <short summary>

<detailed description>

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Types:** `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`

---

## Future Roadmap

- [ ] Android app (Capacitor)
- [ ] Apple Health / HealthKit integration
- [ ] In-app purchases (Contempla+ premium)
- [ ] Guided meditations (audio)
- [ ] Meditation challenges & achievements
- [ ] Dark/light theme toggle
- [ ] Localization (i18n)
- [ ] Offline mode improvements
- [ ] Web3 / NFT badges (experimental)

---

## License

*License information to be added*

---

## Credits

Built with:
- [React](https://react.dev)
- [Vite](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Supabase](https://supabase.com)
- [Capacitor](https://capacitorjs.com)
- [Lovable](https://lovable.dev)

---

**Last Updated:** December 27, 2024
