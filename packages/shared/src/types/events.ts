// WebSocket events sent from the API to the web portal
export type WebSocketEventType =
  | 'settings:updated'
  | 'moderation:action'
  | 'member:join'
  | 'member:leave'
  | 'message:delete'
  | 'message:edit'
  | 'level:up'
  | 'addon:installed'
  | 'addon:removed'
  | 'bot:stats'
  | 'guild:stats'
  | 'automod:action'
  | 'log:entry';

export interface WebSocketEvent<T = unknown> {
  type: WebSocketEventType;
  guildId?: string;
  data: T;
  timestamp: number;
}

// Internal event bus events (bot <-> api)
export type InternalEventType =
  | 'settings:reload'
  | 'addon:reload'
  | 'guild:joined'
  | 'guild:left';

export interface InternalEvent<T = unknown> {
  type: InternalEventType;
  data: T;
}
