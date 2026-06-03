import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import type { Band, Gig } from "../shared/types";
import {
  ArrowLeft, Users, Plus, Calendar, MapPin, ChevronRight,
  Loader2, Music, Shield, UserPlus,
} from "lucide-react";

export function BandPage() {
  const { bandId } = useParams<{ bandId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [band, setBand] = useState<Band | null>(null);
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showAddMember, setShowAddMember] = useState(false);
  const [memberUsername, setMemberUsername] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  const [showCreateGig, setShowCreateGig] = useState(false);
  const [gigName, setGigName] = useState("");
  const [gigDate, setGigDate] = useState("");
  const [gigVenue, setGigVenue] = useState("");
  const [creatingGig, setCreatingGig] = useState(false);

  const isAdmin = band?.members?.some(
    (m) => m.userId === user?.id && m.role === "ADMIN"
  );

  const fetchData = useCallback(async () => {
    if (!bandId) return;
    try {
      const [bandData, gigsData] = await Promise.all([
        api.get<Band>(`/bands/${bandId}`),
        api.get<Gig[]>(`/bands/${bandId}/gigs`),
      ]);
      setBand(bandData);
      setGigs(gigsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load band");
    } finally {
      setLoading(false);
    }
  }, [bandId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberUsername.trim() || !bandId) return;
    setAddingMember(true);
    setError("");
    try {
      await api.post(`/bands/${bandId}/members`, { username: memberUsername.trim() });
      setMemberUsername("");
      setShowAddMember(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setAddingMember(false);
    }
  };

  const handleCreateGig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gigName.trim() || !gigDate || !bandId) return;
    setCreatingGig(true);
    setError("");
    try {
      const gig = await api.post<Gig>(`/bands/${bandId}/gigs`, {
        name: gigName.trim(),
        date: gigDate,
        venue: gigVenue.trim() || undefined,
      });
      setGigs((prev) => [...prev, gig]);
      setGigName("");
      setGigDate("");
      setGigVenue("");
      setShowCreateGig(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create gig");
    } finally {
      setCreatingGig(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 spinner" />
      </div>
    );
  }

  if (!band) {
    return (
      <div className="page-container flex items-center justify-center min-h-screen">
        <p className="text-zinc-400">Band not found</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button id="back-to-dashboard" type="button" onClick={() => navigate("/")} className="btn-icon">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">{band.name}</h1>
            <p className="text-sm text-zinc-500">{band.members.length} members</p>
          </div>
        </div>
      </header>

      <div className="page-content space-y-8">
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
            {error}
          </div>
        )}

        {/* Members Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">
              <Users className="w-5 h-5 text-brand-400" />
              Members
            </h2>
            {isAdmin && (
              <button
                id="toggle-add-member"
                type="button"
                onClick={() => setShowAddMember(!showAddMember)}
                className="btn-ghost text-sm"
              >
                <UserPlus className="w-4 h-4" />
                Add Member
              </button>
            )}
          </div>

          {showAddMember && (
            <form onSubmit={handleAddMember} className="card mb-4 flex gap-3 items-end">
              <div className="flex-1">
                <label htmlFor="member-username" className="block text-sm font-medium text-zinc-400 mb-1.5">
                  Username
                </label>
                <input
                  id="member-username"
                  type="text"
                  value={memberUsername}
                  onChange={(e) => setMemberUsername(e.target.value)}
                  placeholder="Enter username to invite"
                  className="w-full"
                  autoFocus
                />
              </div>
              <button id="add-member-submit" type="submit" disabled={addingMember} className="btn-primary">
                {addingMember ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Invite
              </button>
            </form>
          )}

          <div className="flex flex-wrap gap-3">
            {band.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-600/40 to-brand-800/40 flex items-center justify-center text-sm font-medium text-brand-300 border border-brand-500/20">
                  {member.user.username[0].toUpperCase()}
                </div>
                <span className="text-sm text-zinc-200 font-medium">{member.user.username}</span>
                {member.role === "ADMIN" ? (
                  <span className="badge-violet flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Admin
                  </span>
                ) : (
                  <span className="badge-zinc">Member</span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Gigs Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">
              <Calendar className="w-5 h-5 text-brand-400" />
              Gigs
            </h2>
            <button
              id="toggle-create-gig"
              type="button"
              onClick={() => setShowCreateGig(!showCreateGig)}
              className="btn-primary text-sm"
            >
              <Plus className="w-4 h-4" />
              New Gig
            </button>
          </div>

          {showCreateGig && (
            <form onSubmit={handleCreateGig} className="card mb-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor="gig-name" className="block text-sm font-medium text-zinc-400 mb-1.5">
                    Gig Name
                  </label>
                  <input
                    id="gig-name"
                    type="text"
                    value={gigName}
                    onChange={(e) => setGigName(e.target.value)}
                    placeholder="Friday Night Show"
                    className="w-full"
                    autoFocus
                  />
                </div>
                <div>
                  <label htmlFor="gig-date" className="block text-sm font-medium text-zinc-400 mb-1.5">
                    Date
                  </label>
                  <input
                    id="gig-date"
                    type="datetime-local"
                    value={gigDate}
                    onChange={(e) => setGigDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label htmlFor="gig-venue" className="block text-sm font-medium text-zinc-400 mb-1.5">
                    Venue (optional)
                  </label>
                  <input
                    id="gig-venue"
                    type="text"
                    value={gigVenue}
                    onChange={(e) => setGigVenue(e.target.value)}
                    placeholder="The Blue Note"
                    className="w-full"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button id="create-gig-submit" type="submit" disabled={creatingGig} className="btn-primary">
                  {creatingGig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create Gig
                </button>
              </div>
            </form>
          )}

          {gigs.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                <Music className="w-8 h-8 text-zinc-600" />
              </div>
              <h3 className="text-lg font-medium text-zinc-300 mb-2">No gigs yet</h3>
              <p className="text-zinc-500 text-sm">Create a gig to start building your setlist</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {gigs.map((gig) => (
                <button
                  key={gig.id}
                  id={`gig-card-${gig.id}`}
                  type="button"
                  onClick={() => navigate(`/gigs/${gig.id}`)}
                  className="card-hover text-left group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-zinc-100">{gig.name}</h3>
                    <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                  </div>
                  <div className="space-y-1.5 text-sm text-zinc-500">
                    <p className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(gig.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {gig.venue && (
                      <p className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {gig.venue}
                      </p>
                    )}
                    <p className="flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5" />
                      {gig._count?.songs ?? 0} songs
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
