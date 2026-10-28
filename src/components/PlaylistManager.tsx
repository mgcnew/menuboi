import { useState, useEffect } from "react";
import { Plus, Music, ListMusic, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
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
      {playlists.length === 0 ? (
          <div className="rounded-lg border border-dashed px-6 py-8 text-center">
            <ListMusic className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium">Nenhuma playlist ainda</p>
            <p className="mt-1 text-sm text-muted-foreground">Dê um nome acima e escolha as músicas de cada horário ou ocasião.</p>
          </div>
        ) : (
      <ul className="divide-y overflow-hidden rounded-lg border bg-card shadow-sm">
        {
          playlists.map((playlist) => {
            const trackCount = playlistTracks[playlist.id]?.length || 0;
            const isExpanded = expandedPlaylist === playlist.id;
            const isSelected = selectedPlaylistId === playlist.id;

            return (
              <li
                key={playlist.id}
                className={`px-3 py-2.5 sm:px-4 ${isSelected ? "bg-primary/5" : ""}`}
              >
                <div className="flex items-center gap-3">
                  {onPlaylistSelect ? (
                    <Button
                      size="sm"
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => onPlaylistSelect(isSelected ? null : playlist.id)}
                      aria-pressed={isSelected}
                      className="h-8 shrink-0 gap-1.5"
                    >
                      <ListMusic className="h-4 w-4" />
                      {isSelected ? "Tocando" : "Usar"}
                    </Button>
                  ) : (
                    <ListMusic className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  )}

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
                        <p className="truncate text-sm font-medium">{playlist.name}</p>
                        <p className="text-xs tabular-nums text-muted-foreground">
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
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => setExpandedPlaylist(isExpanded ? null : playlist.id)}
                        aria-label={`Escolher músicas de ${playlist.name}`}
                        aria-expanded={isExpanded}
                        title="Escolher músicas"
                      >
                        <Music className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setEditingId(playlist.id);
                          setEditingName(playlist.name);
                        }}
                        aria-label={`Renomear ${playlist.name}`}
                        title="Renomear"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <ConfirmDeleteButton
                        itemName={playlist.name}
                        description="A playlist é apagada. As músicas continuam na biblioteca."
                        confirmLabel="Excluir playlist"
                        onConfirm={() => deletePlaylist(playlist.id)}
                      />
                    </div>
                  )}
                </div>

                {/* Expanded track selection */}
                {isExpanded && (
                  <div className="mt-3 max-h-60 space-y-0.5 overflow-y-auto border-t pt-3">
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
                            className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
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
              </li>
            );
          })}
      </ul>
        )}
    </div>
  );
};
