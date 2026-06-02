import { useEffect, useState, useCallback, useRef } from "react";
import { connectSocket, disconnectSocket } from "../lib/socket";
import { EVENTS } from "../shared/events";
import type { Gig, Song } from "../shared/types";
import type { Socket } from "socket.io-client";

interface OnlineUser {
  userId: string;
  username: string;
}

interface UseGigSocketReturn {
  gig: Gig | null;
  songs: Song[];
  onlineUsers: OnlineUser[];
  connected: boolean;
  loading: boolean;
  error: string;
  addSong: (data: { title: string; artist: string; bpm?: number; key?: string }) => void;
  removeSong: (songId: string) => void;
  voteSong: (songId: string, value: number) => void;
  updateSetlist: (songIds: string[]) => void;
  setSongs: React.Dispatch<React.SetStateAction<Song[]>>;
}

export function useGigSocket(gigId: string | undefined): UseGigSocketReturn {
  const [gig, setGig] = useState<Gig | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!gigId) return;

    const socket = connectSocket();
    socketRef.current = socket;

    const onConnect = () => {
      setConnected(true);
      socket.emit(EVENTS.JOIN_GIG, { gigId });
    };

    const onDisconnect = () => {
      setConnected(false);
    };

    const onGigState = (data: Gig) => {
      setGig(data);
      setSongs(data.songs || []);
      setLoading(false);
    };

    const onSongAdded = (song: Song) => {
      setSongs((prev) => {
        if (prev.some((s) => s.id === song.id)) return prev;
        return [...prev, song];
      });
    };

    const onSongRemoved = ({ id }: { id: string }) => {
      setSongs((prev) => prev.filter((s) => s.id !== id));
    };

    const onSongVoted = (song: Song) => {
      setSongs((prev) => prev.map((s) => (s.id === song.id ? song : s)));
    };

    const onSetlistUpdated = (updatedSongs: Song[]) => {
      setSongs(updatedSongs);
    };

    const onUserJoined = (user: OnlineUser) => {
      setOnlineUsers((prev) => {
        if (prev.some((u) => u.userId === user.userId)) return prev;
        return [...prev, user];
      });
    };

    const onUserLeft = (user: OnlineUser) => {
      setOnlineUsers((prev) => prev.filter((u) => u.userId !== user.userId));
    };

    const onError = (data: { message: string }) => {
      setError(data.message);
      setTimeout(() => setError(""), 5000);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on(EVENTS.GIG_STATE, onGigState);
    socket.on(EVENTS.SONG_ADDED, onSongAdded);
    socket.on(EVENTS.SONG_REMOVED, onSongRemoved);
    socket.on(EVENTS.SONG_VOTED, onSongVoted);
    socket.on(EVENTS.SETLIST_UPDATED, onSetlistUpdated);
    socket.on(EVENTS.USER_JOINED, onUserJoined);
    socket.on(EVENTS.USER_LEFT, onUserLeft);
    socket.on(EVENTS.ERROR, onError);

    if (socket.connected) {
      onConnect();
    }

    // Cleanup socket
    return () => {
      socket.emit(EVENTS.LEAVE_GIG);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off(EVENTS.GIG_STATE, onGigState);
      socket.off(EVENTS.SONG_ADDED, onSongAdded);
      socket.off(EVENTS.SONG_REMOVED, onSongRemoved);
      socket.off(EVENTS.SONG_VOTED, onSongVoted);
      socket.off(EVENTS.SETLIST_UPDATED, onSetlistUpdated);
      socket.off(EVENTS.USER_JOINED, onUserJoined);
      socket.off(EVENTS.USER_LEFT, onUserLeft);
      socket.off(EVENTS.ERROR, onError);
      disconnectSocket();
      socketRef.current = null;
    };
  }, [gigId]);

  const addSong = useCallback(
    (data: { title: string; artist: string; bpm?: number; key?: string }) => {
      socketRef.current?.emit(EVENTS.ADD_SONG, { gigId, ...data });
    },
    [gigId]
  );

  const removeSong = useCallback(
    (songId: string) => {
      socketRef.current?.emit(EVENTS.REMOVE_SONG, { songId });
    },
    []
  );

  const voteSong = useCallback(
    (songId: string, value: number) => {
      socketRef.current?.emit(EVENTS.VOTE_SONG, { songId, value, gigId });
    },
    [gigId]
  );

  const updateSetlist = useCallback(
    (songIds: string[]) => {
      socketRef.current?.emit(EVENTS.UPDATE_SETLIST, { gigId, songIds });
    },
    [gigId]
  );

  return {
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
  };
}
