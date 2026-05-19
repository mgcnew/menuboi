-- Drop legacy public write policies on storage.objects
DROP POLICY IF EXISTS "Anyone can upload audio tracks" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update audio tracks" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete audio tracks" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload menu images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update menu images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete menu images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload announcements" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update announcements" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete announcements" ON storage.objects;

-- TV pairing table (accessed only via edge functions w/ service role)
CREATE TABLE public.tv_pairings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  poll_token text NOT NULL UNIQUE,
  access_token text,
  refresh_token text,
  claimed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes')
);

ALTER TABLE public.tv_pairings ENABLE ROW LEVEL SECURITY;
-- No policies => no direct access from anon/authenticated clients.

CREATE INDEX idx_tv_pairings_code ON public.tv_pairings(code);
CREATE INDEX idx_tv_pairings_poll_token ON public.tv_pairings(poll_token);