import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, Music, Trash2 } from "lucide-react";
import { Announcement } from "@/types/slideshow";
import { AudioPreviewControls } from "@/components/AudioPreviewControls";

interface AnnouncementGridProps {
  announcements: Announcement[];
  onAnnouncementDelete: (id: string) => void;
  onAnnouncementReorder: (announcements: Announcement[]) => void;
}

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
    <Card
      ref={setNodeRef}
      style={style}
      className="p-4 flex items-center space-x-4 bg-card hover:bg-accent/5 transition-colors"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
        <Music className="h-5 w-5 text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{announcement.name}</p>
        <p className="text-sm text-muted-foreground">
          {new Date(announcement.uploadedAt).toLocaleDateString()}
        </p>
      </div>

      <AudioPreviewControls
        bucket="announcements"
        filePath={announcement.url}
        fileName={announcement.name}
      />

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(announcement.id)}
        className="flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </Card>
  );
};

export const AnnouncementGrid = ({ 
  announcements, 
  onAnnouncementDelete, 
  onAnnouncementReorder 
}: AnnouncementGridProps) => {
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
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={announcements} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <SortableAnnouncementItem
              key={announcement.id}
              announcement={announcement}
              onDelete={onAnnouncementDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};
