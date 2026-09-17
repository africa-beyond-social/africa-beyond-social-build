# africa-beyond-social-build

This is the Next.js application for **Africa & Beyond Social**.

## Africa & Beyond Live setup

The Live Centre supports automatic YouTube Live detection, a live player, persistent scheduled events in Supabase, live-event countdowns, social conversations and an administrator control room at `/live/manage`.

### Required environment variables

Set these in Vercel:

- `YOUTUBE_API_KEY` — server-side YouTube Data API key
- `YOUTUBE_CHANNEL_ID` — Africa & Beyond TV YouTube channel ID
- `SUPABASE_SECRET_KEY` — server-only Supabase secret for Live event management
- `LIVE_ADMIN_EMAILS` — comma-separated Supabase Auth email addresses allowed to manage Live events

The existing public Supabase URL and publishable key remain required by the application.

### Database

Apply `supabase/migrations/20260917110800_create_live_events.sql` to the connected Supabase project. It creates the `live_events` table with RLS enabled and public read access.

Administrators can then use `/live/manage` to create and delete scheduled programmes. Never expose `YOUTUBE_API_KEY` or `SUPABASE_SECRET_KEY` to the browser.
