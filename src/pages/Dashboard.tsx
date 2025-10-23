import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ImageUpload";
import { ImageGrid } from "@/components/ImageGrid";
import { SlideshowPreview } from "@/components/SlideshowPreview";
import { AudioUpload } from "@/components/AudioUpload";
import { AudioGrid } from "@/components/AudioGrid";
import { Monitor, Settings, Upload, Play, Music } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TransitionType, DEFAULT_DISPLAY_TIME, DEFAULT_TRANSITION_TYPE, AudioTrack } from "@/types/slideshow";
import { supabase } from "@/integrations/supabase/client";
import { menuItemsTable, audioTracksTable } from "@/lib/supabase-helpers";

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
}

// Backward compatibility alias
export type MenuImage = MenuItem;

const Dashboard = () => {
  const [images, setImages] = useState<MenuItem[]>([]);
  const [audios, setAudios] = useState<AudioTrack[]>([]);
  const [transitionTime, setTransitionTime] = useState(10);
  const { toast } = useToast();

  useEffect(() => {
    loadImagesFromSupabase();
    loadAudiosFromSupabase();
    loadTransitionTimeFromLocalStorage();
  }, []);

  const loadImagesFromSupabase = async () => {
    try {
      const { data, error } = await menuItemsTable()
        .select('*')
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error loading images from Supabase:', error);
        // Fallback to localStorage
        loadImagesFromLocalStorage();
        return;
      }

      if (data) {
        const formattedImages: MenuItem[] = data.map((img: any) => ({
          id: img.id,
          url: `https://rsyqznvjpmwoibgohptz.supabase.co/storage/v1/object/public/menu-images/${img.file_path}`,
          name: img.name,
          order: img.order_index,
          uploadedAt: new Date(img.created_at),
          displayTime: img.display_time,
          transitionType: img.transition_type as TransitionType,
          itemType: img.item_type || 'image',
          videoAutoplay: img.video_autoplay,
          videoMuted: img.video_muted,
          videoLoop: img.video_loop
        }));
        setImages(formattedImages);
        // CRITICAL: Always sync to localStorage after loading from Supabase
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
      // Insert new images into Supabase
      const imagesToInsert = newImages.map((img, index) => ({
        id: img.id,
        name: img.name,
        file_path: img.url.split('/').pop(), // Extract filename from URL
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

      // Reload images from Supabase to get the most up-to-date data
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
      // First get the image data to get the file_path for storage deletion
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

      // Delete from storage if we have the image data
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
      // Update order in Supabase
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
          video_loop: updatedImage.videoLoop
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
        const formattedAudios: AudioTrack[] = data.map((audio: any) => ({
          id: audio.id,
          url: `https://hqetuukelgurerlfnmqd.supabase.co/storage/v1/object/public/audio-tracks/${audio.file_path}`,
          name: audio.name,
          order: audio.order_index,
          uploadedAt: new Date(audio.created_at),
        }));
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
      {/* Header */}
      <header className="border-b bg-card shadow-soft">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Monitor className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Menu Board Digital</h1>
                <p className="text-sm text-muted-foreground">Painel de Controle</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                onClick={openSlideshow}
                className="bg-gradient-primary hover:bg-primary-hover transition-smooth"
                disabled={images.length === 0}
              >
                <Play className="mr-2 h-4 w-4" />
                Abrir Slideshow
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Upload Section */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 shadow-medium">
              <div className="flex items-center space-x-3 mb-6">
                <Upload className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Upload de Imagens</h2>
              </div>
              <ImageUpload onImagesUploaded={handleImagesUploaded} />
            </Card>

            {/* Images Grid */}
            <Card className="p-6 shadow-medium">
              <h2 className="text-xl font-semibold mb-6">Imagens do Menu ({images.length})</h2>
              <ImageGrid
                images={images}
                onImageDelete={handleImageDeleted}
                onImageReorder={handleImageReorder}
                onImageUpdate={handleImageUpdate}
              />
            </Card>

            {/* Audio Section */}
            <Card className="p-6 shadow-medium">
              <div className="flex items-center space-x-3 mb-6">
                <Music className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Sistema de Rádio Contínuo</h2>
              </div>
              <AudioUpload onAudiosUploaded={handleAudiosUploaded} />
            </Card>

            {/* Audio Grid */}
            <Card className="p-6 shadow-medium">
              <h2 className="text-xl font-semibold mb-6">Músicas/Vinhetas ({audios.length})</h2>
              <AudioGrid
                audios={audios}
                onAudioDelete={handleAudioDeleted}
                onAudioReorder={handleAudioReorder}
              />
            </Card>
          </div>

          {/* Settings Sidebar */}
          <div className="space-y-6">
            {/* Preview */}
            <Card className="p-6 shadow-medium">
              <h2 className="text-xl font-semibold mb-4">Preview do Slideshow</h2>
              <SlideshowPreview images={images} />
            </Card>

            <Card className="p-6 shadow-medium">
              <div className="flex items-center space-x-3 mb-6">
                <Settings className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Configurações</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="transition-time">Tempo entre imagens (segundos)</Label>
                  <Input
                    id="transition-time"
                    type="number"
                    min="5"
                    max="60"
                    value={transitionTime}
                    onChange={(e) => handleTransitionTimeChange(parseInt(e.target.value))}
                    className="mt-2"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Recomendado: 10-15 segundos
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="font-medium mb-2">Link do Slideshow</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Acesse este link na TV para iniciar o slideshow:
                  </p>
                  <div className="p-3 bg-muted rounded-lg text-sm font-mono break-all">
                    {window.location.origin}/slideshow
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="font-medium mb-2">Status</h3>
                  <div className="text-sm space-y-1">
                    <p className="flex justify-between">
                      <span>Imagens:</span>
                      <span className="font-medium">{images.length}</span>
                    </p>
                    <p className="flex justify-between">
                      <span>Tempo:</span>
                      <span className="font-medium">{transitionTime}s</span>
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {images.length === 0 && (
              <Card className="p-6 bg-accent/10 border-accent/20">
                <h3 className="font-medium text-accent-foreground mb-2">
                  Primeiros Passos
                </h3>
                <p className="text-sm text-muted-foreground">
                  1. Faça upload das suas imagens<br />
                  2. Configure o tempo de transição<br />
                  3. Clique em "Abrir Slideshow"<br />
                  4. Acesse o link na TV
                </p>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;