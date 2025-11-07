import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Music, SkipForward, SkipBack } from "lucide-react";
import { AudioTrack, Announcement } from "@/types/slideshow";
import { supabase } from "@/integrations/supabase/client";

interface AudioPlayerProps {
  tracks: AudioTrack[];
  announcements: Announcement[];
}

interface PlaylistItem {
  id: string;
  name: string;
  filePath: string;
  type: 'track' | 'announcement';
}

export const AudioPlayer = ({ tracks, announcements }: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [nextUrl, setNextUrl] = useState<string>("");

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
  ): PlaylistItem[] => {
    if (tracks.length === 0 && announcements.length === 0) return [];
    
    const trackItems: PlaylistItem[] = tracks.map(t => ({
      id: t.id,
      name: t.name,
      filePath: t.url, // This is actually the file_path from DB
      type: 'track' as const
    }));
    
    const announcementItems: PlaylistItem[] = announcements.map(a => ({
      id: a.id,
      name: a.name,
      filePath: a.url, // This is actually the file_path from DB
      type: 'announcement' as const
    }));
    
    if (trackItems.length === 0) return shuffleArray(announcementItems);
    if (announcementItems.length === 0) return shuffleArray(trackItems);

    const shuffledTracks = shuffleArray(trackItems);
    const shuffledAnnouncements = shuffleArray(announcementItems);
    const interleaved: PlaylistItem[] = [];

    const maxLength = Math.max(shuffledTracks.length, shuffledAnnouncements.length);

    for (let i = 0; i < maxLength; i++) {
      if (i < shuffledTracks.length) {
        interleaved.push(shuffledTracks[i]);
      }
      if (i < shuffledAnnouncements.length) {
        interleaved.push(shuffledAnnouncements[i]);
      }
    }

    return interleaved;
  };

  // Get public URL for an audio file
  const getAudioUrl = (item: PlaylistItem): string => {
    const bucket = item.type === 'track' ? 'audio-tracks' : 'announcements';
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(item.filePath);
    return publicUrl;
  };

  // Create an interleaved playlist: music -> announcement -> music -> announcement
  useEffect(() => {
    const interleaved = createInterleavedPlaylist(tracks, announcements);
    setPlaylist(interleaved);
    setCurrentIndex(0);
  }, [tracks, announcements]);

  // Load only current and next audio URLs for performance
  useEffect(() => {
    if (playlist.length === 0) return;

    const current = playlist[currentIndex];
    const nextIndex = (currentIndex + 1) % playlist.length;
    const next = playlist[nextIndex];

    // Generate URLs only for current and next audio
    const currentAudioUrl = getAudioUrl(current);
    const nextAudioUrl = getAudioUrl(next);

    setCurrentUrl(currentAudioUrl);
    setNextUrl(nextAudioUrl);
  }, [currentIndex, playlist]);

  // Play current audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentUrl) return;

    audio.src = currentUrl;
    audio.load();
    audio.play().catch(err => console.log('Auto-play prevented:', err));
  }, [currentUrl]);

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

  if (playlist.length === 0 || !currentUrl) return null;

  const currentItem = playlist[currentIndex];
  
  // Preload next audio in background
  if (nextUrl) {
    const preloadAudio = new Audio();
    preloadAudio.src = nextUrl;
    preloadAudio.load();
  }

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
