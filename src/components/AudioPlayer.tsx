import { useEffect, useRef, useState } from "react";
import { AudioTrack } from "@/types/slideshow";
import { Volume2, VolumeX, Music, Play, Pause } from "lucide-react";

interface AudioPlayerProps {
  tracks: AudioTrack[];
}

export const AudioPlayer = ({ tracks }: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    if (!audioRef.current || tracks.length === 0) return;

    const audio = audioRef.current;
    audio.volume = volume;

    if (isPlaying) {
      audio.play().catch(err => {
        console.log('Autoplay prevented:', err);
        setIsPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [currentTrackIndex, tracks, isPlaying, volume]);

  const handleTrackEnded = () => {
    // Move to next track
    setCurrentTrackIndex((prev) => (prev + 1) % tracks.length);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
      if (audioRef.current) {
        audioRef.current.muted = false;
      }
    }
  };

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowControls(false), 3000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeout);
    };
  }, []);

  if (tracks.length === 0) return null;

  const currentTrack = tracks[currentTrackIndex];

  return (
    <>
      <audio
        ref={audioRef}
        src={currentTrack.url}
        onEnded={handleTrackEnded}
        onError={() => {
          console.error('Error loading audio track:', currentTrack.name);
          // Skip to next track on error
          handleTrackEnded();
        }}
      />

      <div className={`fixed bottom-4 right-4 bg-slideshow-overlay/80 backdrop-blur-md text-slideshow-text rounded-lg shadow-lg transition-all duration-300 ${
        showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}>
        <div className="p-4 min-w-[300px]">
          <div className="flex items-center gap-3 mb-3">
            <Music className="h-5 w-5 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{currentTrack.name}</p>
              <p className="text-xs opacity-70">
                {currentTrackIndex + 1} de {tracks.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={togglePlayPause}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              aria-label={isPlaying ? "Pausar" : "Reproduzir"}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>

            <button
              onClick={toggleMute}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              aria-label={isMuted ? "Ativar som" : "Silenciar"}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolumeChange}
              className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0"
            />
          </div>
        </div>
      </div>
    </>
  );
};