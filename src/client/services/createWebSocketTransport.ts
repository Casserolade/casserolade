import type { ClientMessage, ServerMessage } from '#src/protocol/messages.ts';
import type { Transport } from '#src/protocol/transport.ts';
import type { ConnectionStatus, ConnectionWatch } from '#src/client/services/connectionStatus.ts';
import { reconnectDelay } from '#src/client/tools/reconnectDelay.ts';

const TOKEN_KEY = 'plateau.jeton';
/**
 * Failed attempts before the game says the connection is lost (about 15 s: 0.5 + 1 + 2 + 4 + 8).
 * It keeps trying after that, every few seconds: the server holds the seat, a bot plays it meanwhile.
 */
const LOST_AFTER_ATTEMPTS = 5;

export interface SocketLike {
  readonly readyState: number;
  onopen: ((event: never) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: ((event: never) => void) | null;
  send(text: string): void;
  close(): void;
}

export interface TokenStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface WebSocketTransportOptions {
  /** Defaults to /ws on the page's own host. */
  url?: string;
  createSocket?: (url: string) => SocketLike;
  /** Keeps the seat's token across a page reload. */
  storage?: TokenStorage;
}

function pageSocketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

function readToken(storage: TokenStorage | null): string | null {
  try {
    return storage?.getItem(TOKEN_KEY) ?? null;
  } catch {
    return null;
  }
}

function writeToken(storage: TokenStorage | null, token: string | null): void {
  try {
    if (token) storage?.setItem(TOKEN_KEY, token);
    else storage?.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error('Could not store the seat token', error);
  }
}

/**
 * The online transport. A lost connection is retried, and the seat is taken back with its
 * token: the game above only sees messages, then a fresh view of the game. It says at once that
 * the connection dropped, and never gives up by itself: only the player leaves.
 */
class WebSocketTransport implements Transport, ConnectionWatch {
  private readonly url: string;
  private readonly createSocket: (url: string) => SocketLike;
  private readonly storage: TokenStorage | null;
  private readonly queue: ClientMessage[] = [];
  private socket: SocketLike | null = null;
  private token: string | null;
  private attempts = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private closedOnPurpose = false;
  private status: ConnectionStatus = 'open';
  private listener: (message: ServerMessage) => void = () => {};
  private closeListener: () => void = () => {};
  private statusListener: (status: ConnectionStatus) => void = () => {};

  constructor({ url, createSocket, storage }: WebSocketTransportOptions) {
    this.url = url ?? pageSocketUrl();
    this.createSocket = createSocket ?? ((target) => new WebSocket(target) as unknown as SocketLike);
    this.storage = storage ?? (typeof sessionStorage === 'undefined' ? null : sessionStorage);
    this.token = readToken(this.storage);
    this.connect();
  }

  send(message: ClientMessage): void {
    // Entering the queue leaves the room too: its seat is no longer ours to take back.
    if (message.type === 'quitter' || message.type === 'file_rejoindre') this.setToken(null);
    if (this.socket?.readyState === 1) this.socket.send(JSON.stringify(message));
    else this.queue.push(message);
  }

  onMessage(listener: (message: ServerMessage) => void): void {
    this.listener = listener;
  }

  onClose(listener: () => void): void {
    this.closeListener = listener;
  }

  onStatus(listener: (status: ConnectionStatus) => void): void {
    this.statusListener = listener;
  }

  /** The player asks to try again now: the next attempt does not wait for its delay. */
  retry(): void {
    if (this.closedOnPurpose || this.socket?.readyState === 0 || this.socket?.readyState === 1) return;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.connect();
  }

  close(): void {
    this.closedOnPurpose = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.socket?.close();
  }

  private setStatus(status: ConnectionStatus): void {
    if (status === this.status) return;
    this.status = status;
    this.statusListener(status);
  }

  private connect(): void {
    const socket = this.createSocket(this.url);
    this.socket = socket;
    socket.onopen = () => this.handleOpen(socket);
    socket.onmessage = (event) => this.handleMessage(event.data);
    socket.onclose = () => this.handleClose();
  }

  private handleOpen(socket: SocketLike): void {
    this.attempts = 0;
    this.setStatus('open');
    if (this.token) socket.send(JSON.stringify({ type: 'reprendre', jeton: this.token } satisfies ClientMessage));
    for (const message of this.queue.splice(0)) socket.send(JSON.stringify(message));
  }

  private handleMessage(data: unknown): void {
    const message = JSON.parse(String(data)) as ServerMessage;
    if (message.type === 'salon') this.setToken(message.jeton);
    this.listener(message);
  }

  private handleClose(): void {
    if (this.closedOnPurpose) {
      this.closeListener();
      return;
    }
    this.setStatus(this.attempts >= LOST_AFTER_ATTEMPTS ? 'lost' : 'reconnecting');
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.connect();
    }, reconnectDelay(this.attempts));
    this.attempts++;
  }

  private setToken(token: string | null): void {
    this.token = token;
    writeToken(this.storage, token);
  }
}

export function createWebSocketTransport(options: WebSocketTransportOptions = {}): Transport & ConnectionWatch {
  return new WebSocketTransport(options);
}
