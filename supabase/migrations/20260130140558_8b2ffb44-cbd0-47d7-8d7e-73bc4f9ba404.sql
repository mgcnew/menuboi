-- Create slideshow_settings table
CREATE TABLE public.slideshow_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  theme TEXT NOT NULL DEFAULT 'dark',
  show_clock BOOLEAN NOT NULL DEFAULT true,
  show_date BOOLEAN NOT NULL DEFAULT true,
  show_weather BOOLEAN NOT NULL DEFAULT false,
  weather_location TEXT DEFAULT 'São Paulo',
  weather_lat DECIMAL(10, 6) DEFAULT -23.5505,
  weather_lon DECIMAL(10, 6) DEFAULT -46.6333,
  show_logo BOOLEAN NOT NULL DEFAULT false,
  logo_url TEXT,
  logo_position TEXT NOT NULL DEFAULT 'top-left',
  custom_message TEXT,
  custom_message_position TEXT NOT NULL DEFAULT 'bottom-center',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.slideshow_settings ENABLE ROW LEVEL SECURITY;

-- Create policies (public access since no auth)
CREATE POLICY "Anyone can view slideshow_settings"
ON public.slideshow_settings
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert slideshow_settings"
ON public.slideshow_settings
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update slideshow_settings"
ON public.slideshow_settings
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete slideshow_settings"
ON public.slideshow_settings
FOR DELETE
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_slideshow_settings_updated_at
BEFORE UPDATE ON public.slideshow_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.slideshow_settings;

-- Insert default settings row
INSERT INTO public.slideshow_settings (theme, show_clock, show_date, show_weather, show_logo)
VALUES ('dark', true, true, false, false);