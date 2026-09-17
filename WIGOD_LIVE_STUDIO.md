# WIGOD Live Studio

The creator broadcasting workspace is designed around one Studio feed with multiple publishing destinations.

## Studio controls

- Camera and microphone preview controls
- Broadcast title and description
- Custom thumbnail upload and preview
- Public, Unlisted, and Private visibility
- Viewer comments on/off
- Branding and lower-third overlay controls
- YouTube, Facebook, TikTok and WIGOD destination selection
- Schedule Live and Start Live actions

## Publishing architecture

The browser Studio is the creator interface. Actual multi-platform live transport must be provided by a dedicated media/egress layer rather than by the Next.js/Vercel request runtime.

YouTube is the primary destination for the first production publishing integration. Facebook and TikTok are represented as destination connections and can be enabled when their platform authorization and live publishing requirements are configured.

## Important implementation boundary

The current Studio UI does not pretend that a browser button alone can publish a live video stream. The production transport layer, destination OAuth/credentials, stream lifecycle, and server-side egress are separate implementation work.
