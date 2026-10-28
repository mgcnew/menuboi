import { useEffect, useState } from "react";
import { Pagination } from "@/components/Pagination";
import { Music, Trash2, GripVertical, CheckSquare, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";

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
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-3 py-2.5 transition-colors sm:px-4 ${
        selectionMode ? "cursor-pointer" : ""
      } ${isSelected ? "bg-primary/5" : "hover:bg-muted/40"}`}
      onClick={() => selectionMode && onToggleSelect(audio.id)}
    >
      {selectionMode ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(audio.id);
          }}
          className={isSelected ? "text-primary" : "text-muted-foreground"}
          aria-label={isSelected ? `Desmarcar ${audio.name}` : `Marcar ${audio.name}`}
          aria-pressed={isSelected}
        >
          {isSelected ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
        </button>
      ) : (
        <button
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label={`Mover ${audio.name}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}

      <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {audio.order + 1}
      </span>

      <p className="min-w-0 flex-1 truncate text-sm font-medium">{audio.name}</p>

      {!selectionMode && (
        <div className="flex shrink-0 items-center gap-1">
          <AudioPreviewControls
            bucket="audio-tracks"
            filePath={audio.url}
            fileName={audio.name}
          />
          <ConfirmDeleteButton
            itemName={audio.name}
            description="A música sai da programação e o arquivo é apagado. Não dá para desfazer."
            confirmLabel="Excluir música"
            onConfirm={() => onDelete(audio.id)}
          />
        </div>
      )}
    </li>
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {selectionMode
            ? `${selectedIds.size} de ${audios.length} selecionadas`
            : `${audios.length} ${audios.length === 1 ? "música" : "músicas"} · arraste pela alça para ordenar`}
        </p>
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
                Selecionar todas
              </Button>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            </>
          )}
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
          <ul className="divide-y overflow-hidden rounded-lg border bg-card shadow-sm">
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
          </ul>
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
