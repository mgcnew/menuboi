import { supabase } from "@/integrations/supabase/client";

// Helper functions to work with Supabase tables
// These use type assertions to work around type generation delays

export const menuItemsTable = () => {
  return supabase.from('menu_items');
};

export const audioTracksTable = () => {
  return supabase.from('audio_tracks');
};
