-- Add volume control columns to slideshow_settings
ALTER TABLE slideshow_settings 
ADD COLUMN IF NOT EXISTS music_volume FLOAT DEFAULT 0.45,
ADD COLUMN IF NOT EXISTS announcement_volume FLOAT DEFAULT 1.0;
