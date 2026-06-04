import { useState, useEffect, useCallback, memo } from "react";
import { SlideshowSettings } from "@/types/slideshow";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WeatherData {
  temperature: number;
  weatherCode: number;
}

interface InfoWidgetProps {
  settings: SlideshowSettings;
}

// Weather code to emoji mapping
const getWeatherEmoji = (code: number): string => {
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "🌫️";
  if (code <= 57) return "🌧️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "🌨️";
  if (code <= 82) return "🌧️";
  if (code <= 86) return "🌨️";
  if (code >= 95) return "⛈️";
  return "🌤️";
};

// Position classes mapping
const getPositionClasses = (position: string): string => {
  switch (position) {
    case "top-left":
      return "top-4 left-4";
    case "top-right":
      return "top-4 right-4";
    case "bottom-left":
      return "bottom-[120px] left-8";
    case "bottom-right":
      return "bottom-4 right-4";
    case "bottom-center":
      return "bottom-[120px] left-1/2 -translate-x-1/2";
    default:
      return "top-4 right-4";
  }
};

const ClockWidget = memo(() => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-4xl font-bold tabular-nums">
      {format(time, "HH:mm")}
    </div>
  );
});
ClockWidget.displayName = "ClockWidget";

const DateWidget = memo(() => {
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setDate(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-lg opacity-90 capitalize">
      {format(date, "EEE, d MMM", { locale: ptBR })}
    </div>
  );
});
DateWidget.displayName = "DateWidget";

const WeatherWidget = memo(({ lat, lon }: { lat: number; lon: number }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  const fetchWeather = useCallback(async () => {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
      );
      if (response.ok) {
        const data = await response.json();
        setWeather({
          temperature: Math.round(data.current_weather.temperature),
          weatherCode: data.current_weather.weathercode,
        });
      }
    } catch (error) {
      console.error("[InfoWidget] Weather fetch error:", error);
    }
  }, [lat, lon]);

  useEffect(() => {
    fetchWeather();
    // Update every 30 minutes
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchWeather]);

  if (!weather) return null;

  return (
    <div className="text-lg flex items-center gap-2">
      <span>{getWeatherEmoji(weather.weatherCode)}</span>
      <span>{weather.temperature}°C</span>
    </div>
  );
});
WeatherWidget.displayName = "WeatherWidget";

export const InfoWidget = memo(({ settings }: InfoWidgetProps) => {
  const showInfoWidget = settings.showClock || settings.showWeather;

  return (
    <>
      {/* Clock/Date/Weather Widget */}
      {showInfoWidget && (
        <div
          className={`absolute ${getPositionClasses("top-right")} z-20`}
        >
          <div
            className={`
              px-5 py-4 rounded-3xl backdrop-blur-xl bg-black/40 text-white shadow-2xl border border-white/10 flex flex-col items-center gap-1
            `}
          >
            {settings.showClock && <ClockWidget />}
            {settings.showWeather && (
              <WeatherWidget lat={settings.weatherLat} lon={settings.weatherLon} />
            )}
          </div>
        </div>
      )}

      {/* Custom Message */}
      {settings.customMessage && (
        <div
          className={`absolute ${getPositionClasses(settings.customMessagePosition)} z-20`}
        >
          <div
            className={`
              px-8 py-4 rounded-3xl backdrop-blur-2xl text-2xl font-black bg-black/60 text-white border border-white/20 shadow-2xl tracking-tighter uppercase transition-all animate-in fade-in zoom-in duration-500
            `}
          >
            {settings.customMessage}
          </div>
        </div>
      )}
    </>
  );
});
InfoWidget.displayName = "InfoWidget";