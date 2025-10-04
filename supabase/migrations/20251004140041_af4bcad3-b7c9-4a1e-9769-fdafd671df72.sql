-- Rename table to be more generic and add support for videos
ALTER TABLE public.menu_images RENAME TO menu_items;

-- Add type column to distinguish between images and videos
ALTER TABLE public.menu_items 
ADD COLUMN item_type TEXT NOT NULL DEFAULT 'image';

-- Add constraint to ensure valid item types
ALTER TABLE public.menu_items 
ADD CONSTRAINT valid_item_type CHECK (item_type IN ('image', 'video'));

-- Update RLS policies to use new table name
DROP POLICY IF EXISTS "Anyone can delete menu images" ON public.menu_items;
DROP POLICY IF EXISTS "Anyone can insert menu images" ON public.menu_items;
DROP POLICY IF EXISTS "Anyone can update menu images" ON public.menu_items;
DROP POLICY IF EXISTS "Menu images are viewable by everyone" ON public.menu_items;

-- Create new policies for menu_items
CREATE POLICY "Anyone can delete menu items" 
ON public.menu_items 
FOR DELETE 
USING (true);

CREATE POLICY "Anyone can insert menu items" 
ON public.menu_items 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update menu items" 
ON public.menu_items 
FOR UPDATE 
USING (true);

CREATE POLICY "Menu items are viewable by everyone" 
ON public.menu_items 
FOR SELECT 
USING (true);

-- Update existing records to have image type
UPDATE public.menu_items SET item_type = 'image' WHERE item_type = 'image';

-- Add video-specific columns
ALTER TABLE public.menu_items 
ADD COLUMN video_autoplay BOOLEAN DEFAULT true,
ADD COLUMN video_muted BOOLEAN DEFAULT true,
ADD COLUMN video_loop BOOLEAN DEFAULT false;