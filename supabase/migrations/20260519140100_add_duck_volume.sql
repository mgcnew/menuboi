-- Add music ducking volume column to slideshow_settings
ALTER TABLE slideshow_settings 
ADD COLUMN IF NOT EXISTS music_duck_volume FLOAT DEFAULT 0.08;
