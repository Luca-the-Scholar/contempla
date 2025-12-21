# Contempla — Contemplative Practice with Friends

A meditation and contemplative practice tracking app with social features. Built as a cross-platform application that runs on web (as a PWA) and iOS (via Capacitor).

## Tech Stack Overview

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + TypeScript |
| **Build Tool** | Vite (with SWC for fast compilation) |
| **Styling** | Tailwind CSS + shadcn/ui components |
| **State Management** | React Query (@tanstack/react-query) |
| **Routing** | React Router DOM v6 |
| **Backend/Database** | Supabase (PostgreSQL + Auth + Realtime) |
| **Mobile** | Capacitor 8 (iOS native wrapper) |
| **PWA** | vite-plugin-pwa with Workbox |

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Apps                              │
├──────────────────────┬──────────────────────┬───────────────────┤
│    Web (PWA)         │   iOS (Capacitor)    │   (Future Android)│
│  Service Worker      │   Native Wrapper     │                   │
│  Offline Support     │   Native APIs        │                   │
└──────────────────────┴──────────────────────┴───────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     React Application                            │
├─────────────────────────────────────────────────────────────────┤
│  Views: Timer │ Library │ History │ Community │ Settings        │
├─────────────────────────────────────────────────────────────────┤
│  Components: shadcn/ui + Custom Components                       │
├─────────────────────────────────────────────────────────────────┤
│  Hooks: Analytics, Haptics, Sound, Toast, Wake Lock, etc.       │
├─────────────────────────────────────────────────────────────────┤
│  React Query (data fetching/caching) + Supabase Client          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Supabase                                  │
├──────────────────────┬──────────────────────────────────────────┤
│  PostgreSQL DB       │  Auth (OAuth, Email)                     │
│  Row-Level Security  │  Realtime Subscriptions                  │
│  Database Functions  │  Storage (future)                        │
└──────────────────────┴──────────────────────────────────────────┘
```

## Core Features & Views

### 1. Timer View
- Meditation session timer with circular progress visualization
- Technique selection from user's library
- Sound playback on session start/completion (Tibetan bowls, gongs)
- Haptic feedback via Capacitor
- Wake lock to prevent screen sleep during meditation
- Background notifications for when app is minimized

### 2. Library View
- Personal collection of meditation techniques
- Global technique library (community-submitted, admin-approved)
- Technique upload/submission workflow

### 3. History View
- Session history and statistics
- Manual entry support for offline sessions

### 4. Community View
- Social activity feed of friends' sessions
- Kudos system (likes for sessions)
- Friend management

### 5. Settings View
- Profile management (name, handle)
- Privacy controls
- Timer alert preferences
- Admin panel (for admin users)

## Database Schema (Supabase/PostgreSQL)

Key tables include:

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles with privacy settings |
| `techniques` | User's personal meditation techniques |
| `global_techniques` | Community-submitted techniques (with approval workflow) |
| `sessions` | Logged meditation sessions |
| `session_kudos` | Likes/kudos on sessions |
| `friendships` | Friend connections between users |
| `conversations` / `messages` | Direct messaging |
| `analytics_events` | Event tracking |
| `user_roles` | Admin/user role management |

### Unused Database Objects (Safe to Remove)

The following database objects were implemented but are **not used by any frontend code** and have **no corresponding UX**. They are not called from the application, nor are they triggered automatically. They can be safely removed in a future cleanup:

**Tables:**
- `mastery_scores` — Intended for tracking technique mastery levels per user
- `mastery_history` — Intended for historical mastery progression tracking

**Functions:**
- `update_mastery_after_session` — Would update mastery after completing a session (never called)
- `apply_daily_decay` — Would decay mastery scores over time (never called)
- `calculate_mastery_from_minutes` — Helper for mastery calculation (never called)
- `calculate_mastery_increase` — Helper for mastery calculation (never called)
- `calculate_duration_multiplier` — Helper for mastery calculation (never called)
- `calculate_streak_bonus` — Helper for mastery calculation (never called)
- `recalculate_technique_mastery` — Would recalculate mastery from scratch (never called)

These exist only in the database schema and auto-generated TypeScript types. No React components, hooks, or views reference them.

## Mobile & Native Features (Capacitor)

The app uses **Capacitor 8** for native iOS functionality:

| Plugin | Purpose |
|--------|---------|
| `@capacitor/haptics` | Vibration feedback |
| `@capacitor/local-notifications` | Background timer notifications |
| `@capacitor/share` | Native share sheet |
| `@capacitor/status-bar` | Status bar styling |
| `@capacitor/splash-screen` | Launch screen |
| `@capacitor/app` | App lifecycle events, deep linking |

Custom utilities in `/src/lib/`:
- `haptics.ts` — Vibration patterns
- `notifications.ts` — Notification scheduling
- `native-share.ts` — Share meditation sessions
- `deep-linking.ts` — URL scheme handling
- `app-review.ts` — Prompt for App Store review

## PWA Support

The app is a **Progressive Web App** with:
- Service worker for offline caching (Workbox)
- Web app manifest for "Add to Home Screen"
- Caching strategies for fonts and static assets

## UI/Component System

- **shadcn/ui** — Radix UI primitives with Tailwind styling
- **Tailwind CSS** — Utility-first styling with custom theme
- **Lucide React** — Icon library
- **Recharts** — Data visualization for statistics
- **Sonner** + **Radix Toast** — Notification toasts

## State & Data Flow

1. **Authentication**: Supabase Auth with OAuth support
2. **Data Fetching**: React Query for caching and background refetching
3. **Local State**: React useState/useEffect for component state
4. **Persistence**: localStorage for user preferences (sound, haptic settings)
5. **Real-time**: Supabase subscriptions for activity feed

## Project Structure

```
src/
├── components/
│   ├── views/          # Main app views (Timer, Library, History, etc.)
│   ├── ui/             # shadcn/ui components
│   ├── auth/           # Authentication components
│   ├── admin/          # Admin approval panel
│   ├── community/      # Social features
│   ├── library/        # Technique management
│   ├── settings/       # Settings components
│   ├── shared/         # Reusable components (feeds, dialogs)
│   └── timer/          # Timer-specific components
├── hooks/              # Custom React hooks
├── integrations/
│   └── supabase/       # Supabase client & generated types
├── lib/                # Utility functions
├── pages/              # Route pages (Auth, Index)
└── assets/             # Static assets (teacher portraits)
```

## Getting Started

### Prerequisites
- Node.js & npm ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))

### Development

```sh
# Install dependencies
npm install

# Start development server (runs on port 8080)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### iOS Development

See [IOS_SETUP_GUIDE.md](./IOS_SETUP_GUIDE.md) for detailed instructions on building and running the iOS app.

```sh
# Build web assets
npm run build

# Sync to iOS project
npx cap sync ios

# Open in Xcode
npx cap open ios
```

## Environment Variables

Create a `.env` file with your Supabase credentials:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

## Lovable Integration

This project was bootstrapped with [Lovable](https://lovable.dev). You can continue development via the Lovable platform or locally with your preferred IDE.

**Project URL**: https://lovable.dev/projects/7df366e1-29c8-4092-b7aa-f7ab0eae8e3d
