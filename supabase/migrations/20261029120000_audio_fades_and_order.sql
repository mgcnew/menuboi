-- Tempos de fade do ducking e ordem da música (aleatória ou na ordem da lista/playlist)
ALTER TABLE slideshow_settings
ADD COLUMN IF NOT EXISTS duck_fade_down_ms INTEGER DEFAULT 900,
ADD COLUMN IF NOT EXISTS duck_fade_up_ms INTEGER DEFAULT 1600,
ADD COLUMN IF NOT EXISTS music_shuffle BOOLEAN DEFAULT true;

-- Garante que as TVs recebam mudanças das listas em tempo real (idempotente)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['menu_items', 'audio_tracks', 'announcements', 'playlist_tracks'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
