import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ListMusic, Music, Play, ChevronRight } from "lucide-react";
import { Playlist } from "@/types/slideshow";
import { playlistsTable, playlistTracksTable } from "@/lib/supabase-helpers";

const TVStart = () => {
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<(Playlist & { trackCount: number })[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      const { data, error } = await playlistsTable()
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const playlistsWithCounts = await Promise.all(
          data.map(async (p: any) => {
            const { data: tracks } = await playlistTracksTable()
              .select("id")
              .eq("playlist_id", p.id);

            return {
              id: p.id,
              name: p.name,
              description: p.description,
              createdAt: new Date(p.created_at),
              trackCount: tracks?.length || 0,
            };
          })
        );

        setPlaylists(playlistsWithCounts);
      }
    } catch (error) {
      console.error("Error loading playlists:", error);
    } finally {
      setLoading(false);
    }
  };

  const startSlideshow = (playlistId: string | null) => {
    if (playlistId) {
      navigate(`/slideshow?playlist=${playlistId}`);
    } else {
      navigate("/slideshow");
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const totalOptions = playlists.length + 1;

    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp":
        case "ArrowLeft":
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + totalOptions) % totalOptions);
          break;
        case "ArrowDown":
        case "ArrowRight":
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % totalOptions);
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (selectedIndex === 0) {
            startSlideshow(null);
          } else {
            startSlideshow(playlists[selectedIndex - 1].id);
          }
          break;
        case "Escape":
          e.preventDefault();
          navigate("/");
          break;
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [playlists, selectedIndex, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-2xl">Carregando...</div>
      </div>
    );
  }

  // If no playlists, go directly to slideshow
  if (playlists.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8">
        <Music className="h-20 w-20 text-blue-400 mb-8" />
        <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4 text-center">
          Nenhuma playlist criada
        </h1>
        <p className="text-xl text-slate-400 mb-12 text-center">
          Todas as músicas serão reproduzidas
        </p>
        <button
          onClick={() => startSlideshow(null)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-6 px-12 rounded-2xl text-2xl flex items-center gap-4 transition-all"
        >
          <Play className="h-8 w-8" />
          Iniciar Slideshow
        </button>
        <p className="text-slate-500 mt-8">Pressione ENTER para iniciar</p>
      </div>
    );
  }

  const options = [
    { id: null, name: "Todas as músicas", trackCount: -1, isAll: true },
    ...playlists.map((p) => ({ ...p, isAll: false })),
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8">
      <div className="text-center mb-12">
        <ListMusic className="h-16 w-16 lg:h-20 lg:w-20 text-blue-400 mx-auto mb-6" />
        <h1 className="text-4xl lg:text-6xl font-bold text-white mb-4">
          Escolha a Playlist
        </h1>
        <p className="text-xl lg:text-2xl text-slate-400">
          Use ↑ ↓ para navegar e ENTER para iniciar
        </p>
      </div>

      <div className="w-full max-w-2xl space-y-4">
        {options.map((option, index) => {
          const isSelected = selectedIndex === index;

          return (
            <button
              key={option.id || "all"}
              onClick={() => startSlideshow(option.id)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full p-6 lg:p-8 rounded-2xl flex items-center gap-6 transition-all duration-300 ${
                isSelected
                  ? "bg-blue-600 scale-105 ring-4 ring-blue-400"
                  : "bg-slate-800 hover:bg-slate-700"
              }`}
            >
              <div
                className={`p-4 rounded-xl ${
                  isSelected ? "bg-blue-500" : "bg-slate-700"
                }`}
              >
                {option.isAll ? (
                  <Music className="h-8 w-8 text-white" />
                ) : (
                  <ListMusic className="h-8 w-8 text-white" />
                )}
              </div>

              <div className="flex-1 text-left">
                <p className="text-xl lg:text-2xl font-bold text-white">
                  {option.name}
                </p>
                {!option.isAll && (
                  <p className={`text-lg ${isSelected ? "text-blue-200" : "text-slate-400"}`}>
                    {option.trackCount} música{option.trackCount !== 1 ? "s" : ""}
                  </p>
                )}
              </div>

              {isSelected && (
                <div className="flex items-center gap-2 text-white">
                  <Play className="h-6 w-6" />
                  <ChevronRight className="h-6 w-6" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TVStart;
