-- Create menu_items table
CREATE TABLE public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  display_time INTEGER NOT NULL DEFAULT 10,
  transition_type TEXT NOT NULL DEFAULT 'fade',
  item_type TEXT NOT NULL DEFAULT 'image',
  video_autoplay BOOLEAN,
  video_muted BOOLEAN,
  video_loop BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (digital menu board)
CREATE POLICY "Anyone can view menu items" 
ON public.menu_items 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert menu items" 
ON public.menu_items 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update menu items" 
ON public.menu_items 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete menu items" 
ON public.menu_items 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_menu_items_updated_at
BEFORE UPDATE ON public.menu_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for menu images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('menu-images', 'menu-images', true);

-- Create storage policies for menu-images bucket
CREATE POLICY "Anyone can view menu images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'menu-images');

CREATE POLICY "Anyone can upload menu images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'menu-images');

CREATE POLICY "Anyone can update menu images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'menu-images');

CREATE POLICY "Anyone can delete menu images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'menu-images');