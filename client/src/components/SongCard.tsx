import type { Song } from "../shared/types";
import { ThumbsUp, ThumbsDown, GripVertical, Trash2 } from "lucide-react";
import { forwardRef } from "react";

interface SongCardProps {
  song: Song;
  userId: string;
  showDragHandle?: boolean;
  position?: number;
  isDragging?: boolean;
  isOverlay?: boolean;
  dragHandleProps?: Record<string, unknown>;
  onVote: (songId: string, value: number) => void;
  onRemove: (songId: string) => void;
}

export const SongCard = forwardRef<HTMLDivElement, SongCardProps>(function SongCard(
  { song, userId, showDragHandle, position, isDragging, isOverlay, dragHandleProps, onVote, onRemove },
  ref
) {
  const userVote = song.voteRecords?.find((v) => v.userId === userId);
  const canRemove = song.addedById === userId;

  return (
    <div
      ref={ref}
      className={`group bg-zinc-900 border rounded-lg px-4 py-3 flex items-center gap-3 transition-all duration-200 ${isDragging
          ? "opacity-40 border-brand-500/30"
          : isOverlay
            ? "border-brand-500 shadow-lg shadow-brand-500/20 scale-[1.02] bg-zinc-800"
            : "border-zinc-800 hover:border-zinc-700"
        }`}
    >
      {showDragHandle && (
        <div
          {...dragHandleProps}
          className="cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 touch-none"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      {position !== undefined && (
        <span className="w-7 h-7 rounded-md bg-brand-600/20 text-brand-300 text-sm font-semibold flex items-center justify-center shrink-0">
          {position}
        </span>
      )}

      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-zinc-100 truncate">{song.title}</h4>
        <p className="text-xs text-zinc-500 truncate">{song.artist}</p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {song.bpm && <span className="badge-amber text-[11px]">{song.bpm} BPM</span>}
        {song.key && <span className="badge-emerald text-[11px]">{song.key}</span>}
      </div>

      {!showDragHandle && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            id={`upvote-${song.id}`}
            onClick={() => onVote(song.id, 1)}
            className={`p-1.5 rounded-md transition-all duration-200 ${userVote?.value === 1
                ? "bg-emerald-500/20 text-emerald-400"
                : "text-zinc-600 hover:text-emerald-400 hover:bg-emerald-500/10"
              }`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
          </button>
          <span
            className={`text-sm font-semibold min-w-[1.5rem] text-center ${song.votes > 0
                ? "text-emerald-400"
                : song.votes < 0
                  ? "text-rose-400"
                  : "text-zinc-500"
              }`}
          >
            {song.votes}
          </span>
          <button
            id={`downvote-${song.id}`}
            onClick={() => onVote(song.id, -1)}
            className={`p-1.5 rounded-md transition-all duration-200 ${userVote?.value === -1
                ? "bg-rose-500/20 text-rose-400"
                : "text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10"
              }`}
          >
            <ThumbsDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {canRemove && (
        <button
          id={`remove-song-${song.id}`}
          onClick={() => onRemove(song.id)}
          className="p-1.5 rounded-md text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200 opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
});
