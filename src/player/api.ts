import type { PlayerApi } from './useHlsPlayer';

/**
 * Module-level handle to the live player controls, set by PlayerStage so the
 * global keyboard layer can drive playback without prop-drilling through the shell.
 */
export const playerApi: { current: PlayerApi | null } = { current: null };
