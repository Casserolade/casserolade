import type { Carriere } from '#src/data/histoire/carriere.ts';

/** Every career written so far (src/data/histoire/carrieres), read at build time. */
const FILES = import.meta.glob('../../data/histoire/carrieres/*.ts', { eager: true }) as Record<string, { carriere?: Carriere }>;

export const WRITTEN_CAREERS: Carriere[] = Object.values(FILES).flatMap((file) => (file.carriere ? [file.carriere] : []));
