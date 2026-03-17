import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUpload } from "@/components/ImageUpload";
import { ImageGrid } from "@/components/ImageGrid";
import { SlideshowPreview } from "@/components/SlideshowPreview";
import { AudioUpload } from "@/components/AudioUpload";
import { AudioGrid } from "@/components/AudioGrid";
import { AnnouncementUpload } from "@/components/AnnouncementUpload";
import { AnnouncementGrid } from "@/components/AnnouncementGrid";
import { PlaylistManager } from "@/components/PlaylistManager";
import { SlideshowSettingsCard } from "@/components/SlideshowSettingsCard";
import { Monitor, Play, Image, Music, Settings, ExternalLink, Sun, Moon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TransitionType, DEFAULT_DISPLAY_TIME, DEFAULT_TRANSITION_TYPE, AudioTrack, Announcement } from "@/types/slideshow";
import { supabase } from "@/integrations/supabase/client";
import { menuItemsTable, audioTracksTable, announcementsTable } from "@/lib/supabase-helpers";
import { Badge } from "@/components/ui/badge";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";

export interface MenuItem {
  id: string;
  url: string;
  name: string;
  order: number;
  uploadedAt: Date;
  displayTime: number;
  transitionType: TransitionType;
  itemType: 'image' | 'video';
  videoAutoplay?: boolean;
  videoMuted?: boolean;
  videoLoop?: boolean;
  displayDays?: string[] | null;
}

export type MenuImage = MenuItem;

const Dashboard = () => {
  const [images, setImages] = useState<MenuItem[]>([]);
  const [audios, setAudios] = useState<AudioTrack[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [transitionTime, setTransitionTime] = useState(10);
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('menuboard-dark-mode');
    return saved === 'true';
  });
  const { toast } = useToast();

  // Apply dark mode class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('menuboard-dark-mode', String(isDark));
  }, [isDark]);

  useEffect(() => {
    loadImagesFromSupabase();
    loadAudiosFromSupabase();
    loadAnnouncementsFromSupabase();
    loadTransitionTimeFromLocalStorage();
  }, []);

  const loadImagesFromSupabase = async () => {
    try {
      const { data, error } = await menuItemsTable()
        .select('*')
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error loading images from Supabase:', error);
        loadImagesFromLocalStorage();
        return;
      }

      if (data) {
        const formattedImages: MenuItem[] = data.map((img: any) => {
          const { data: { publicUrl } } = supabase.storage
            .from('menu-images')
            .getPublicUrl(img.file_path);

          return {
            id: img.id,
            url: publicUrl,
            name: img.name,
            order: img.order_index,
            uploadedAt: new Date(img.created_at),
            displayTime: img.display_time,
            transitionType: img.transition_type as TransitionType,
            itemType: img.item_type || 'image',
            videoAutoplay: img.video_autoplay,
            videoMuted: img.video_muted,
            videoLoop: img.video_loop,
            displayDays: (img as any).display_days || null,
          };
        });
        setImages(formattedImages);
        saveToLocalStorage(formattedImages);
      }
    } catch (error) {
      console.error('Error connecting to Supabase:', error);
      loadImagesFromLocalStorage();
    }
  };

  const loadImagesFromLocalStorage = () => {
    const savedImages = localStorage.getItem('menuboard-images');
    if (savedImages) {
      try {
        setImages(JSON.parse(savedImages));
      } catch (e) {
        console.error('Error loading saved images from localStorage:', e);
      }
    }
  };

  const loadTransitionTimeFromLocalStorage = () => {
    const savedTime = localStorage.getItem('menuboard-transition-time');
    if (savedTime) {
      setTransitionTime(parseInt(savedTime));
    }
  };

  const saveToLocalStorage = (newImages: MenuItem[], newTime?: number) => {
    localStorage.setItem('menuboard-images', JSON.stringify(newImages));
    if (newTime !== undefined) {
      localStorage.setItem('menuboard-transition-time', newTime.toString());
    }
  };

  const handleImagesUploaded = async (newImages: MenuItem[]) => {
    try {
      const imagesToInsert = newImages.map((img, index) => ({
        id: img.id,
        name: img.name,
        file_path: img.url.split('/').pop(),
        order_index: images.length + index,
        display_time: DEFAULT_DISPLAY_TIME,
        transition_type: DEFAULT_TRANSITION_TYPE,
        item_type: img.itemType,
        video_autoplay: img.videoAutoplay,
        video_muted: img.videoMuted,
        video_loop: img.videoLoop
      }));

      const { error } = await menuItemsTable()
        .insert(imagesToInsert);

      if (error) {
        console.error('Error inserting images to Supabase:', error);
        toast({
          title: "Erro",
          description: "Não foi possível salvar as imagens no banco de dados.",
          variant: "destructive"
        });
        return;
      }

      await loadImagesFromSupabase();
      
      toast({
        title: "Imagens carregadas!",
        description: `${newImages.length} imagem(ns) adicionada(s) com sucesso.`,
      });
    } catch (error) {
      console.error('Error handling uploaded images:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao processar as imagens.",
        variant: "destructive"
      });
    }
  };

  const handleImageDeleted = async (imageId: string) => {
    try {
      const imageToDelete = images.find(img => img.id === imageId);
      
      const { error } = await menuItemsTable()
        .delete()
        .eq('id', imageId);

      if (error) {
        console.error('Error deleting image from Supabase:', error);
        toast({
          title: "Erro",
          description: "Não foi possível remover a imagem do banco de dados.",
          variant: "destructive"
        });
        return;
      }

      if (imageToDelete) {
        const fileName = imageToDelete.url.split('/').pop();
        if (fileName) {
          const { error: storageError } = await supabase.storage
            .from('menu-images')
            .remove([fileName]);
          
          if (storageError) {
            console.error('Error deleting image from storage:', storageError);
          }
        }
      }

      const updatedImages = images.filter(img => img.id !== imageId);
      setImages(updatedImages);
      saveToLocalStorage(updatedImages);
      
      toast({
        title: "Imagem removida",
        description: "A imagem foi removida com sucesso.",
      });
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao remover a imagem.",
        variant: "destructive"
      });
    }
  };

  const handleImageReorder = async (reorderedImages: MenuItem[]) => {
    try {
      const updates = reorderedImages.map((img, index) => ({
        id: img.id,
        order_index: index
      }));

      for (const update of updates) {
        const { error } = await menuItemsTable()
          .update({ order_index: update.order_index })
          .eq('id', update.id);

        if (error) {
          console.error('Error updating image order:', error);
        }
      }

      setImages(reorderedImages);
      saveToLocalStorage(reorderedImages);
    } catch (error) {
      console.error('Error reordering images:', error);
    }
  };

  const handleImageUpdate = async (updatedImage: MenuItem) => {
    try {
      const { error } = await menuItemsTable()
        .update({
          display_time: updatedImage.displayTime,
          transition_type: updatedImage.transitionType,
          video_autoplay: updatedImage.videoAutoplay,
          video_muted: updatedImage.videoMuted,
          video_loop: updatedImage.videoLoop,
          display_days: updatedImage.displayDays,
        } as any)
        .eq('id', updatedImage.id);

      if (error) {
        console.error('Error updating image in Supabase:', error);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar a imagem no banco de dados.",
          variant: "destructive"
        });
        return;
      }

      const updatedImages = images.map(img => 
        img.id === updatedImage.id ? updatedImage : img
      );
      setImages(updatedImages);
      saveToLocalStorage(updatedImages);
    } catch (error) {
      console.error('Error updating image:', error);
    }
  };

  const loadAudiosFromSupabase = async () => {
    try {
      const { data, error } = await audioTracksTable()
        .select('*')
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error loading audios from Supabase:', error);
        return;
      }

      if (data) {
        const formattedAudios: AudioTrack[] = data.map((audio: any) => {
          const { data: { publicUrl } } = supabase.storage
            .from('audio-tracks')
            .getPublicUrl(audio.file_path);

          return {
            id: audio.id,
            url: publicUrl,
            name: audio.name,
            order: audio.order_index,
            uploadedAt: new Date(audio.created_at),
          };
        });
        setAudios(formattedAudios);
      }
    } catch (error) {
      console.error('Error loading audios:', error);
    }
  };

  const handleAudiosUploaded = async (newAudios: AudioTrack[]) => {
    try {
      const audiosToInsert = newAudios.map((audio, index) => ({
        id: audio.id,
        name: audio.name,
        file_path: audio.url.split('/').pop(),
        order_index: audios.length + index,
      }));

      const { error } = await audioTracksTable()
        .insert(audiosToInsert);

      if (error) {
        console.error('Error inserting audios to Supabase:', error);
        toast({
          title: "Erro",
          description: "Não foi possível salvar os áudios no banco de dados.",
          variant: "destructive"
        });
        return;
      }

      await loadAudiosFromSupabase();
      
      toast({
        title: "Áudios carregados!",
        description: `${newAudios.length} áudio(s) adicionado(s) com sucesso.`,
      });
    } catch (error) {
      console.error('Error handling uploaded audios:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao processar os áudios.",
        variant: "destructive"
      });
    }
  };

  const handleAudioDeleted = async (audioId: string) => {
    try {
      const audioToDelete = audios.find(audio => audio.id === audioId);
      
      const { error } = await audioTracksTable()
        .delete()
        .eq('id', audioId);

      if (error) {
        console.error('Error deleting audio from Supabase:', error);
        toast({
          title: "Erro",
          description: "Não foi possível remover o áudio do banco de dados.",
          variant: "destructive"
        });
        return;
      }

      if (audioToDelete) {
        const fileName = audioToDelete.url.split('/').pop();
        if (fileName) {
          const { error: storageError } = await supabase.storage
            .from('audio-tracks')
            .remove([fileName]);
          
          if (storageError) {
            console.error('Error deleting audio from storage:', storageError);
          }
        }
      }

      const updatedAudios = audios.filter(audio => audio.id !== audioId);
      setAudios(updatedAudios);
      
      toast({
        title: "Áudio removido",
        description: "O áudio foi removido com sucesso.",
      });
    } catch (error) {
      console.error('Error deleting audio:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao remover o áudio.",
        variant: "destructive"
      });
    }
  };

  const handleMultiAudioDelete = async (audioIds: string[]) => {
    try {
      const audiosToDelete = audios.filter(audio => audioIds.includes(audio.id));
      
      const { error } = await audioTracksTable()
        .delete()
        .in('id', audioIds);

      if (error) {
        console.error('Error deleting audios from Supabase:', error);
        toast({
          title: "Erro",
          description: "Não foi possível remover os áudios do banco de dados.",
          variant: "destructive"
        });
        return;
      }

      const fileNames = audiosToDelete
        .map(audio => audio.url.split('/').pop())
        .filter(Boolean) as string[];
      
      if (fileNames.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('audio-tracks')
          .remove(fileNames);
        
        if (storageError) {
          console.error('Error deleting audios from storage:', storageError);
        }
      }

      const updatedAudios = audios.filter(audio => !audioIds.includes(audio.id));
      setAudios(updatedAudios);
      
      toast({
        title: "Áudios removidos",
        description: `${audioIds.length} áudio(s) removido(s) com sucesso.`,
      });
    } catch (error) {
      console.error('Error deleting audios:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao remover os áudios.",
        variant: "destructive"
      });
    }
  };

  const handleAudioReorder = async (reorderedAudios: AudioTrack[]) => {
    try {
      const updates = reorderedAudios.map((audio, index) => ({
        id: audio.id,
        order_index: index
      }));

      for (const update of updates) {
        const { error } = await audioTracksTable()
          .update({ order_index: update.order_index })
          .eq('id', update.id);

        if (error) {
          console.error('Error updating audio order:', error);
        }
      }

      setAudios(reorderedAudios);
    } catch (error) {
      console.error('Error reordering audios:', error);
    }
  };

  const loadAnnouncementsFromSupabase = async () => {
    try {
      const { data, error } = await announcementsTable()
        .select('*')
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error loading announcements from Supabase:', error);
        return;
      }

      if (data) {
        const formattedAnnouncements: Announcement[] = data.map((announcement: any) => {
          const { data: { publicUrl } } = supabase.storage
            .from('announcements')
            .getPublicUrl(announcement.file_path);

          return {
            id: announcement.id,
            url: publicUrl,
            name: announcement.name,
            order: announcement.order_index,
            uploadedAt: new Date(announcement.created_at),
          };
        });
        setAnnouncements(formattedAnnouncements);
      }
    } catch (error) {
      console.error('Error loading announcements:', error);
    }
  };

  const handleAnnouncementsUploaded = async (newAnnouncements: Announcement[]) => {
    try {
      const announcementsToInsert = newAnnouncements.map((announcement, index) => ({
        id: announcement.id,
        name: announcement.name,
        file_path: announcement.url.split('/').pop(),
        order_index: announcements.length + index,
      }));

      const { error } = await announcementsTable()
        .insert(announcementsToInsert);

      if (error) {
        console.error('Error inserting announcements to Supabase:', error);
        toast({
          title: "Erro",
          description: "Não foi possível salvar as locuções no banco de dados.",
          variant: "destructive"
        });
        return;
      }

      await loadAnnouncementsFromSupabase();
      
      toast({
        title: "Locuções carregadas!",
        description: `${newAnnouncements.length} locuçã(ões) adicionada(s) com sucesso.`,
      });
    } catch (error) {
      console.error('Error handling uploaded announcements:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao processar as locuções.",
        variant: "destructive"
      });
    }
  };

  const handleAnnouncementDeleted = async (announcementId: string) => {
    try {
      const announcementToDelete = announcements.find(announcement => announcement.id === announcementId);
      
      const { error } = await announcementsTable()
        .delete()
        .eq('id', announcementId);

      if (error) {
        console.error('Error deleting announcement from Supabase:', error);
        toast({
          title: "Erro",
          description: "Não foi possível remover a locução do banco de dados.",
          variant: "destructive"
        });
        return;
      }

      if (announcementToDelete) {
        const fileName = announcementToDelete.url.split('/').pop();
        if (fileName) {
          const { error: storageError } = await supabase.storage
            .from('announcements')
            .remove([fileName]);
          
          if (storageError) {
            console.error('Error deleting announcement from storage:', storageError);
          }
        }
      }

      const updatedAnnouncements = announcements.filter(announcement => announcement.id !== announcementId);
      setAnnouncements(updatedAnnouncements);
      
      toast({
        title: "Locução removida",
        description: "A locução foi removida com sucesso.",
      });
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao remover a locução.",
        variant: "destructive"
      });
    }
  };

  const handleAnnouncementReorder = async (reorderedAnnouncements: Announcement[]) => {
    try {
      const updates = reorderedAnnouncements.map((announcement, index) => ({
        id: announcement.id,
        order_index: index
      }));

      for (const update of updates) {
        const { error } = await announcementsTable()
          .update({ order_index: update.order_index })
          .eq('id', update.id);

        if (error) {
          console.error('Error updating announcement order:', error);
        }
      }

      setAnnouncements(reorderedAnnouncements);
    } catch (error) {
      console.error('Error reordering announcements:', error);
    }
  };

  const handleTransitionTimeChange = (time: number) => {
    setTransitionTime(time);
    saveToLocalStorage(images, time);
  };

  const openSlideshow = () => {
    const slideshowUrl = `${window.location.origin}/slideshow`;
    window.open(slideshowUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Compact Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Monitor className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">Menu Board</h1>
              <div className="hidden sm:flex items-center gap-2">
                <Badge variant="secondary" className="font-normal">
                  {images.length} mídia{images.length !== 1 ? 's' : ''}
                </Badge>
                <Badge variant="outline" className="font-normal">
                  {audios.length} música{audios.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsDark(d => !d)}
                className="h-9 w-9"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button
                onClick={openSlideshow}
                size="sm"
                disabled={images.length === 0}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                <span className="hidden sm:inline">Abrir Slideshow</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Main Content with Tabs */}
          <div>
            <Tabs defaultValue="media" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3 h-11">
                <TabsTrigger value="media" className="gap-2">
                  <Image className="h-4 w-4" />
                  <span className="hidden sm:inline">Mídia</span>
                </TabsTrigger>
                <TabsTrigger value="audio" className="gap-2">
                  <Music className="h-4 w-4" />
                  <span className="hidden sm:inline">Áudio</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="gap-2">
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Config</span>
                </TabsTrigger>
              </TabsList>

              {/* Media Tab */}
              <TabsContent value="media" className="space-y-4 mt-4">
                <ImageUpload onImagesUploaded={handleImagesUploaded} />
                
                {images.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Imagens e Vídeos ({images.length})
                    </h3>
                    <ImageGrid
                      images={images}
                      onImageDelete={handleImageDeleted}
                      onImageReorder={handleImageReorder}
                      onImageUpdate={handleImageUpdate}
                    />
                  </div>
                )}

                {images.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Image className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>Nenhuma mídia carregada</p>
                    <p className="text-sm">Faça upload para começar</p>
                  </div>
                )}
              </TabsContent>

              {/* Audio Tab */}
              <TabsContent value="audio" className="space-y-6 mt-4">
                {/* Music Section */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Músicas</h3>
                  <AudioUpload onAudiosUploaded={handleAudiosUploaded} />
                  {audios.length > 0 && (
                    <AudioGrid
                      audios={audios}
                      onAudioDelete={handleAudioDeleted}
                      onAudioReorder={handleAudioReorder}
                      onMultiDelete={handleMultiAudioDelete}
                    />
                  )}
                </div>

                {/* Announcements Section */}
                <div className="space-y-3 pt-4 border-t">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Locuções</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Alternadas com as músicas automaticamente
                    </p>
                  </div>
                  <AnnouncementUpload onAnnouncementsUploaded={handleAnnouncementsUploaded} />
                  {announcements.length > 0 && (
                    <AnnouncementGrid
                      announcements={announcements}
                      onAnnouncementDelete={handleAnnouncementDeleted}
                      onAnnouncementReorder={handleAnnouncementReorder}
                    />
                  )}
                </div>

                {/* Playlists Section */}
                <div className="space-y-3 pt-4 border-t">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Playlists</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Organize suas músicas em playlists
                    </p>
                  </div>
                  <PlaylistManager />
                </div>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-4 mt-4">
                {/* Slideshow Appearance Settings */}
                <SlideshowSettingsCard />

                {/* Other Settings */}
                <Card className="p-4">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="transition-time" className="text-sm">
                        Tempo entre imagens
                      </Label>
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          id="transition-time"
                          type="number"
                          min="5"
                          max="60"
                          value={transitionTime}
                          onChange={(e) => handleTransitionTimeChange(parseInt(e.target.value))}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">segundos</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Recomendado: 10-15 segundos
                      </p>
                    </div>

                    <div className="pt-4 border-t">
                      <QRCodeDisplay compact title="Link para TV" />
                    </div>
                  </div>
                </Card>

                {images.length === 0 && (
                  <Card className="p-4 bg-primary/5 border-primary/20">
                    <h4 className="font-medium text-sm mb-2">Primeiros Passos</h4>
                    <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Faça upload das suas imagens na aba Mídia</li>
                      <li>Configure o tempo de transição</li>
                      <li>Clique em "Abrir Slideshow"</li>
                      <li>Acesse o link na TV</li>
                    </ol>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sticky Sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-20 space-y-4">
              {/* Preview */}
              <Card className="p-4">
                <h3 className="text-sm font-medium mb-3">Preview</h3>
                <SlideshowPreview images={images} />
              </Card>

              {/* Quick Stats */}
              <Card className="p-4">
                <h3 className="text-sm font-medium mb-3">Resumo</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mídias</span>
                    <span className="font-medium">{images.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Músicas</span>
                    <span className="font-medium">{audios.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Locuções</span>
                    <span className="font-medium">{announcements.length}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-muted-foreground">Intervalo</span>
                    <span className="font-medium">{transitionTime}s</span>
                  </div>
                </div>
              </Card>

              {/* Quick Action */}
              <Button
                onClick={openSlideshow}
                className="w-full gap-2"
                disabled={images.length === 0}
              >
                <ExternalLink className="h-4 w-4" />
                Abrir na TV
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
