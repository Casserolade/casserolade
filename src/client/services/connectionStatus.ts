/**
 * What a transport that can lose the network tells the game, on top of `Transport`:
 * `reconnecting` as soon as the connection drops (it keeps trying), `lost` once it has been
 * trying for a while (it still keeps trying), `open` when it is back.
 */
export type ConnectionStatus = 'open' | 'reconnecting' | 'lost';

export interface ConnectionWatch {
  onStatus(listener: (status: ConnectionStatus) => void): void;
  /** Try again now, without waiting for the next attempt. */
  retry(): void;
}
