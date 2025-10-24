-- Create announcements/voiceovers table
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Anyone can view announcements" 
ON public.announcements 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert announcements" 
ON public.announcements 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update announcements" 
ON public.announcements 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete announcements" 
ON public.announcements 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for announcements
INSERT INTO storage.buckets (id, name, public) 
VALUES ('announcements', 'announcements', true);

-- Create storage policies for announcements bucket
CREATE POLICY "Anyone can view announcements" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'announcements');

CREATE POLICY "Anyone can upload announcements" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'announcements');

CREATE POLICY "Anyone can update announcements" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'announcements');

CREATE POLICY "Anyone can delete announcements" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'announcements');