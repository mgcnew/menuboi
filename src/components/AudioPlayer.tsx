import { useEffect, useRef, useState, useCallback } from "react";
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
  type: "track" | "announcement";
}

// Shuffle utility
const shuffle = <T,>(arr: T[]): T[] => {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export const AudioPlayer = ({ tracks, announcements }: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const preloadRef = useRef<HTMLAudioElement | null>(null);
  const urlCache = useRef(new Map<string, string>());

  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(false);

  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  // Get audio URL with caching
  const getUrl = useCallback((item: PlaylistItem): string => {
    const key = `${item.type}-${item.filePath}`;
    if (urlCache.current.has(key)) {
      return urlCache.current.get(key)!;
    }
    const bucket = item.type === "track" ? "audio-tracks" : "announcements";
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(item.filePath);
    urlCache.current.set(key, publicUrl);
    return publicUrl;
  }, []);

  // Create interleaved playlist
  const createPlaylist = useCallback((): PlaylistItem[] => {
    const trackItems: PlaylistItem[] = tracks.map((t) => ({
      id: t.id,
      name: t.name,
      filePath: t.url,
      type: "track",
    }));

    const announcementItems: PlaylistItem[] = announcements.map((a) => ({
      id: a.id,
      name: a.name,
      filePath: a.url,
      type: "announcement",
    }));

    if (trackItems.length === 0 && announcementItems.length === 0) return [];
    if (trackItems.length === 0) return shuffle(announcementItems);
    if (announcementItems.length === 0) return shuffle(trackItems);

    // Interleave: track, announcement, track, announcement...
    const shuffledTracks = shuffle(trackItems);
    const shuffledAnnouncements = shuffle(announcementItems);
    const result: PlaylistItem[] = [];
    const max = Math.max(shuffledTracks.length, shuffledAnnouncements.length);

    for (let i = 0; i < max; i++) {
      if (i < shuffledTracks.length) result.push(shuffledTracks[i]);
      if (i < shuffledAnnouncements.length) result.push(shuffledAnnouncements[i]);
    }

    return result;
  }, [tracks, announcements]);

  // Initialize playlist
  useEffect(() => {
    urlCache.current.clear();
    const newPlaylist = createPlaylist();
    setPlaylist(newPlaylist);
    setCurrentIndex(0);
  }, [createPlaylist]);

  // Play current track
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || playlist.length === 0) return;

    const current = playlist[currentIndex];
    const url = getUrl(current);

    audio.src = url;
    audio.load();
    audio.play().catch(() => {});

    // Preload next
    const nextIndex = (currentIndex + 1) % playlist.length;
    const next = playlist[nextIndex];
    if (next) {
      if (!preloadRef.current) {
        preloadRef.current = new Audio();
        preloadRef.current.muted = true;
      }
      preloadRef.current.src = getUrl(next);
      preloadRef.current.load();
    }
  }, [currentIndex, playlist, getUrl]);

  // Handle track end
  const handleEnded = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= playlist.length) {
      // Regenerate playlist
      const newPlaylist = createPlaylist();
      setPlaylist(newPlaylist);
      setCurrentIndex(0);
    } else {
      setCurrentIndex(nextIndex);
    }
  }, [currentIndex, playlist.length, createPlaylist]);

  // Controls
  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const next = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= playlist.length) {
      const newPlaylist = createPlaylist();
      setPlaylist(newPlaylist);
      setCurrentIndex(0);
    } else {
      setCurrentIndex(nextIndex);
    }
  };

  const prev = () => {
    setCurrentIndex(currentIndex > 0 ? currentIndex - 1 : playlist.length - 1);
  };

  // Mouse controls visibility
  useEffect(() => {
    const handleMove = () => {
      setShowControls(true);
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    };

    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMove);
      clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  if (playlist.length === 0) return null;

  const current = playlist[currentIndex];

  return (
    <>
      <audio ref={audioRef} onEnded={handleEnded} autoPlay />

      <div
        className={`fixed top-4 right-4 z-50 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="bg-black/80 text-white p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <Music className="h-5 w-5 text-blue-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate max-w-[200px]">{current.name}</p>
              <p className="text-xs opacity-75">
                {currentIndex + 1} de {playlist.length}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={prev} className="p-2 hover:bg-white/10 rounded-full">
                <SkipBack className="h-4 w-4" />
              </button>
              <button onClick={next} className="p-2 hover:bg-white/10 rounded-full">
                <SkipForward className="h-4 w-4" />
              </button>
              <button onClick={toggleMute} className="p-2 hover:bg-white/10 rounded-full">
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
