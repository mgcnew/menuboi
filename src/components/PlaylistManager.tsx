import { useState, useEffect } from "react";
import { Plus, Trash2, Music, ListMusic, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Playlist, AudioTrack } from "@/types/slideshow";
import { playlistsTable, playlistTracksTable, audioTracksTable } from "@/lib/supabase-helpers";
import { supabase } from "@/integrations/supabase/client";

interface PlaylistManagerProps {
  onPlaylistSelect?: (playlistId: string | null) => void;
  selectedPlaylistId?: string | null;
}

export const PlaylistManager = ({ onPlaylistSelect, selectedPlaylistId }: PlaylistManagerProps) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [allTracks, setAllTracks] = useState<AudioTrack[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [expandedPlaylist, setExpandedPlaylist] = useState<string | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<Record<string, string[]>>({});
  const { toast } = useToast();

  // Load playlists
  const loadPlaylists = async () => {
    try {
      const { data, error } = await playlistsTable()
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        const formatted: Playlist[] = data.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          createdAt: new Date(p.created_at),
        }));
        setPlaylists(formatted);

        // Load track counts
        for (const playlist of formatted) {
          loadPlaylistTracks(playlist.id);
        }
      }
    } catch (error) {
      console.error("Error loading playlists:", error);
    }
  };

  // Load all audio tracks
  const loadAllTracks = async () => {
    try {
      const { data, error } = await audioTracksTable()
        .select("*")
        .order("order_index", { ascending: true });

      if (error) throw error;

      if (data) {
        const formatted: AudioTrack[] = data.map((t: any) => ({
          id: t.id,
          name: t.name,
          url: t.file_path,
          order: t.order_index,
          uploadedAt: new Date(t.created_at),
        }));
        setAllTracks(formatted);
      }
    } catch (error) {
      console.error("Error loading tracks:", error);
    }
  };

  // Load tracks for a specific playlist
  const loadPlaylistTracks = async (playlistId: string) => {
    try {
      const { data, error } = await playlistTracksTable()
        .select("audio_track_id")
        .eq("playlist_id", playlistId);

      if (error) throw error;

      if (data) {
        setPlaylistTracks((prev) => ({
          ...prev,
          [playlistId]: data.map((t: any) => t.audio_track_id),
        }));
      }
    } catch (error) {
      console.error("Error loading playlist tracks:", error);
    }
  };

  useEffect(() => {
    loadPlaylists();
    loadAllTracks();
  }, []);

  // Create playlist
  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) return;

    try {
      const { data, error } = await playlistsTable()
        .insert({ name: newPlaylistName.trim() })
        .select()
        .single();

      if (error) throw error;

      toast({ title: "Playlist criada", description: `"${newPlaylistName}" foi criada.` });
      setNewPlaylistName("");
      loadPlaylists();
    } catch (error) {
      console.error("Error creating playlist:", error);
      toast({ title: "Erro", description: "Não foi possível criar a playlist.", variant: "destructive" });
    }
  };

  // Delete playlist
  const deletePlaylist = async (id: string) => {
    try {
      const { error } = await playlistsTable().delete().eq("id", id);
      if (error) throw error;

      toast({ title: "Playlist excluída" });
      if (selectedPlaylistId === id) {
        onPlaylistSelect?.(null);
      }
      loadPlaylists();
    } catch (error) {
      console.error("Error deleting playlist:", error);
      toast({ title: "Erro", description: "Não foi possível excluir a playlist.", variant: "destructive" });
    }
  };

  // Update playlist name
  const updatePlaylistName = async (id: string) => {
    if (!editingName.trim()) {
      setEditingId(null);
      return;
    }

    try {
      const { error } = await playlistsTable()
        .update({ name: editingName.trim() })
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Playlist atualizada" });
      setEditingId(null);
      loadPlaylists();
    } catch (error) {
      console.error("Error updating playlist:", error);
      toast({ title: "Erro", description: "Não foi possível atualizar a playlist.", variant: "destructive" });
    }
  };

  // Toggle track in playlist
  const toggleTrackInPlaylist = async (playlistId: string, trackId: string) => {
    const currentTracks = playlistTracks[playlistId] || [];
    const isInPlaylist = currentTracks.includes(trackId);

    try {
      if (isInPlaylist) {
        // Remove from playlist
        const { error } = await playlistTracksTable()
          .delete()
          .eq("playlist_id", playlistId)
          .eq("audio_track_id", trackId);

        if (error) throw error;
      } else {
        // Add to playlist
        const { error } = await playlistTracksTable()
          .insert({
            playlist_id: playlistId,
            audio_track_id: trackId,
            order_index: currentTracks.length,
          });

        if (error) throw error;
      }

      loadPlaylistTracks(playlistId);
    } catch (error) {
      console.error("Error toggling track:", error);
      toast({ title: "Erro", description: "Não foi possível atualizar a playlist.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Create new playlist */}
      <div className="flex gap-2">
        <Input
          placeholder="Nome da nova playlist..."
          value={newPlaylistName}
          onChange={(e) => setNewPlaylistName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createPlaylist()}
        />
        <Button onClick={createPlaylist} disabled={!newPlaylistName.trim()}>
          <Plus className="h-4 w-4 mr-2" />
          Criar
        </Button>
      </div>

      {/* Playlist list */}
      <div className="space-y-3">
        {playlists.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ListMusic className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma playlist criada ainda.</p>
          </div>
        ) : (
          playlists.map((playlist) => {
            const trackCount = playlistTracks[playlist.id]?.length || 0;
            const isExpanded = expandedPlaylist === playlist.id;
            const isSelected = selectedPlaylistId === playlist.id;

            return (
              <Card
                key={playlist.id}
                className={`p-4 ${isSelected ? "ring-2 ring-primary" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onPlaylistSelect?.(isSelected ? null : playlist.id)}
                    className={`p-2 rounded-lg ${
                      isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                  >
                    <ListMusic className="h-5 w-5" />
                  </button>

                  <div className="flex-1 min-w-0">
                    {editingId === playlist.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") updatePlaylistName(playlist.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          autoFocus
                        />
                        <Button size="icon" variant="ghost" onClick={() => updatePlaylistName(playlist.id)}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <p className="font-medium truncate">{playlist.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {trackCount} música{trackCount !== 1 ? "s" : ""}
                        </p>
                      </>
                    )}
                  </div>

                  {editingId !== playlist.id && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setExpandedPlaylist(isExpanded ? null : playlist.id)}
                      >
                        <Music className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(playlist.id);
                          setEditingName(playlist.name);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deletePlaylist(playlist.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Expanded track selection */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t space-y-2 max-h-60 overflow-y-auto">
                    {allTracks.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma música disponível. Faça upload primeiro.
                      </p>
                    ) : (
                      allTracks.map((track) => {
                        const isInPlaylist = playlistTracks[playlist.id]?.includes(track.id);
                        return (
                          <div
                            key={track.id}
                            className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                            onClick={() => toggleTrackInPlaylist(playlist.id, track.id)}
                          >
                            <Checkbox checked={isInPlaylist} />
                            <Music className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">{track.name}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
