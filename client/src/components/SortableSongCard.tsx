import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SongCard } from "./SongCard";
import type { Song } from "../shared/types";

interface SortableSongCardProps {
  song: Song;
  userId: string;
  position: number;
  onVote: (songId: string, value: number) => void;
  onRemove: (songId: string) => void;
}

export function SortableSongCard({ song, userId, position, onVote, onRemove }: SortableSongCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.id, data: { song, container: "setlist" } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <SongCard
        song={song}
        userId={userId}
        showDragHandle
        position={position}
        isDragging={isDragging}
        dragHandleProps={listeners}
        onVote={onVote}
        onRemove={onRemove}
      />
    </div>
  );
}
