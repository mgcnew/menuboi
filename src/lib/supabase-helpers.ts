import { supabase } from "@/integrations/supabase/client";

// Helper functions to work with Supabase tables
// These use type assertions to work around type generation delays

export const menuItemsTable = () => {
  return supabase.from('menu_items');
};

export const audioTracksTable = () => {
  return supabase.from('audio_tracks');
};

export const announcementsTable = () => {
  return supabase.from('announcements');
};

export const playlistsTable = () => {
  return supabase.from('playlists');
};

export const playlistTracksTable = () => {
  return supabase.from('playlist_tracks');
};

export const slideshowSettingsTable = () => {
  return supabase.from('slideshow_settings' as any);
};
