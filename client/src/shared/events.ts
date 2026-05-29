export const EVENTS = {
  JOIN_GIG: "gig:join",
  LEAVE_GIG: "gig:leave",
  ADD_SONG: "song:add",
  REMOVE_SONG: "song:remove",
  VOTE_SONG: "song:vote",
  UPDATE_SETLIST: "setlist:update",

  SONG_ADDED: "song:added",
  SONG_REMOVED: "song:removed",
  SONG_VOTED: "song:voted",
  SETLIST_UPDATED: "setlist:updated",
  USER_JOINED: "user:joined",
  USER_LEFT: "user:left",
  GIG_STATE: "gig:state",
  ERROR: "error",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
