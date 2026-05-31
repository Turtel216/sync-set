import { useDraggable } from "@dnd-kit/core";
import { SongCard } from "./SongCard";
import type { Song } from "../shared/types";

interface DraggablePoolSongProps {
  song: Song;
  userId: string;
  onVote: (songId: string, value: number) => void;
  onRemove: (songId: string) => void;
}

export function DraggablePoolSong({ song, userId, onVote, onRemove }: DraggablePoolSongProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: song.id,
    data: { song, container: "pool" },
  });

  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className="touch-none">
      <SongCard
        song={song}
        userId={userId}
        isDragging={isDragging}
        onVote={onVote}
        onRemove={onRemove}
      />
    </div>
  );
}
