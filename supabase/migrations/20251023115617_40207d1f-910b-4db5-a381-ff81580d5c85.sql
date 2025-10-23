-- Create function to update timestamps (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create table for audio tracks (music/vinhetas)
CREATE TABLE public.audio_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.audio_tracks ENABLE ROW LEVEL SECURITY;

-- Create policies for audio_tracks
CREATE POLICY "Anyone can view audio tracks" 
ON public.audio_tracks 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert audio tracks" 
ON public.audio_tracks 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update audio tracks" 
ON public.audio_tracks 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete audio tracks" 
ON public.audio_tracks 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_audio_tracks_updated_at
BEFORE UPDATE ON public.audio_tracks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('audio-tracks', 'audio-tracks', true);

-- Create policies for audio storage
CREATE POLICY "Audio tracks are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'audio-tracks');

CREATE POLICY "Anyone can upload audio tracks" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'audio-tracks');

CREATE POLICY "Anyone can update audio tracks" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'audio-tracks');

CREATE POLICY "Anyone can delete audio tracks" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'audio-tracks');