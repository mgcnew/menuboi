-- Create playlists table
CREATE TABLE public.playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create playlist_tracks junction table
CREATE TABLE public.playlist_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  audio_track_id UUID NOT NULL REFERENCES public.audio_tracks(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(playlist_id, audio_track_id)
);

-- Enable Row Level Security
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;

-- Create policies for playlists
CREATE POLICY "Anyone can view playlists" ON public.playlists FOR SELECT USING (true);
CREATE POLICY "Anyone can insert playlists" ON public.playlists FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update playlists" ON public.playlists FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete playlists" ON public.playlists FOR DELETE USING (true);

-- Create policies for playlist_tracks
CREATE POLICY "Anyone can view playlist_tracks" ON public.playlist_tracks FOR SELECT USING (true);
CREATE POLICY "Anyone can insert playlist_tracks" ON public.playlist_tracks FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update playlist_tracks" ON public.playlist_tracks FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete playlist_tracks" ON public.playlist_tracks FOR DELETE USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_playlists_updated_at
BEFORE UPDATE ON public.playlists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
