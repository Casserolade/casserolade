import type { ClientMessage, ServerMessage } from './messages.ts';

/**
 * What the client needs from the network. WebSocket, WebTransport and the local solo
 * transport all implement it, so the game never knows which one it runs on.
 */
export interface Transport {
  send(message: ClientMessage): void;
  /** Only one listener: the connection belongs to one store. */
  onMessage(listener: (message: ServerMessage) => void): void;
  onClose(listener: () => void): void;
  close(): void;
}
