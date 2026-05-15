ALTER TABLE public.slideshow_settings 
ADD COLUMN IF NOT EXISTS announcement_interval_minutes integer NOT NULL DEFAULT 5;