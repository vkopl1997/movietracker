# 🎬 MovieTracker

A personal movie & TV show tracker. Discover what's trending, search any title, save favorites, and never forget what you've watched.

Built with **React + Vite + Tailwind + Supabase + TMDb API**.

## Features

- 🔍 Live debounced search across movies + TV shows
- 📄 Rich detail pages with backdrop, overview, ratings, and cast
- 🔐 Google sign-in (via Supabase Auth)
- 💛 Favorites synced to the cloud — works across devices
- 🌗 Dark / light theme with persistence
- 🔔 Notification center with persistent history
- 🎞️ Cinematic UI with Framer Motion animations
- 📱 Fully responsive (2 → 6 column grid)

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, React Router |
| Styling | Tailwind CSS + Framer Motion |
| Auth + DB | Supabase (Postgres + RLS + Google OAuth) |
| Movie data | The Movie Database (TMDb) API |

## Run locally

```bash
npm install
cp .env.example .env.local       # then fill in your keys
npm run dev
```

### Environment variables

Create `.env.local` with:

```bash
VITE_TMDB_TOKEN=your_tmdb_v4_token
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

You'll also need to enable Google as an auth provider in your Supabase project and run the SQL in `supabase/schema.sql` (see `Setup` section below).

## License

MIT
