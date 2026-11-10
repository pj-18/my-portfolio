# Praveen Ponduru — Portfolio & Film Diary

A mobile-first personal portfolio and cinema hub built with React, TypeScript, Tailwind CSS, and Vite. Inspired by Letterboxd, it brings together a cinephile profile, Top 4 favorite films, live Letterboxd diary sync, and an interactive Academy Awards watchlist and predictions tracker.

## Features

- **Mobile-First Preview Frame (`MobileFramePreview`)**: Displays a simulated mobile phone frame (`430px` max width with status bar) on desktop viewports, with a floating toggle to switch between **Phone Frame** and **Full Width** layouts.
- **Cinephile Profile Header (`ProfileHeader`)**: Showcases profile avatar, tagline, location, Letterboxd handle, bio, "Currently Watching" status, and film watch statistics (`All Time`, `This Year`, and `Avg Rating`).
- **Top 4 Favorites (`TopFourFilms`)**: Displays four featured favorite films with poster art, directors, release years, and direct links to Letterboxd.
- **Live Letterboxd Diary (`LetterboxdDiary` & `src/services/letterboxd.ts`)**:
  - Fetches the 5 latest diary entries from a Letterboxd user's RSS feed via multi-strategy CORS/RSS fallbacks (`allorigins.win`, `corsproxy.io`, and `rss2json.com`), with cached fallback entries (`fallbackDiaryEntries`) for offline/CORS resilience.
  - Supports expanding reviews, viewing rewatch indicators, refreshing entries, and switching the tracked Letterboxd username inline (persisted in `localStorage`).
- **Oscar Season Hub (`OscarSection`, `OscarTracker`, `OscarPredictions`)**:
  - **Nominees Watched**: Filterable nominee checklist (`All`, `Best Picture`, `Director`, `Acting`, `Animated`) with completion percentage bar, `localStorage` persistence (`oscar_watched_ids`), `Mark all` / `Reset` controls, and a `canvas-confetti` celebration at 100%.
  - **Predictions**: Category-by-category breakdown comparing **Will Win** (predicted winner) vs. **Should Win** (personal pick), personal commentary notes, and full nominee lists.
- **Connect & Floating Navigation (`SocialLinks`, `BottomNav`)**: Cards for Letterboxd, Instagram, LinkedIn, and Email (with copy-to-clipboard), paired with a smooth-scrolling floating bottom navigation bar (`About`, `Top 4`, `Diary`, `Oscars`, `Links`).

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`)
- **Icons**: `lucide-react`
- **Effects**: `canvas-confetti`
- **Linter**: `oxlint`

## Getting Started

### Prerequisites

- Node.js (LTS recommended) and `npm`

### Installation & Development

```bash
# Install dependencies
npm install

# Start the local development server
npm run dev
```

### Available Scripts

| Script | Command | Description |
| --- | --- | --- |
| `dev` | `npm run dev` | Starts the Vite development server with HMR |
| `build` | `npm run build` | Type-checks with `tsc -b` and builds for production |
| `lint` | `npm run lint` | Runs `oxlint` across the codebase |
| `preview` | `npm run preview` | Locally previews the production `dist/` build |

## Configuration

All personal content and season data are centralized in `src/config/portfolio.config.ts` (typed by `PortfolioConfig` in `src/types/index.ts`):

- `profile` — Name, handle, tagline, bio, location, avatar URL, currently watching, and film stats
- `letterboxd` — Default Letterboxd username and profile URL for live RSS diary fetching
- `socials` — Links for Letterboxd, Instagram, LinkedIn, Email, and Twitter/X
- `topFourFilms` — Your 4 featured favorite films
- `oscarSeason` — Toggle (`isActive`), season metadata, nominee checklist items, and category predictions

## Project Structure

```text
├── index.html
├── package.json
├── vite.config.ts
├── .oxlintrc.json
└── src/
    ├── App.tsx
    ├── main.tsx
    ├── index.css
    ├── App.css
    ├── config/
    │   └── portfolio.config.ts
    ├── types/
    │   └── index.ts
    ├── services/
    │   └── letterboxd.ts
    └── components/
        ├── BottomNav.tsx
        ├── LetterboxdDiary.tsx
        ├── MobileFramePreview.tsx
        ├── OscarPredictions.tsx
        ├── OscarSection.tsx
        ├── OscarTracker.tsx
        ├── ProfileHeader.tsx
        ├── SocialLinks.tsx
        └── TopFourFilms.tsx
```
