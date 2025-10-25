import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Music } from "lucide-react";
import { AudioTrack, Announcement } from "@/types/slideshow";

interface AudioPlayerProps {
  tracks: AudioTrack[];
  announcements: Announcement[];
}

export const AudioPlayer = ({ tracks, announcements }: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [playlist, setPlaylist] = useState<(AudioTrack | Announcement)[]>([]);

  const shufflePlaylist = (items: (AudioTrack | Announcement)[]) => {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Create a shuffled playlist mixing tracks and announcements
  useEffect(() => {
    if (tracks.length === 0 && announcements.length === 0) {
      setPlaylist([]);
      return;
    }

    const allItems = [...tracks, ...announcements];
    const shuffled = shufflePlaylist(allItems);

    setPlaylist(shuffled);
    setCurrentIndex(0);
  }, [tracks, announcements]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || playlist.length === 0) return;

    audio.src = playlist[currentIndex].url;
    audio.load();
    audio.play().catch(err => console.log('Auto-play prevented:', err));
  }, [currentIndex, playlist]);

  const handleEnded = () => {
    const nextIndex = currentIndex + 1;
    
    // If we reached the end, reshuffle and start from beginning
    if (nextIndex >= playlist.length) {
      const allItems = [...tracks, ...announcements];
      const reshuffled = shufflePlaylist(allItems);
      setPlaylist(reshuffled);
      setCurrentIndex(0);
    } else {
      // Move to next track
      setCurrentIndex(nextIndex);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Show/hide controls on mouse movement
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

  if (playlist.length === 0) return null;

  const currentItem = playlist[currentIndex];

  return (
    <>
      <audio
        ref={audioRef}
        onEnded={handleEnded}
        autoPlay
      />
      
      {/* Audio controls overlay */}
      <div
        className={`fixed top-4 right-4 z-50 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="bg-slideshow-overlay/80 backdrop-blur-sm text-slideshow-text p-4 rounded-lg shadow-lg">
          <div className="flex items-center space-x-3">
            <Music className="h-5 w-5 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate max-w-[200px]">
                {currentItem.name}
              </p>
              <p className="text-xs opacity-75">
                {currentIndex + 1} de {playlist.length}
              </p>
            </div>
            <button
              onClick={toggleMute}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              aria-label={isMuted ? "Ativar som" : "Silenciar"}
            >
              {isMuted ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
