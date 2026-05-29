import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import type { Gig, Song } from "../shared/types";
import {
  ArrowLeft, Plus, Loader2, Music, ThumbsUp, ThumbsDown,
  GripVertical, Trash2, Calendar, MapPin, ListMusic, Hash,
} from "lucide-react";

function SongCard({
  song,
  userId,
  showDragHandle,
  position,
  onVote,
  onRemove,
}: {
  song: Song;
  userId: string;
  showDragHandle?: boolean;
  position?: number;
  onVote: (songId: string, value: number) => void;
  onRemove: (songId: string) => void;
}) {
  const userVote = song.voteRecords?.find((v) => v.userId === userId);
  const canRemove = song.addedById === userId;

  return (
    <div className="group bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-center gap-3 hover:border-zinc-700 transition-all duration-200">
      {showDragHandle && (
        <div className="cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400">
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      {position !== undefined && (
        <span className="w-7 h-7 rounded-md bg-brand-600/20 text-brand-300 text-sm font-semibold flex items-center justify-center shrink-0">
          {position}
        </span>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-zinc-100 truncate">{song.title}</h4>
        </div>
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
            className={`p-1.5 rounded-md transition-all duration-200 ${
              userVote?.value === 1
                ? "bg-emerald-500/20 text-emerald-400"
                : "text-zinc-600 hover:text-emerald-400 hover:bg-emerald-500/10"
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
          </button>
          <span
            className={`text-sm font-semibold min-w-[1.5rem] text-center ${
              song.votes > 0
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
            className={`p-1.5 rounded-md transition-all duration-200 ${
              userVote?.value === -1
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
}

export function GigPage() {
  const { gigId } = useParams<{ gigId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [gig, setGig] = useState<Gig | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showAddSong, setShowAddSong] = useState(false);
  const [songTitle, setSongTitle] = useState("");
  const [songArtist, setSongArtist] = useState("");
  const [songBpm, setSongBpm] = useState("");
  const [songKey, setSongKey] = useState("");
  const [addingSong, setAddingSong] = useState(false);

  const poolSongs = songs
    .filter((s) => s.setlistOrder === null)
    .sort((a, b) => b.votes - a.votes);

  const setlistSongs = songs
    .filter((s) => s.setlistOrder !== null)
    .sort((a, b) => (a.setlistOrder ?? 0) - (b.setlistOrder ?? 0));

  const fetchGig = useCallback(async () => {
    if (!gigId) return;
    try {
      const data = await api.get<Gig>(`/gigs/${gigId}`);
      setGig(data);
      setSongs(data.songs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load gig");
    } finally {
      setLoading(false);
    }
  }, [gigId]);

  useEffect(() => {
    fetchGig();
  }, [fetchGig]);

  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!songTitle.trim() || !songArtist.trim() || !gigId) return;
    setAddingSong(true);
    try {
      const song = await api.post<Song>(`/gigs/${gigId}/songs`, {
        title: songTitle.trim(),
        artist: songArtist.trim(),
        bpm: songBpm ? parseInt(songBpm) : undefined,
        key: songKey.trim() || undefined,
      });
      setSongs((prev) => [...prev, song]);
      setSongTitle("");
      setSongArtist("");
      setSongBpm("");
      setSongKey("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add song");
    } finally {
      setAddingSong(false);
    }
  };

  const handleVote = async (songId: string, value: number) => {
    if (!gigId) return;
    try {
      const updated = await api.post<Song>(`/songs/${songId}/vote`, { value });
      setSongs((prev) => prev.map((s) => (s.id === songId ? updated : s)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to vote");
    }
  };

  const handleRemove = async (songId: string) => {
    try {
      await api.delete(`/songs/${songId}`);
      setSongs((prev) => prev.filter((s) => s.id !== songId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove song");
    }
  };

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 spinner" />
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
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
            {error}
          </div>
        )}

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
                  <button id="add-song-submit" type="submit" disabled={addingSong} className="btn-primary">
                    {addingSong ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Add to Pool
                  </button>
                </div>
              </form>
            )}

            {poolSongs.length === 0 ? (
              <div className="card text-center py-12">
                <Music className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500 text-sm">No songs in the pool yet</p>
                <p className="text-zinc-600 text-xs mt-1">Add songs and vote on them</p>
              </div>
            ) : (
              <div className="space-y-2">
                {poolSongs.map((song) => (
                  <SongCard
                    key={song.id}
                    song={song}
                    userId={user!.id}
                    onVote={handleVote}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            )}
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

            {setlistSongs.length === 0 ? (
              <div className="border-2 border-dashed border-zinc-800 rounded-xl py-16 text-center">
                <ListMusic className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500 text-sm">Your setlist is empty</p>
                <p className="text-zinc-600 text-xs mt-1">Drag songs from the pool to build your setlist</p>
              </div>
            ) : (
              <div className="space-y-2">
                {setlistSongs.map((song, index) => (
                  <SongCard
                    key={song.id}
                    song={song}
                    userId={user!.id}
                    showDragHandle
                    position={index + 1}
                    onVote={handleVote}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
