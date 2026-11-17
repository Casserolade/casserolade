import type { MessageChat } from '#src/protocol/messages.ts';

/**
 * A line of chat the reader wrote: it carries their pseudo, which no one else has in the room. What the room says
 * itself (who comes in, who leaves) is nobody's.
 */
export function isOwnChatLine(line: MessageChat, pseudo: string): boolean {
  return !line.annonce && pseudo !== '' && line.pseudo === pseudo;
}
