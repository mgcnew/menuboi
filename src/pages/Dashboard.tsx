import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
import { ImageSettingsCard } from "@/components/ImageSettingsCard";
import { AudioSettingsCard } from "@/components/AudioSettingsCard";
import { Monitor, Image, Music, Mic, ListMusic, Settings, ExternalLink, Sun, Moon, LogOut, Palette, Upload, QrCode } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { TransitionType, DEFAULT_DISPLAY_TIME, DEFAULT_TRANSITION_TYPE, AudioTrack, Announcement, getCurrentDayOfWeek, DAY_OPTIONS } from "@/types/slideshow";
import { supabase } from "@/integrations/supabase/client";
import { menuItemsTable, audioTracksTable, announcementsTable } from "@/lib/supabase-helpers";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { PageHeader } from "@/components/PageHeader";
import logo from "@/assets/logo-novo-boi.png";

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

type Section = 'media' | 'audio' | 'settings';
type MediaFilter = 'all' | 'today' | 'other';

const Dashboard = () => {
  const [images, setImages] = useState<MenuItem[]>([]);
  const [audios, setAudios] = useState<AudioTrack[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [transitionTime, setTransitionTime] = useState(10);
  const [globalTransitionType, setGlobalTransitionType] = useState<TransitionType>(DEFAULT_TRANSITION_TYPE);
  const [globalDisplayDays, setGlobalDisplayDays] = useState<string[] | null>(null);
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('menuboard-dark-mode');
    return saved === 'true';
  });
  const [section, setSection] = useState<Section>('media');
  const [settingsTab, setSettingsTab] = useState('images');
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Dashboard tokens live on <html> so dialogs and menus (portals) get them too
  useEffect(() => {
    document.documentElement.classList.add('theme-dashboard');
    return () => document.documentElement.classList.remove('theme-dashboard');
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  // Apply dark mode class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('menuboard-dark-mode', String(isDark));
  }, [isDark]);

  useEffect(() => {
    loadImagesFromSupabase();
    loadAudiosFromSupabase();
    loadAnnouncementsFromSupabase();
    loadGlobalSettingsFromLocalStorage();
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

  const loadGlobalSettingsFromLocalStorage = () => {
    const savedTime = localStorage.getItem('menuboard-transition-time');
    if (savedTime) {
      setTransitionTime(parseInt(savedTime));
    }
    const savedTransition = localStorage.getItem('menuboard-global-transition-type');
    if (savedTransition) {
      setGlobalTransitionType(savedTransition as TransitionType);
    }
    const savedDays = localStorage.getItem('menuboard-global-display-days');
    if (savedDays) {
      try {
        setGlobalDisplayDays(JSON.parse(savedDays));
      } catch (e) {
        console.error('Error loading saved display days', e);
      }
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
        display_time: transitionTime,
        transition_type: globalTransitionType,
        item_type: img.itemType,
        video_autoplay: img.videoAutoplay,
        video_muted: img.videoMuted,
        video_loop: img.videoLoop,
        display_days: globalDisplayDays
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

  const handleTransitionTimeChange = async (time: number) => {
    setTransitionTime(time);
    saveToLocalStorage(images, time);
    try {
      await menuItemsTable().update({ display_time: time }).neq('id', '0');
      // Update local state to reflect DB change immediately
      setImages(prev => prev.map(img => ({ ...img, displayTime: time })));
    } catch (error) {
      console.error('Error updating global transition time in DB:', error);
    }
  };

  const handleGlobalTransitionTypeChange = async (type: TransitionType) => {
    setGlobalTransitionType(type);
    localStorage.setItem('menuboard-global-transition-type', type);
    try {
      await menuItemsTable().update({ transition_type: type }).neq('id', '0');
      setImages(prev => prev.map(img => ({ ...img, transitionType: type })));
    } catch (error) {
      console.error('Error updating global transition type in DB:', error);
    }
  };

  const handleGlobalDisplayDaysChange = async (days: string[] | null) => {
    setGlobalDisplayDays(days);
    localStorage.setItem('menuboard-global-display-days', JSON.stringify(days));
    try {
      await menuItemsTable().update({ display_days: days }).neq('id', '0');
      setImages(prev => prev.map(img => ({ ...img, displayDays: days })));
    } catch (error) {
      console.error('Error updating global display days in DB:', error);
    }
  };

  const openSlideshow = () => {
    const slideshowUrl = `${window.location.origin}/slideshow`;
    window.open(slideshowUrl, '_blank');
  };

  const openMediaPicker = () => document.getElementById('file-input')?.click();

  const today = getCurrentDayOfWeek();
  const todayLabel = DAY_OPTIONS.find(d => d.value === today)?.label || today;
  const playsToday = (img: MenuItem) =>
    !img.displayDays || img.displayDays.length === 0 || img.displayDays.includes(today);
  const todayImages = useMemo(
    () => [...images].sort((a, b) => a.order - b.order).filter(playsToday),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [images, today]
  );
  const playingToday = todayImages.length;
  const cycleSeconds = todayImages.reduce((sum, img) => sum + (img.displayTime || 0), 0);

  const goToTvSettings = () => {
    setSection('settings');
    setSettingsTab('tv');
  };

  const navItems: { id: Section; label: string; icon: typeof Image; count?: number }[] = [
    { id: 'media', label: 'Mídia', icon: Image, count: images.length },
    { id: 'audio', label: 'Áudio', icon: Music, count: audios.length + announcements.length },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  const navButton = (item: typeof navItems[number], compact = false) => {
    const Icon = item.icon;
    const current = section === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => setSection(item.id)}
        aria-current={current ? 'page' : undefined}
        className={`flex h-9 shrink-0 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
          ${compact ? '' : 'w-full'}
          ${current
            ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
      >
        <Icon className={`h-4 w-4 ${current ? 'text-primary' : ''} ${compact ? 'max-[359px]:hidden' : ''}`} />
        {item.label}
        {!compact && item.count !== undefined && (
          <span className="ml-auto text-xs tabular-nums text-muted-foreground">{item.count}</span>
        )}
      </button>
    );
  };

  const brandMark = (
    <div className="flex items-center gap-3">
      <div
        role="img"
        aria-label="Novo Boi João Dias"
        className="h-9 w-[84px] shrink-0 rounded-md bg-white bg-no-repeat ring-1 ring-border"
        style={{ backgroundImage: `url(${logo})`, backgroundSize: '100%', backgroundPosition: '50% 33%' }}
      />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-semibold">Menu Board</p>
        <p className="truncate text-xs text-muted-foreground">TVs da loja</p>
      </div>
    </div>
  );

  const themeButton = (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setIsDark(d => !d)}
      className="h-8 gap-2 px-2 text-muted-foreground hover:text-foreground"
      aria-label={isDark ? 'Usar tema claro' : 'Usar tema escuro'}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="hidden lg:inline">{isDark ? 'Tema claro' : 'Tema escuro'}</span>
    </Button>
  );

  const logoutButton = (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleLogout}
      className="h-8 w-8 text-muted-foreground hover:text-foreground"
      aria-label="Sair"
      title="Sair"
    >
      <LogOut className="h-4 w-4" />
    </Button>
  );

  const subTabsList = "h-auto w-full justify-start gap-5 overflow-x-auto max-[359px]:gap-3 sm:gap-6 rounded-none border-b bg-transparent p-0 shadow-none";
  const subTabsTrigger = "-mb-px gap-2 [&>svg]:hidden sm:[&>svg]:block rounded-none border-b-2 border-transparent px-0 pb-3 pt-1 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none";

  const formatCycle = (seconds: number) => {
    if (seconds < 60) return `${seconds} s`;
    const m = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return rest ? `${m} min ${rest} s` : `${m} min`;
  };

  const filterCounts = {
    all: images.length,
    today: playingToday,
    other: images.length - playingToday,
  };

  return (
    <div className="min-h-screen bg-background text-foreground lg:flex">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-sidebar px-3 py-4 lg:flex">
        <div className="px-1.5 pb-6">{brandMark}</div>

        <nav aria-label="Seções do painel" className="space-y-1">
          {navItems.map(item => navButton(item))}
        </nav>

        <div className="mt-auto space-y-3">
          <div className="rounded-lg border bg-card p-3">
            <p className="text-sm font-semibold tabular-nums">
              {playingToday} de {images.length} {images.length === 1 ? 'mídia' : 'mídias'} no ar hoje
            </p>
            <div className="mt-3 space-y-1.5">
              <Button size="sm" className="w-full gap-2" onClick={openSlideshow} disabled={images.length === 0}>
                <ExternalLink className="h-4 w-4" /> Abrir na TV
              </Button>
              <Button size="sm" variant="ghost" className="w-full gap-2 text-muted-foreground hover:text-foreground" onClick={goToTvSettings}>
                <QrCode className="h-4 w-4" /> Conectar uma TV
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between border-t pt-3">
            {themeButton}
            {logoutButton}
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Top bar (mobile and tablet) */}
        <header className="sticky top-0 z-40 border-b bg-background/95 lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            {brandMark}
            <div className="flex items-center gap-1">
              {themeButton}
              {logoutButton}
            </div>
          </div>
          <nav aria-label="Seções do painel" className="flex gap-1 overflow-x-auto px-4 pb-3 sm:px-6">
            {navItems.map(item => navButton(item, true))}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          {section === 'media' && (
            <>
              <PageHeader
                title="Mídia"
                description="Imagens e vídeos que passam na TV da loja, na ordem da biblioteca."
                actions={
                  <>
                    <Button variant="outline" className="gap-2" onClick={openSlideshow} disabled={images.length === 0}>
                      <ExternalLink className="h-4 w-4" /> Abrir na TV
                    </Button>
                    <Button className="gap-2" onClick={openMediaPicker}>
                      <Upload className="h-4 w-4" /> Enviar mídia
                    </Button>
                  </>
                }
              />

              {images.length > 0 && (
                <section aria-labelledby="today-heading" className="mb-10 overflow-hidden rounded-lg border bg-card shadow-sm">
                  <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                    <div className="border-b p-4 lg:border-b-0 lg:border-r">
                      <SlideshowPreview images={images} className="border-0" onCurrentChange={setPreviewId} />
                      <p className="mt-2 px-1 text-xs text-muted-foreground">
                        Mostra a mesma sequência da TV, mas roda só aqui: pausar ou pular não muda a TV.
                      </p>
                    </div>

                    <div className="flex min-w-0 flex-col p-5">
                      <div className="flex items-center justify-between gap-3">
                        <h2 id="today-heading" className="text-base font-semibold">Hoje na TV</h2>
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">{todayLabel}</span>
                      </div>

                      <dl className="mt-4 grid grid-cols-3 gap-4 border-b pb-4">
                        <div>
                          <dt className="text-xs text-muted-foreground">No ar</dt>
                          <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                            {playingToday}<span className="text-sm font-normal text-muted-foreground"> de {images.length}</span>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">Ciclo completo</dt>
                          <dd className="mt-0.5 text-lg font-semibold tabular-nums">{formatCycle(cycleSeconds)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">Áudio</dt>
                          <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                            {audios.length}<span className="text-sm font-normal text-muted-foreground"> músicas</span>
                          </dd>
                        </div>
                      </dl>

                      {todayImages.length > 0 ? (
                        <ol className="mt-3 space-y-0.5" aria-label="Ordem de hoje">
                          {todayImages.slice(0, 5).map((img, i) => {
                            const onScreen = img.id === previewId;
                            return (
                            <li
                              key={img.id}
                              aria-current={onScreen ? 'true' : undefined}
                              className={`-mx-2 flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors ${onScreen ? 'bg-primary/5' : ''}`}
                            >
                              <span className={`w-4 text-right text-xs tabular-nums ${onScreen ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>{i + 1}</span>
                              <span className="h-7 w-12 shrink-0 overflow-hidden rounded bg-muted">
                                {img.itemType === 'video' ? (
                                  <video src={img.url} className="h-full w-full object-cover" muted preload="metadata" />
                                ) : (
                                  <img src={img.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                                )}
                              </span>
                              <span className={`min-w-0 flex-1 truncate ${onScreen ? 'font-medium' : ''}`}>{img.name}</span>
                              <span className="text-xs tabular-nums text-muted-foreground">{img.displayTime}s</span>
                            </li>
                            );
                          })}
                        </ol>
                      ) : (
                        <p className="mt-4 text-sm text-muted-foreground">
                          Nenhuma mídia está agendada para {todayLabel.toLowerCase()}. A TV fica sem slideshow até você mudar os dias de exibição.
                        </p>
                      )}

                      {todayImages.length > 5 && (
                        <Button
                          variant="link"
                          size="sm"
                          className="mt-1 h-auto self-start px-0"
                          onClick={() => setMediaFilter('today')}
                        >
                          Ver as {todayImages.length} mídias de hoje
                        </Button>
                      )}
                    </div>
                  </div>
                </section>
              )}

              <section aria-labelledby="library-heading">
                {images.length > 0 && (
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 id="library-heading" className="text-base font-semibold">Biblioteca</h2>
                      <p className="text-sm text-muted-foreground">
                        {mediaFilter === 'all'
                          ? 'Arraste os cards, ou use o menu ⋯ de cada um, para mudar a ordem na TV.'
                          : 'Volte para “Todas” para mudar a ordem.'}
                      </p>
                    </div>
                    <ToggleGroup
                      type="single"
                      value={mediaFilter}
                      onValueChange={(v) => v && setMediaFilter(v as MediaFilter)}
                      aria-label="Filtrar mídias"
                      className="rounded-md border bg-card p-0.5"
                    >
                      {([
                        ['all', 'Todas'],
                        ['today', 'No ar hoje'],
                        ['other', 'Outros dias'],
                      ] as [MediaFilter, string][]).map(([value, label]) => (
                        <ToggleGroupItem
                          key={value}
                          value={value}
                          size="sm"
                          className="h-8 gap-1.5 px-3 text-sm data-[state=on]:bg-accent data-[state=on]:text-foreground"
                        >
                          {label}
                          <span className="text-xs tabular-nums text-muted-foreground">{filterCounts[value]}</span>
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </div>
                )}

                <div className="space-y-4">
                  <ImageUpload onImagesUploaded={handleImagesUploaded} compact={images.length > 0} />

                  {images.length > 0 ? (
                    <ImageGrid
                      images={images}
                      filter={mediaFilter}
                      onImageDelete={handleImageDeleted}
                      onImageReorder={handleImageReorder}
                      onImageUpdate={handleImageUpdate}
                    />
                  ) : (
                    <ol className="grid gap-3 sm:grid-cols-3">
                      {[
                        ['Envie as mídias', 'Fotos do cardápio, promoções e vídeos da loja.'],
                        ['Organize a TV', 'Arraste para ordenar e escolha os dias de cada mídia.'],
                        ['Conecte a TV', 'Abra o link na TV da loja ou escaneie o QR code.'],
                      ].map(([title, text], i) => (
                        <li key={title} className="flex gap-3 rounded-lg border bg-card p-4">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums">
                            {i + 1}
                          </span>
                          <div>
                            <p className="text-sm font-medium">{title}</p>
                            <p className="mt-0.5 text-sm text-muted-foreground">{text}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </section>
            </>
          )}

          {section === 'audio' && (
            <>
              <PageHeader
                title="Áudio"
                description="Música ambiente e locuções que tocam junto com o slideshow."
              />
              <Tabs defaultValue="music" className="space-y-6">
                <TabsList aria-label="Categorias de áudio" className={subTabsList}>
                  <TabsTrigger value="music" className={subTabsTrigger}>
                    <Music className="h-4 w-4" />
                    Músicas
                    <span className="text-xs tabular-nums text-muted-foreground">{audios.length}</span>
                  </TabsTrigger>
                  <TabsTrigger value="announcements" className={subTabsTrigger}>
                    <Mic className="h-4 w-4" />
                    Locuções
                    <span className="text-xs tabular-nums text-muted-foreground">{announcements.length}</span>
                  </TabsTrigger>
                  <TabsTrigger value="playlists" className={subTabsTrigger}>
                    <ListMusic className="h-4 w-4" />
                    Playlists
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="music" className="mt-0 space-y-4">
                  <AudioUpload onAudiosUploaded={handleAudiosUploaded} />
                  {audios.length > 0 ? (
                    <AudioGrid
                      audios={audios}
                      onAudioDelete={handleAudioDeleted}
                      onAudioReorder={handleAudioReorder}
                      onMultiDelete={handleMultiAudioDelete}
                    />
                  ) : (
                    <p className="rounded-lg border border-dashed px-6 py-8 text-center text-sm text-muted-foreground">
                      Nenhuma música ainda. Envie arquivos MP3 para a loja ter som ambiente.
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="announcements" className="mt-0 space-y-4">
                  <AnnouncementUpload onAnnouncementsUploaded={handleAnnouncementsUploaded} />
                  {announcements.length > 0 ? (
                    <AnnouncementGrid
                      announcements={announcements}
                      onAnnouncementDelete={handleAnnouncementDeleted}
                      onAnnouncementReorder={handleAnnouncementReorder}
                    />
                  ) : (
                    <p className="rounded-lg border border-dashed px-6 py-8 text-center text-sm text-muted-foreground">
                      Nenhuma locução ainda. Elas entram entre as músicas no intervalo definido em Configurações › Áudio.
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="playlists" className="mt-0">
                  <PlaylistManager />
                </TabsContent>
              </Tabs>
            </>
          )}

          {section === 'settings' && (
            <>
              <PageHeader
                title="Configurações"
                description="Como a TV exibe as mídias, toca o áudio e aparece na loja."
              />
              <Tabs value={settingsTab} onValueChange={setSettingsTab} className="space-y-6">
                <TabsList aria-label="Categorias de configurações" className={subTabsList}>
                  <TabsTrigger value="images" className={subTabsTrigger}>
                    <Image className="h-4 w-4" />
                    Exibição
                  </TabsTrigger>
                  <TabsTrigger value="audio" className={subTabsTrigger}>
                    <Music className="h-4 w-4" />
                    Áudio
                  </TabsTrigger>
                  <TabsTrigger value="appearance" className={subTabsTrigger}>
                    <Palette className="h-4 w-4" />
                    Aparência
                  </TabsTrigger>
                  <TabsTrigger value="tv" className={subTabsTrigger}>
                    <Monitor className="h-4 w-4" />
                    Conectar TV
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="images" className="mt-0 max-w-3xl">
                  <ImageSettingsCard
                    transitionTime={transitionTime}
                    onTransitionTimeChange={handleTransitionTimeChange}
                    globalTransitionType={globalTransitionType}
                    onGlobalTransitionTypeChange={handleGlobalTransitionTypeChange}
                    globalDisplayDays={globalDisplayDays}
                    onGlobalDisplayDaysChange={handleGlobalDisplayDaysChange}
                  />
                </TabsContent>

                <TabsContent value="audio" className="mt-0 max-w-3xl">
                  <AudioSettingsCard />
                </TabsContent>

                <TabsContent value="appearance" className="mt-0 max-w-3xl">
                  <SlideshowSettingsCard />
                </TabsContent>

                <TabsContent value="tv" className="mt-0 max-w-3xl">
                  <Card className="hover:shadow-sm">
                    <div className="border-b px-6 py-4">
                      <h2 className="text-base font-semibold">Conectar uma TV</h2>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        Qualquer TV com navegador pode exibir o slideshow da loja.
                      </p>
                    </div>
                    <div className="grid gap-6 p-6 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <ol className="space-y-4 text-sm">
                        {[
                          ['Abra o navegador da TV', 'Na Smart TV, Fire TV ou TV Box, abra o navegador de internet.'],
                          ['Acesse o endereço', 'Digite o link abaixo ou escaneie o QR code com o celular para enviar à TV.'],
                          ['Deixe em tela cheia', 'O slideshow começa sozinho e se atualiza quando você muda algo aqui.'],
                        ].map(([title, text], i) => (
                          <li key={title} className="flex gap-3">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums">
                              {i + 1}
                            </span>
                            <div>
                              <p className="font-medium">{title}</p>
                              <p className="mt-0.5 text-muted-foreground">{text}</p>
                            </div>
                          </li>
                        ))}
                      </ol>
                      <QRCodeDisplay compact title="Link da TV" />
                    </div>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
