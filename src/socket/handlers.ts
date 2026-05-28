import { Server, Socket } from "socket.io";
import { Effect } from "effect";
import { EVENTS } from "../shared/events";
import * as SongService from "../services/song.service";
import * as GigService from "../services/gig.service";
import { AppError } from "../shared/errors";

/** Tracks which gig room each socket is currently in */
const socketRooms = new Map<string, string>();

/** Formats a gig ID into a Socket.io room name */
function gigRoom(gigId: string): string {
  return `gig:${gigId}`;
}

/** Runs an Effect and either calls onSuccess or emits an error to the socket */
async function runSocketEffect<A>(
  socket: Socket,
  effect: Effect.Effect<A, AppError>,
  onSuccess: (data: A) => void
): Promise<void> {
  const handled = effect.pipe(
    Effect.map(onSuccess),
    Effect.catchAll((error) => {
      socket.emit(EVENTS.ERROR, { message: error.message });
      return Effect.void;
    })
  );

  try {
    await Effect.runPromise(handled);
  } catch {
    socket.emit(EVENTS.ERROR, { message: "Internal server error" });
  }
}

/** Registers all event handlers for a connected socket */
export function registerSocketHandlers(io: Server, socket: Socket): void {
  const { userId, username } = socket.user;

  socket.on(EVENTS.JOIN_GIG, async (data: { gigId: string }) => {
    const { gigId } = data;
    if (!gigId || typeof gigId !== "string") {
      socket.emit(EVENTS.ERROR, { message: "gigId is required" });
      return;
    }

    // Leave any previous gig room
    const previousRoom = socketRooms.get(socket.id);
    if (previousRoom) {
      socket.leave(previousRoom);
      io.to(previousRoom).emit(EVENTS.USER_LEFT, { userId, username });
    }

    // Verify membership and fetch gig state
    await runSocketEffect(
      socket,
      GigService.getGigById(gigId, userId),
      (gig) => {
        const room = gigRoom(gigId);
        socket.join(room);
        socketRooms.set(socket.id, room);

        // Send full gig state to the joining client
        socket.emit(EVENTS.GIG_STATE, gig);

        // Notify others in the room
        socket.to(room).emit(EVENTS.USER_JOINED, { userId, username });
      }
    );
  });

  socket.on(EVENTS.LEAVE_GIG, () => {
    const room = socketRooms.get(socket.id);
    if (room) {
      socket.leave(room);
      socketRooms.delete(socket.id);
      io.to(room).emit(EVENTS.USER_LEFT, { userId, username });
    }
  });

  socket.on(EVENTS.ADD_SONG, async (data: {
    gigId: string;
    title: string;
    artist: string;
    bpm?: number;
    key?: string;
  }) => {
    const { gigId, title, artist, bpm, key } = data;

    if (!gigId || !title || !artist) {
      socket.emit(EVENTS.ERROR, { message: "gigId, title, and artist are required" });
      return;
    }

    await runSocketEffect(
      socket,
      SongService.addSong(gigId, title.trim(), artist.trim(), userId, bpm, key),
      (song) => {
        // Broadcast to all clients in the room including the sender
        io.to(gigRoom(gigId)).emit(EVENTS.SONG_ADDED, song);
      }
    );
  });

  socket.on(EVENTS.REMOVE_SONG, async (data: { songId: string }) => {
    const { songId } = data;

    if (!songId) {
      socket.emit(EVENTS.ERROR, { message: "songId is required" });
      return;
    }

    await runSocketEffect(
      socket,
      SongService.removeSong(songId, userId),
      (result) => {
        io.to(gigRoom(result.gigId)).emit(EVENTS.SONG_REMOVED, { id: result.id });
      }
    );
  });

  socket.on(EVENTS.VOTE_SONG, async (data: { songId: string; value: number; gigId: string }) => {
    const { songId, value, gigId } = data;

    if (!songId || (value !== 1 && value !== -1) || !gigId) {
      socket.emit(EVENTS.ERROR, { message: "songId, gigId, and value (1 or -1) are required" });
      return;
    }

    await runSocketEffect(
      socket,
      SongService.voteSong(songId, userId, value),
      (song) => {
        io.to(gigRoom(gigId)).emit(EVENTS.SONG_VOTED, song);
      }
    );
  });

  socket.on(EVENTS.UPDATE_SETLIST, async (data: { gigId: string; songIds: string[] }) => {
    const { gigId, songIds } = data;

    if (!gigId || !Array.isArray(songIds)) {
      socket.emit(EVENTS.ERROR, { message: "gigId and songIds array are required" });
      return;
    }

    await runSocketEffect(
      socket,
      SongService.updateSetlistOrder(gigId, songIds, userId),
      (songs) => {
        io.to(gigRoom(gigId)).emit(EVENTS.SETLIST_UPDATED, songs);
      }
    );
  });

  socket.on("disconnect", () => {
    const room = socketRooms.get(socket.id);
    if (room) {
      socketRooms.delete(socket.id);
      io.to(room).emit(EVENTS.USER_LEFT, { userId, username });
    }
  });
}
