import type { OptionsSalon } from '#src/protocol/messages.ts';

/**
 * A room's settings once it is opened to the public under this name, or closed again (undefined): the other
 * settings stay as they are.
 */
export function withPublicName(options: OptionsSalon, publicName: string | undefined): OptionsSalon {
  const { nomPublic: _previous, ...others } = options;
  return publicName === undefined ? others : { ...others, nomPublic: publicName };
}
