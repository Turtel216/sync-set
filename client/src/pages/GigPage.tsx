import { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useAuth } from "../context/AuthContext";
import { useGigSocket } from "../hooks/useGigSocket";
import { SongCard } from "../components/SongCard";
import { SortableSongCard } from "../components/SortableSongCard";
import { DraggablePoolSong } from "../components/DraggablePoolSong";

import {
  ArrowLeft, Plus, Loader2, Music, Calendar, MapPin,
  ListMusic, Hash, Wifi, WifiOff, Users,
} from "lucide-react";

const POOL_ID = "pool-droppable";
const SETLIST_ID = "setlist-droppable";

function DroppablePool({ children, isOver }: { children: React.ReactNode; isOver: boolean }) {
  const { setNodeRef } = useDroppable({ id: POOL_ID });

  return (
    <div
      ref={setNodeRef}
      className={`space-y-2 min-h-[100px] rounded-xl p-2 -m-2 transition-colors duration-200 ${
        isOver ? "bg-brand-500/5 ring-1 ring-brand-500/20" : ""
      }`}
    >
      {children}
    </div>
  );
}

function DroppableSetlist({ children, isOver, isEmpty }: { children: React.ReactNode; isOver: boolean; isEmpty: boolean }) {
  const { setNodeRef } = useDroppable({ id: SETLIST_ID });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[100px] rounded-xl transition-all duration-200 ${
        isEmpty && !isOver
          ? "border-2 border-dashed border-zinc-800 py-16 text-center"
          : isEmpty && isOver
            ? "border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 py-16 text-center"
            : isOver
              ? "bg-emerald-500/5 ring-1 ring-emerald-500/20 p-2 -m-2 space-y-2"
              : "space-y-2 p-2 -m-2"
      }`}
    >
      {children}
    </div>
  );
}

/** Custom collision detection: use rectIntersection for containers, pointerWithin for items */
const customCollision: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }
  return rectIntersection(args);
};

export function GigPage() {
  const { gigId } = useParams<{ gigId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const {
    gig,
    songs,
    onlineUsers,
    connected,
    loading,
    error,
    addSong,
    removeSong,
    voteSong,
    updateSetlist,
    setSongs,
  } = useGigSocket(gigId);

  const [showAddSong, setShowAddSong] = useState(false);
  const [songTitle, setSongTitle] = useState("");
  const [songArtist, setSongArtist] = useState("");
  const [songBpm, setSongBpm] = useState("");
  const [songKey, setSongKey] = useState("");

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [overContainerId, setOverContainerId] = useState<string | null>(null);

  const poolSongs = useMemo(
    () => songs.filter((s) => s.setlistOrder === null).sort((a, b) => b.votes - a.votes),
    [songs]
  );

  const setlistSongs = useMemo(
    () => songs.filter((s) => s.setlistOrder !== null).sort((a, b) => (a.setlistOrder ?? 0) - (b.setlistOrder ?? 0)),
    [songs]
  );

  const setlistIds = useMemo(() => setlistSongs.map((s) => s.id), [setlistSongs]);

  const activeSong = useMemo(
    () => (activeDragId ? songs.find((s) => s.id === activeDragId) ?? null : null),
    [activeDragId, songs]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const findContainer = useCallback(
    (id: string): "pool" | "setlist" | null => {
      if (id === POOL_ID) return "pool";
      if (id === SETLIST_ID) return "setlist";
      if (poolSongs.some((s) => s.id === id)) return "pool";
      if (setlistSongs.some((s) => s.id === id)) return "setlist";
      return null;
    },
    [poolSongs, setlistSongs]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const overId = event.over?.id;
      if (!overId) {
        setOverContainerId(null);
        return;
      }
      const container = findContainer(String(overId));
      setOverContainerId(container === "pool" ? POOL_ID : container === "setlist" ? SETLIST_ID : null);
    },
    [findContainer]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragId(null);
      setOverContainerId(null);

      const { active, over } = event;
      if (!over) return;

      const activeId = String(active.id);
      const overId = String(over.id);
      const sourceContainer = active.data.current?.container as string | undefined;
      const targetContainer = findContainer(overId);

      if (!sourceContainer || !targetContainer) return;

      // Pool to Setlist: add song to end of setlist
      if (sourceContainer === "pool" && targetContainer === "setlist") {
        const newSetlistIds = [...setlistIds];

        // Insert at the position of the overId if its a setlist item, or at end
        const overIndex = newSetlistIds.indexOf(overId);
        if (overIndex >= 0) {
          newSetlistIds.splice(overIndex, 0, activeId);
        } else {
          newSetlistIds.push(activeId);
        }

        // Optimistic update
        setSongs((prev) =>
          prev.map((s) => {
            if (s.id === activeId) {
              return { ...s, setlistOrder: newSetlistIds.indexOf(activeId) + 1 };
            }
            const idx = newSetlistIds.indexOf(s.id);
            if (idx >= 0) {
              return { ...s, setlistOrder: idx + 1 };
            }
            return { ...s, setlistOrder: null };
          })
        );

        updateSetlist(newSetlistIds);
        return;
      }

      // Setlist to Pool: remove song from setlist
      if (sourceContainer === "setlist" && targetContainer === "pool") {
        const newSetlistIds = setlistIds.filter((id) => id !== activeId);

        // Optimistic update
        setSongs((prev) =>
          prev.map((s) => {
            if (s.id === activeId) {
              return { ...s, setlistOrder: null };
            }
            const idx = newSetlistIds.indexOf(s.id);
            if (idx >= 0) {
              return { ...s, setlistOrder: idx + 1 };
            }
            return s;
          })
        );

        updateSetlist(newSetlistIds);
        return;
      }

      // Reorder within Setlist
      if (sourceContainer === "setlist" && targetContainer === "setlist") {
        if (activeId === overId) return;

        const oldIndex = setlistIds.indexOf(activeId);
        const newIndex = setlistIds.indexOf(overId);
        if (oldIndex < 0 || newIndex < 0) return;

        const newOrder = arrayMove(setlistIds, oldIndex, newIndex);

        // Optimistic update
        setSongs((prev) =>
          prev.map((s) => {
            const idx = newOrder.indexOf(s.id);
            if (idx >= 0) {
              return { ...s, setlistOrder: idx + 1 };
            }
            return s;
          })
        );

        updateSetlist(newOrder);
        return;
      }
    },
    [findContainer, setlistIds, setSongs, updateSetlist]
  );

  const handleAddSong = (e: React.FormEvent) => {
    e.preventDefault();
    if (!songTitle.trim() || !songArtist.trim()) return;
    addSong({
      title: songTitle.trim(),
      artist: songArtist.trim(),
      bpm: songBpm ? parseInt(songBpm) : undefined,
      key: songKey.trim() || undefined,
    });
    setSongTitle("");
    setSongArtist("");
    setSongBpm("");
    setSongKey("");
  };

  const handleVote = (songId: string, value: number) => {
    voteSong(songId, value);
  };

  const handleRemove = (songId: string) => {
    removeSong(songId);
  };

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 spinner mx-auto mb-3" />
          <p className="text-sm text-zinc-500">Connecting to session...</p>
        </div>
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="page-container flex items-center justify-center min-h-screen">
        <p className="text-zinc-400">Gig not found</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button id="back-to-band" onClick={() => navigate(`/bands/${gig.bandId}`)} className="btn-icon">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-zinc-100 truncate">{gig.name}</h1>
            <div className="flex items-center gap-3 text-sm text-zinc-500">
              {gig.bandName && <span className="text-brand-400 font-medium">{gig.bandName}</span>}
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(gig.date).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              {gig.venue && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {gig.venue}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {onlineUsers.length > 0 && (
              <div className="hidden sm:flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5">
                <Users className="w-3.5 h-3.5 text-brand-400" />
                <div className="flex -space-x-1.5">
                  {onlineUsers.slice(0, 5).map((u) => (
                    <div
                      key={u.userId}
                      title={u.username}
                      className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-600/50 to-brand-800/50 flex items-center justify-center text-[10px] font-medium text-brand-200 border border-zinc-900 ring-1 ring-brand-500/20"
                    >
                      {u.username[0].toUpperCase()}
                    </div>
                  ))}
                  {onlineUsers.length > 5 && (
                    <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-medium text-zinc-400 border border-zinc-900">
                      +{onlineUsers.length - 5}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg ${
                connected
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
              }`}
            >
              {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span className="hidden sm:inline">{connected ? "Live" : "Offline"}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
            {error}
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={customCollision}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Song Pool */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-title">
                  <Music className="w-5 h-5 text-brand-400" />
                  Song Pool
                  <span className="badge-zinc ml-1">{poolSongs.length}</span>
                </h2>
                <button
                  id="toggle-add-song"
                  onClick={() => setShowAddSong(!showAddSong)}
                  className="btn-primary text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Song
                </button>
              </div>

              {showAddSong && (
                <form onSubmit={handleAddSong} className="card mb-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="song-title" className="block text-sm font-medium text-zinc-400 mb-1.5">
                        Title
                      </label>
                      <input
                        id="song-title"
                        type="text"
                        value={songTitle}
                        onChange={(e) => setSongTitle(e.target.value)}
                        placeholder="Song title"
                        className="w-full"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label htmlFor="song-artist" className="block text-sm font-medium text-zinc-400 mb-1.5">
                        Artist
                      </label>
                      <input
                        id="song-artist"
                        type="text"
                        value={songArtist}
                        onChange={(e) => setSongArtist(e.target.value)}
                        placeholder="Artist name"
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="song-bpm" className="block text-sm font-medium text-zinc-400 mb-1.5">
                        BPM (optional)
                      </label>
                      <input
                        id="song-bpm"
                        type="number"
                        value={songBpm}
                        onChange={(e) => setSongBpm(e.target.value)}
                        placeholder="120"
                        min="1"
                        max="300"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label htmlFor="song-key" className="block text-sm font-medium text-zinc-400 mb-1.5">
                        Key (optional)
                      </label>
                      <input
                        id="song-key"
                        type="text"
                        value={songKey}
                        onChange={(e) => setSongKey(e.target.value)}
                        placeholder="Am"
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button id="add-song-submit" type="submit" className="btn-primary">
                      <Plus className="w-4 h-4" />
                      Add to Pool
                    </button>
                  </div>
                </form>
              )}

              <DroppablePool isOver={overContainerId === POOL_ID}>
                {poolSongs.length === 0 && !activeDragId ? (
                  <div className="text-center py-12">
                    <Music className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-500 text-sm">No songs in the pool yet</p>
                    <p className="text-zinc-600 text-xs mt-1">Add songs and vote on them</p>
                  </div>
                ) : (
                  poolSongs.map((song) => (
                    <DraggablePoolSong
                      key={song.id}
                      song={song}
                      userId={user!.id}
                      onVote={handleVote}
                      onRemove={handleRemove}
                    />
                  ))
                )}
              </DroppablePool>
            </section>

            {/* Setlist */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-title">
                  <ListMusic className="w-5 h-5 text-emerald-400" />
                  Setlist
                  <span className="badge-emerald ml-1">{setlistSongs.length}</span>
                </h2>
                {setlistSongs.length > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-zinc-500">
                    <Hash className="w-3.5 h-3.5" />
                    {setlistSongs.length} tracks
                  </div>
                )}
              </div>

              <SortableContext items={setlistIds} strategy={verticalListSortingStrategy}>
                <DroppableSetlist
                  isOver={overContainerId === SETLIST_ID}
                  isEmpty={setlistSongs.length === 0}
                >
                  {setlistSongs.length === 0 ? (
                    <>
                      <ListMusic className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                      <p className="text-zinc-500 text-sm">Your setlist is empty</p>
                      <p className="text-zinc-600 text-xs mt-1">Drag songs from the pool to build your setlist</p>
                    </>
                  ) : (
                    setlistSongs.map((song, index) => (
                      <SortableSongCard
                        key={song.id}
                        song={song}
                        userId={user!.id}
                        position={index + 1}
                        onVote={handleVote}
                        onRemove={handleRemove}
                      />
                    ))
                  )}
                </DroppableSetlist>
              </SortableContext>
            </section>
          </div>

          <DragOverlay dropAnimation={null}>
            {activeSong ? (
              <SongCard
                song={activeSong}
                userId={user!.id}
                isOverlay
                showDragHandle={activeSong.setlistOrder !== null}
                onVote={() => {}}
                onRemove={() => {}}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
