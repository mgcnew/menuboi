import { useEffect, useState } from "react";
import { Pagination } from "@/components/Pagination";
import { Music, Trash2, GripVertical, CheckSquare, Square, X } from "lucide-react";
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
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AudioPreviewControls } from "@/components/AudioPreviewControls";

interface AudioGridProps {
  audios: AudioTrack[];
  onAudioDelete: (id: string) => void;
  onAudioReorder: (audios: AudioTrack[]) => void;
  onMultiDelete?: (ids: string[]) => void;
}

interface SortableAudioProps {
  audio: AudioTrack;
  onDelete: (id: string) => void;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  selectionMode: boolean;
}

const SortableAudio = ({
  audio,
  onDelete,
  isSelected,
  onToggleSelect,
  selectionMode,
}: SortableAudioProps) => {
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
      <Card
        className={`p-4 hover:shadow-lg transition-all cursor-pointer ${
          isSelected ? "ring-2 ring-primary bg-primary/5" : ""
        }`}
        onClick={() => selectionMode && onToggleSelect(audio.id)}
      >
        <div className="flex items-center gap-3">
          {selectionMode ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(audio.id);
              }}
              className="text-primary"
            >
              {isSelected ? (
                <CheckSquare className="h-5 w-5" />
              ) : (
                <Square className="h-5 w-5" />
              )}
            </button>
          ) : (
            <button
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-5 w-5" />
            </button>
          )}

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

          {!selectionMode && (
            <>
              <AudioPreviewControls
                bucket="audio-tracks"
                filePath={audio.url}
                fileName={audio.name}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(audio.id)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export const AudioGrid = ({
  audios,
  onAudioDelete,
  onAudioReorder,
  onMultiDelete,
}: AudioGridProps) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(audios.length / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const pagedAudios = audios.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

      const reorderedAudios = arrayMove(audios, oldIndex, newIndex).map(
        (audio, index) => ({
          ...audio,
          order: index,
        })
      );

      onAudioReorder(reorderedAudios);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    setSelectedIds(new Set(audios.map((a) => a.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const handleMultiDelete = () => {
    if (selectedIds.size === 0) return;

    if (onMultiDelete) {
      onMultiDelete(Array.from(selectedIds));
    } else {
      // Fallback: delete one by one
      selectedIds.forEach((id) => onAudioDelete(id));
    }
    clearSelection();
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
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {!selectionMode ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectionMode(true)}
            >
              <CheckSquare className="h-4 w-4 mr-2" />
              Selecionar
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={selectAll}>
                Selecionar Todos
              </Button>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            </>
          )}
        </div>

        {selectionMode && selectedIds.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleMultiDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* Audio List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={pagedAudios.map((a) => a.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {pagedAudios.map((audio) => (
              <SortableAudio
                key={audio.id}
                audio={audio}
                onDelete={onAudioDelete}
                isSelected={selectedIds.has(audio.id)}
                onToggleSelect={toggleSelect}
                selectionMode={selectionMode}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalItems={audios.length}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
};
