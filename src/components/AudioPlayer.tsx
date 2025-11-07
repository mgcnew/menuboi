import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Music, SkipForward, SkipBack } from "lucide-react";
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

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const createInterleavedPlaylist = (
    tracks: AudioTrack[],
    announcements: Announcement[]
  ): (AudioTrack | Announcement)[] => {
    if (tracks.length === 0 && announcements.length === 0) return [];
    if (tracks.length === 0) return shuffleArray(announcements);
    if (announcements.length === 0) return shuffleArray(tracks);

    const shuffledTracks = shuffleArray(tracks);
    const shuffledAnnouncements = shuffleArray(announcements);
    const interleaved: (AudioTrack | Announcement)[] = [];

    const maxLength = Math.max(shuffledTracks.length, shuffledAnnouncements.length);

    for (let i = 0; i < maxLength; i++) {
      // Add track first (if available)
      if (i < shuffledTracks.length) {
        interleaved.push(shuffledTracks[i]);
      }
      // Then add announcement (if available)
      if (i < shuffledAnnouncements.length) {
        interleaved.push(shuffledAnnouncements[i]);
      }
    }

    return interleaved;
  };

  // Create an interleaved playlist: music -> announcement -> music -> announcement
  useEffect(() => {
    const interleaved = createInterleavedPlaylist(tracks, announcements);
    setPlaylist(interleaved);
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
    
    // If we reached the end, create a new interleaved playlist with new random order
    if (nextIndex >= playlist.length) {
      const newInterleaved = createInterleavedPlaylist(tracks, announcements);
      setPlaylist(newInterleaved);
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

  const nextTrack = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= playlist.length) {
      const newInterleaved = createInterleavedPlaylist(tracks, announcements);
      setPlaylist(newInterleaved);
      setCurrentIndex(0);
    } else {
      setCurrentIndex(nextIndex);
    }
  };

  const previousTrack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setCurrentIndex(playlist.length - 1);
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
            <div className="flex items-center gap-1">
              <button
                onClick={previousTrack}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                aria-label="Música anterior"
              >
                <SkipBack className="h-4 w-4" />
              </button>
              <button
                onClick={nextTrack}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                aria-label="Próxima música"
              >
                <SkipForward className="h-4 w-4" />
              </button>
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
      </div>
    </>
  );
};
