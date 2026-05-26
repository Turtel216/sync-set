/** WebSocket event names shared between frontend and backend */
export const EVENTS = {
  SONG_ADDED: "song:added",
  SONG_REMOVED: "song:removed",
  SONG_VOTED: "song:voted",
  SETLIST_UPDATED: "setlist:updated",
  USER_JOINED: "user:joined",
  USER_LEFT: "user:left",
  GIG_UPDATED: "gig:updated",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
