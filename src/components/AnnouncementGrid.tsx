import { useEffect, useState } from "react";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Loader2, Music, Tv } from "lucide-react";
import { Announcement } from "@/types/slideshow";
import { AudioPreviewControls } from "@/components/AudioPreviewControls";
import { Pagination } from "@/components/Pagination";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { requestAnnouncementOnTv } from "@/lib/tv-control";

interface AnnouncementGridProps {
  announcements: Announcement[];
  onAnnouncementDelete: (id: string) => void;
  onAnnouncementReorder: (announcements: Announcement[]) => void;
}

const PlayOnTvButton = ({ announcement }: { announcement: Announcement }) => {
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const send = async () => {
    setSending(true);
    try {
      await requestAnnouncementOnTv({ announcementId: announcement.id });
      toast({
        title: "Locução enviada",
        description: `"${announcement.name}" toca nas TVs abertas em alguns segundos.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro",
        description: "Não foi possível falar com as TVs. Confira a conexão e tente de novo.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={send}
      disabled={sending}
      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
      aria-label={`Tocar ${announcement.name} agora na TV`}
      title="Tocar agora na TV"
    >
      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tv className="h-4 w-4" />}
    </Button>
  );
};

const SortableAnnouncementItem = ({ 
  announcement, 
  onDelete 
}: { 
  announcement: Announcement;
  onDelete: (id: string) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: announcement.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40 sm:px-4"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label={`Mover ${announcement.name}`}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {announcement.order + 1}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{announcement.name}</p>
        <p className="text-xs text-muted-foreground">
          Enviada em {new Date(announcement.uploadedAt).toLocaleDateString("pt-BR")}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <AudioPreviewControls
          bucket="announcements"
          filePath={announcement.url}
          fileName={announcement.name}
        />
        <PlayOnTvButton announcement={announcement} />
        <ConfirmDeleteButton
          itemName={announcement.name}
          description="A locução deixa de tocar na loja e o arquivo é apagado. Não dá para desfazer."
          confirmLabel="Excluir locução"
          onConfirm={() => onDelete(announcement.id)}
        />
      </div>
    </li>
  );
};

export const AnnouncementGrid = ({
  announcements,
  onAnnouncementDelete,
  onAnnouncementReorder
}: AnnouncementGridProps) => {
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(announcements.length / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const paged = announcements.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = announcements.findIndex((a) => a.id === active.id);
      const newIndex = announcements.findIndex((a) => a.id === over.id);

      const newAnnouncements = [...announcements];
      const [movedItem] = newAnnouncements.splice(oldIndex, 1);
      newAnnouncements.splice(newIndex, 0, movedItem);

      const reorderedAnnouncements = newAnnouncements.map((announcement, index) => ({
        ...announcement,
        order: index,
      }));

      onAnnouncementReorder(reorderedAnnouncements);
    }
  };

  if (announcements.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Music className="h-12 w-12 mx-auto mb-4 opacity-20" />
        <p>Nenhuma locução adicionada ainda.</p>
        <p className="text-sm">Faça upload de arquivos de áudio acima.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {announcements.length} {announcements.length === 1 ? "locução" : "locuções"} · arraste pela alça para ordenar
      </p>
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={paged.map(a => a.id)} strategy={verticalListSortingStrategy}>
          <ul className="divide-y overflow-hidden rounded-lg border bg-card shadow-sm">
            {paged.map((announcement) => (
              <SortableAnnouncementItem
                key={announcement.id}
                announcement={announcement}
                onDelete={onAnnouncementDelete}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalItems={announcements.length}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
};
