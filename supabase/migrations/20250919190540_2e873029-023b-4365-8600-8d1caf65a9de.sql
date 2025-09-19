-- Enable realtime for menu_images table
ALTER TABLE public.menu_images REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_images;