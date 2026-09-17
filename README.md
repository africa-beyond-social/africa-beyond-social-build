# africa-beyond-social-build

This is the Next.js application for **Africa & Beyond Social**.

## Africa & Beyond Live setup

The Live Centre supports:

- automatic YouTube Live detection through the YouTube Data API
- a live broadcast player that appears when an active broadcast is detected
- scheduled events stored in Supabase
- an administrator control room at `/live/manage`
- live-event countdowns and broadcast metadata
- existing social conversations around live events

### Required environment variables

Set these in Vercel for the deployment:

- `YOUTUBE_API_KEY` — server-side YouTube Data API key
- `YOUTUBE_CHANNEL_ID` — Africa & Beyond TV YouTube channel ID
- `SUPABASE_SECRET_KEY` — server-only Supabase secret for the Live control room
- `LIVE_ADMIN_EMAILS` — comma-separated Supabase Auth email addresses allowed to manage Live events

The existing public Supabase URL and publishable key remain required by the application.

### Database

Apply the migration in `supabase/migrations/20260917110800_create_live_events.sql` to the connected Supabase project. It creates the public-readable `live_events` table with RLS enabled.

Once deployed, administrators can open `/live/manage` to create and delete scheduled programmes.

Never expose `YOUTUBE_API_KEY` or `SUPABASE_SECRET_KEY` to the browser.
