import { Music, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AudioTrack } from "@/types/slideshow";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface AudioGridProps {
  audios: AudioTrack[];
  onAudioDelete: (id: string) => void;
  onAudioReorder: (audios: AudioTrack[]) => void;
}

interface SortableAudioProps {
  audio: AudioTrack;
  onDelete: (id: string) => void;
}

const SortableAudio = ({ audio, onDelete }: SortableAudioProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: audio.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="p-4 hover:shadow-lg transition-shadow">
        <div className="flex items-center gap-3">
          <button
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" />
          </button>

          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-lg bg-accent/50 flex items-center justify-center">
              <Music className="h-6 w-6 text-primary" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{audio.name}</p>
            <p className="text-sm text-muted-foreground">
              Ordem: {audio.order + 1}
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(audio.id)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
};

export const AudioGrid = ({ audios, onAudioDelete, onAudioReorder }: AudioGridProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = audios.findIndex((audio) => audio.id === active.id);
      const newIndex = audios.findIndex((audio) => audio.id === over.id);

      const reorderedAudios = arrayMove(audios, oldIndex, newIndex).map((audio, index) => ({
        ...audio,
        order: index,
      }));

      onAudioReorder(reorderedAudios);
    }
  };

  if (audios.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nenhuma música ou vinheta adicionada ainda.</p>
        <p className="text-sm mt-2">Faça upload para começar!</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={audios.map(a => a.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {audios.map((audio) => (
            <SortableAudio
              key={audio.id}
              audio={audio}
              onDelete={onAudioDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};