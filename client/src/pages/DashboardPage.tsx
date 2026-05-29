import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import type { Band } from "../shared/types";
import { Music, Users, Plus, ChevronRight, Loader2, LogOut, CalendarDays } from "lucide-react";

export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newBandName, setNewBandName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const fetchBands = useCallback(async () => {
    try {
      const data = await api.get<Band[]>("/bands");
      setBands(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bands");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBands();
  }, [fetchBands]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBandName.trim()) return;
    setCreating(true);
    try {
      const band = await api.post<Band>("/bands", { name: newBandName.trim() });
      setBands((prev) => [band, ...prev]);
      setNewBandName("");
      setShowCreate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create band");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page-container">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-md shadow-brand-500/20">
              <Music className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-zinc-100 tracking-tight">SyncSet</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-400 hidden sm:block">
              Hey, <span className="text-zinc-200 font-medium">{user?.username}</span>
            </span>
            <button id="logout-btn" onClick={logout} className="btn-ghost text-sm">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="page-content">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-zinc-100">Your Bands</h2>
          <button
            id="create-band-toggle"
            onClick={() => setShowCreate(!showCreate)}
            className="btn-primary text-sm"
          >
            <Plus className="w-4 h-4" />
            New Band
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
            {error}
          </div>
        )}

        {showCreate && (
          <form onSubmit={handleCreate} className="card mb-6 flex gap-3 items-end">
            <div className="flex-1">
              <label htmlFor="new-band-name" className="block text-sm font-medium text-zinc-400 mb-1.5">
                Band Name
              </label>
              <input
                id="new-band-name"
                type="text"
                value={newBandName}
                onChange={(e) => setNewBandName(e.target.value)}
                placeholder="Enter band name"
                className="w-full"
                autoFocus
              />
            </div>
            <button id="create-band-submit" type="submit" disabled={creating} className="btn-primary">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create
            </button>
          </form>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 spinner" />
          </div>
        ) : bands.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-zinc-600" />
            </div>
            <h3 className="text-lg font-medium text-zinc-300 mb-2">No bands yet</h3>
            <p className="text-zinc-500 text-sm">Create your first band to start planning setlists</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bands.map((band) => (
              <button
                key={band.id}
                id={`band-card-${band.id}`}
                onClick={() => navigate(`/bands/${band.id}`)}
                className="card-hover text-left group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-600/30 to-brand-800/30 flex items-center justify-center border border-brand-500/20">
                    <Users className="w-5 h-5 text-brand-400" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-100 mb-2">{band.name}</h3>
                <div className="flex items-center gap-4 text-sm text-zinc-500">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {band.members?.length || 0} members
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {band._count?.gigs ?? 0} gigs
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
