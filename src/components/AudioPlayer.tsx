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
  const urlCache = useRef(new Map<string, string>());
  const playlistRef = useRef<PlaylistItem[]>([]);
  const indexRef = useRef(0);
  const isPlayingRef = useRef(false);

  const [currentName, setCurrentName] = useState("");
  const [currentPos, setCurrentPos] = useState("0/0");
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [hasPlaylist, setHasPlaylist] = useState(false);

  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  // Get audio URL with caching
  const getUrl = useCallback((item: PlaylistItem): string => {
    const key = `${item.type}-${item.filePath}`;
    const cached = urlCache.current.get(key);
    if (cached) return cached;
    const bucket = item.type === "track" ? "audio-tracks" : "announcements";
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(item.filePath);
    urlCache.current.set(key, publicUrl);
    return publicUrl;
  }, []);

  // Create interleaved playlist
  const createPlaylist = useCallback((): PlaylistItem[] => {
    const trackItems: PlaylistItem[] = tracks.map((t) => ({
      id: t.id, name: t.name, filePath: t.url, type: "track",
    }));
    const announcementItems: PlaylistItem[] = announcements.map((a) => ({
      id: a.id, name: a.name, filePath: a.url, type: "announcement",
    }));

    if (trackItems.length === 0 && announcementItems.length === 0) return [];
    if (trackItems.length === 0) return shuffle(announcementItems);
    if (announcementItems.length === 0) return shuffle(trackItems);

    const shuffledTracks = shuffle(trackItems);
    const shuffledAnnouncements = shuffle(announcementItems);
    const result: PlaylistItem[] = [];
    const maxLength = Math.max(shuffledTracks.length, shuffledAnnouncements.length);

    for (let i = 0; i < maxLength; i++) {
      result.push(shuffledAnnouncements[i % shuffledAnnouncements.length]);
      result.push(shuffledTracks[i % shuffledTracks.length]);
    }
    return result;
  }, [tracks, announcements]);

  // Play a specific index without re-rendering
  const playIndex = useCallback((index: number) => {
    const audio = audioRef.current;
    const playlist = playlistRef.current;
    if (!audio || playlist.length === 0) return;

    const idx = ((index % playlist.length) + playlist.length) % playlist.length;
    indexRef.current = idx;
    const item = playlist[idx];

    setCurrentName(item.name);
    setCurrentPos(`${idx + 1}/${playlist.length}`);

    const url = getUrl(item);
    audio.src = url;
    // Use low-priority loading - don't block images
    audio.preload = "auto";
    audio.load();
    
    // Small delay to avoid competing with image loading on the main thread
    const playTimer = setTimeout(() => {
      audio.play().catch(() => {
        // Autoplay blocked - retry once on user interaction
        console.log("[AudioPlayer] Autoplay blocked, will retry");
      });
      isPlayingRef.current = true;
    }, 100);

    return () => clearTimeout(playTimer);
  }, [getUrl]);

  // Initialize playlist when tracks/announcements change
  useEffect(() => {
    urlCache.current.clear();
    const newPlaylist = createPlaylist();
    playlistRef.current = newPlaylist;
    indexRef.current = 0;
    setHasPlaylist(newPlaylist.length > 0);

    if (newPlaylist.length > 0) {
      playIndex(0);
    }
  }, [createPlaylist, playIndex]);

  // Handle track end - advance to next
  const handleEnded = useCallback(() => {
    const nextIndex = indexRef.current + 1;
    if (nextIndex >= playlistRef.current.length) {
      // Regenerate and restart
      const newPlaylist = createPlaylist();
      playlistRef.current = newPlaylist;
      playIndex(0);
    } else {
      playIndex(nextIndex);
    }
  }, [createPlaylist, playIndex]);

  // Handle load errors - skip to next track
  const handleError = useCallback(() => {
    console.warn("[AudioPlayer] Error loading track, skipping:", playlistRef.current[indexRef.current]?.name);
    const nextIndex = indexRef.current + 1;
    if (nextIndex < playlistRef.current.length) {
      // Small delay before skipping to avoid rapid error loops
      setTimeout(() => playIndex(nextIndex), 500);
    }
  }, [playIndex]);

  // Controls
  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted((m) => !m);
    }
  }, []);

  const next = useCallback(() => {
    const nextIndex = indexRef.current + 1;
    if (nextIndex >= playlistRef.current.length) {
      const newPlaylist = createPlaylist();
      playlistRef.current = newPlaylist;
      playIndex(0);
    } else {
      playIndex(nextIndex);
    }
  }, [createPlaylist, playIndex]);

  const prev = useCallback(() => {
    const prevIndex = indexRef.current > 0 ? indexRef.current - 1 : playlistRef.current.length - 1;
    playIndex(prevIndex);
  }, [playIndex]);

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

  if (!hasPlaylist) return null;

  return (
    <>
      <audio
        ref={audioRef}
        onEnded={handleEnded}
        onError={handleError}
        preload="auto"
      />

      <div
        className={`fixed top-4 right-4 z-50 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="bg-black/80 text-white p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <Music className="h-5 w-5 text-blue-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate max-w-[200px]">{currentName}</p>
              <p className="text-xs opacity-75">{currentPos}</p>
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
