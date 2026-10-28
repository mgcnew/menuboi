---
version: 1
slug: "src-pages-dashboard-tsx"
primary_target: "src/pages/Dashboard.tsx"
related_targets: []
---

# Dashboard (/dashboard)

Scope: the owner's control panel for the shop's TVs. Mode: Operate.
Audience and job: the owner/manager of Novo Boi João Dias, at a computer, managing what the in-store TVs show and play. Jobs: see what is on the TV today, change promotions quickly (upload, order, schedule by weekday, remove), find settings by what they affect.
Constraints: keep music, announcements, and playlists as separate nested audio tabs reusing their components (AGENTS.md); keep every existing function and Supabase behavior; Portuguese copy; light and dark themes; TV routes keep their own look.

## Direction contract

THESIS: The category standard, played straight at Stripe Dashboard craft: a calm, well-aligned admin where the TV's current program is the first thing read. Refuses the floating glass header, stacked shadowed cards, and hover-only controls of the current panel.
OWN-WORLD: Cool neutral grey ground, white content surfaces with 1px borders and small soft shadows, a slightly darker sidebar layer. One accent: Novo Boi brand red for primary actions, selection, and the "no ar" state; green only for live. Inter, one family, tight 1.125 scale, tabular numerals. 8px radius, 4px grid.
STORY: The owner opens the panel, sees what the TV shows today (the app has no TV connection signal, so it never claims one), then changes a promotion in a few clicks and leaves confident.
FIRST VIEWPORT: Left sidebar (240px): logo, nav Mídia / Áudio / Configurações, TV status card, theme and logout at the foot. Main: page header with title, one-line description, actions "Abrir na TV" and primary "Enviar mídia". Below, a "Hoje na TV" panel: live preview left, today's lineup and counts right. Then the media library grid with a status filter (Todas / No ar hoje / Outros dias), each card with name, duration, days, and visible actions.
FORM: canon (category standard, standing exit), reference product Stripe Dashboard. seed:0d0ce156ed195c75
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
