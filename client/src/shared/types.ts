export interface User {
  id: string;
  username: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface BandMember {
  id: string;
  userId: string;
  bandId: string;
  role: "ADMIN" | "MEMBER";
  joinedAt: string;
  user: { id: string; username: string };
}

export interface Band {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  members: BandMember[];
  gigs?: Gig[];
  _count?: { gigs: number };
}

export interface Gig {
  id: string;
  name: string;
  date: string;
  venue: string | null;
  bandId: string;
  bandName?: string;
  createdAt: string;
  updatedAt: string;
  songs?: Song[];
  _count?: { songs: number };
}

export interface VoteRecord {
  userId: string;
  value: number;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  bpm: number | null;
  key: string | null;
  votes: number;
  setlistOrder: number | null;
  gigId: string;
  addedById: string;
  createdAt: string;
  updatedAt: string;
  addedBy: { id: string; username: string };
  voteRecords?: VoteRecord[];
}
