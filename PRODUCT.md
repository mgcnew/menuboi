# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The owner or manager of Novo Boi João Dias, a butcher shop (açougue / casa de carnes) with TVs inside the store. They manage the TV content from a computer, sitting at the office or the checkout, and organize it calmly rather than in quick bursts.

## Product Purpose

Menu Board runs the shop's in-store TVs: a slideshow of menu boards, promotions, and videos, with background music and recorded announcements (locuções). The dashboard (`/dashboard`) is where the owner uploads, orders, schedules by weekday, and removes that content, and where they set playback behavior. Success means the owner always knows what the TV is showing today and can change a promotion in a few clicks.

## Positioning

Built for one shop's own TVs, not a generic signage SaaS: the dashboard speaks the shop's language (mídia, músicas, locuções, playlists, dias da semana) and mirrors exactly what the store floor sees.

## Operating Context

- TVs in the store open `/slideshow`; a TV links to the account through `/tv` and `/link` (QR code / code pairing) and is driven by a remote control.
- Content is scheduled per weekday; the dashboard shows what plays "hoje".
- Audio has three libraries kept in separate nested tabs: music, announcements, playlists.
- The dashboard has a light and a dark theme toggle.

## Capabilities and Constraints

- Stack: Vite + React + TypeScript, Tailwind, shadcn/ui (Radix), Supabase (auth, database, storage). Originated in Lovable.
- Media: JPG, PNG, WebP images (compressed on upload) and MP4/WebM videos, with per-item display time, transition, weekday schedule, and video autoplay/mute/loop.
- Global settings: display interval, transition type, weekday schedule, audio settings, slideshow appearance.
- Interface language is Brazilian Portuguese.
- Music, announcement, and playlist management stay in separate nested audio tabs, reusing their upload and list components (AGENTS.md).

## Brand Commitments

- Name: Novo Boi João Dias. Logo at `src/assets/logo-novo-boi.png`: chrome 3D lettering with red extrusion plus a red "João Dias" script signature.
- Brand red is already a token (`--brand`).
- The dashboard follows the category standard on purpose (chosen 2026-10-28): a conventional admin panel at the craft level of Stripe Dashboard, not an expressive brand world.

## Evidence on Hand

- The logo above. No photography of the shop, products, or staff is in the repo; do not invent customers, prices, or products.

## Product Principles

1. The TV is the truth: the dashboard always shows what the store floor is seeing today.
2. Changing a promotion is the main job; it should take the fewest possible steps.
3. Settings are explained in the owner's terms, grouped by what they affect on the TV.
4. The panel should feel like it belongs to Novo Boi, not like a generic admin template.
