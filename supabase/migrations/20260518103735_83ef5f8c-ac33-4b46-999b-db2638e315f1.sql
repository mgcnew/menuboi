
-- menu_items
DROP POLICY IF EXISTS "Anyone can insert menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Anyone can update menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Anyone can delete menu items" ON public.menu_items;
CREATE POLICY "Authenticated can insert menu items" ON public.menu_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update menu items" ON public.menu_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete menu items" ON public.menu_items FOR DELETE TO authenticated USING (true);

-- audio_tracks
DROP POLICY IF EXISTS "Anyone can insert audio tracks" ON public.audio_tracks;
DROP POLICY IF EXISTS "Anyone can update audio tracks" ON public.audio_tracks;
DROP POLICY IF EXISTS "Anyone can delete audio tracks" ON public.audio_tracks;
CREATE POLICY "Authenticated can insert audio tracks" ON public.audio_tracks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update audio tracks" ON public.audio_tracks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete audio tracks" ON public.audio_tracks FOR DELETE TO authenticated USING (true);

-- announcements
DROP POLICY IF EXISTS "Anyone can insert announcements" ON public.announcements;
DROP POLICY IF EXISTS "Anyone can update announcements" ON public.announcements;
DROP POLICY IF EXISTS "Anyone can delete announcements" ON public.announcements;
CREATE POLICY "Authenticated can insert announcements" ON public.announcements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update announcements" ON public.announcements FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete announcements" ON public.announcements FOR DELETE TO authenticated USING (true);

-- playlists
DROP POLICY IF EXISTS "Anyone can insert playlists" ON public.playlists;
DROP POLICY IF EXISTS "Anyone can update playlists" ON public.playlists;
DROP POLICY IF EXISTS "Anyone can delete playlists" ON public.playlists;
CREATE POLICY "Authenticated can insert playlists" ON public.playlists FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update playlists" ON public.playlists FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete playlists" ON public.playlists FOR DELETE TO authenticated USING (true);

-- playlist_tracks
DROP POLICY IF EXISTS "Anyone can insert playlist_tracks" ON public.playlist_tracks;
DROP POLICY IF EXISTS "Anyone can update playlist_tracks" ON public.playlist_tracks;
DROP POLICY IF EXISTS "Anyone can delete playlist_tracks" ON public.playlist_tracks;
CREATE POLICY "Authenticated can insert playlist_tracks" ON public.playlist_tracks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update playlist_tracks" ON public.playlist_tracks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete playlist_tracks" ON public.playlist_tracks FOR DELETE TO authenticated USING (true);

-- slideshow_settings
DROP POLICY IF EXISTS "Anyone can insert slideshow_settings" ON public.slideshow_settings;
DROP POLICY IF EXISTS "Anyone can update slideshow_settings" ON public.slideshow_settings;
DROP POLICY IF EXISTS "Anyone can delete slideshow_settings" ON public.slideshow_settings;
CREATE POLICY "Authenticated can insert slideshow_settings" ON public.slideshow_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update slideshow_settings" ON public.slideshow_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete slideshow_settings" ON public.slideshow_settings FOR DELETE TO authenticated USING (true);

-- Storage: restrict writes to authenticated, keep public read
DROP POLICY IF EXISTS "Public can upload menu-images" ON storage.objects;
DROP POLICY IF EXISTS "Public can update menu-images" ON storage.objects;
DROP POLICY IF EXISTS "Public can delete menu-images" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload audio-tracks" ON storage.objects;
DROP POLICY IF EXISTS "Public can update audio-tracks" ON storage.objects;
DROP POLICY IF EXISTS "Public can delete audio-tracks" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload announcements" ON storage.objects;
DROP POLICY IF EXISTS "Public can update announcements" ON storage.objects;
DROP POLICY IF EXISTS "Public can delete announcements" ON storage.objects;

CREATE POLICY "Authenticated can upload media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('menu-images','audio-tracks','announcements'));
CREATE POLICY "Authenticated can update media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('menu-images','audio-tracks','announcements'));
CREATE POLICY "Authenticated can delete media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('menu-images','audio-tracks','announcements'));
