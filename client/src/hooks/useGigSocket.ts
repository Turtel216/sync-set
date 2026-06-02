import { useEffect, useCallback, useRef, useReducer } from "react";
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

type SocketState = {
  gig: Gig | null;
  songs: Song[];
  onlineUsers: OnlineUser[];
  connected: boolean;
  loading: boolean;
  error: string;
};

type SocketAction =
  | { type: "CONNECT"; gigId: string }
  | { type: "DISCONNECT" }
  | { type: "GIG_STATE"; gig: Gig }
  | { type: "SONG_ADDED"; song: Song }
  | { type: "SONG_REMOVED"; id: string }
  | { type: "SONG_VOTED"; song: Song }
  | { type: "SETLIST_UPDATED"; songs: Song[] }
  | { type: "USER_JOINED"; user: OnlineUser }
  | { type: "USER_LEFT"; userId: string }
  | { type: "ERROR"; message: string }
  | { type: "CLEAR_ERROR" }
  | { type: "SET_SONGS"; updater: (prev: Song[]) => Song[] };

const initialState: SocketState = {
  gig: null,
  songs: [],
  onlineUsers: [],
  connected: false,
  loading: true,
  error: "",
};

function reducer(state: SocketState, action: SocketAction): SocketState {
  switch (action.type) {
    case "CONNECT":
      return { ...state, connected: true };
    case "DISCONNECT":
      return { ...state, connected: false };

    case "GIG_STATE":
      return {
        ...state,
        gig: action.gig,
        songs: action.gig.songs || [],
        loading: false,
      };

    case "SONG_ADDED":
      if (state.songs.some((s) => s.id === action.song.id)) return state;
      return { ...state, songs: [...state.songs, action.song] };

    case "SONG_REMOVED":
      return { ...state, songs: state.songs.filter((s) => s.id !== action.id) };

    case "SONG_VOTED":
      return {
        ...state,
        songs: state.songs.map((s) => (s.id === action.song.id ? action.song : s)),
      };

    case "SETLIST_UPDATED":
      return { ...state, songs: action.songs };

    case "USER_JOINED":
      if (state.onlineUsers.some((u) => u.userId === action.user.userId)) return state;
      return { ...state, onlineUsers: [...state.onlineUsers, action.user] };

    case "USER_LEFT":
      return {
        ...state,
        onlineUsers: state.onlineUsers.filter((u) => u.userId !== action.userId),
      };

    case "ERROR":
      return { ...state, error: action.message };

    case "CLEAR_ERROR":
      return { ...state, error: "" };

    case "SET_SONGS":
      return { ...state, songs: action.updater(state.songs) };

    default:
      return state;
  }
}

export function useGigSocket(gigId: string | undefined): UseGigSocketReturn {
  const [state, dispatch] = useReducer(reducer, initialState);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!gigId) return;

    const socket = connectSocket();
    socketRef.current = socket;

    const onConnect = () => {
      dispatch({ type: "CONNECT", gigId });
      socket.emit(EVENTS.JOIN_GIG, { gigId });
    };

    const onDisconnect = () => {
      dispatch({ type: "DISCONNECT" });
    };

    const onGigState = (data: Gig) => {
      // single state transition for gig + songs + loading
      dispatch({ type: "GIG_STATE", gig: data });
    };

    const onSongAdded = (song: Song) => dispatch({ type: "SONG_ADDED", song });
    const onSongRemoved = ({ id }: { id: string }) => dispatch({ type: "SONG_REMOVED", id });
    const onSongVoted = (song: Song) => dispatch({ type: "SONG_VOTED", song });
    const onSetlistUpdated = (updatedSongs: Song[]) =>
      dispatch({ type: "SETLIST_UPDATED", songs: updatedSongs });

    const onUserJoined = (user: OnlineUser) => dispatch({ type: "USER_JOINED", user });
    const onUserLeft = (user: OnlineUser) => dispatch({ type: "USER_LEFT", userId: user.userId });

    let clearErrorTimer: ReturnType<typeof setTimeout> | undefined;

    const onError = (data: { message: string }) => {
      dispatch({ type: "ERROR", message: data.message });
      if (clearErrorTimer) clearTimeout(clearErrorTimer);
      clearErrorTimer = setTimeout(() => dispatch({ type: "CLEAR_ERROR" }), 5000);
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

    if (socket.connected) onConnect();

    return () => {
      if (clearErrorTimer) clearTimeout(clearErrorTimer);

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

  // keep API compatibility: expose setSongs as a dispatcher-backed setter
  const setSongs: React.Dispatch<React.SetStateAction<Song[]>> = useCallback((value) => {
    if (typeof value === "function") {
      dispatch({ type: "SET_SONGS", updater: value as (prev: Song[]) => Song[] });
    } else {
      dispatch({ type: "SETLIST_UPDATED", songs: value });
    }
  }, []);

  const addSong = useCallback(
    (data: { title: string; artist: string; bpm?: number; key?: string }) => {
      socketRef.current?.emit(EVENTS.ADD_SONG, { gigId, ...data });
    },
    [gigId]
  );

  const removeSong = useCallback((songId: string) => {
    socketRef.current?.emit(EVENTS.REMOVE_SONG, { songId });
  }, []);

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
    gig: state.gig,
    songs: state.songs,
    onlineUsers: state.onlineUsers,
    connected: state.connected,
    loading: state.loading,
    error: state.error,
    addSong,
    removeSong,
    voteSong,
    updateSetlist,
    setSongs,
  };
}
