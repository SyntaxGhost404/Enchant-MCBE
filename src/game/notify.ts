/**
 * Player messages. Text comes from the resource pack's language files, so it can be translated.
 */

import type { Player, RawMessage } from '@minecraft/server';

export const tr = (key: string, ...args: (string | RawMessage)[]): RawMessage =>
  args.length === 0
    ? { translate: key }
    : { translate: key, with: { rawtext: args.map((a) => (typeof a === 'string' ? { text: a } : a)) } };

export function actionBar(player: Player, message: RawMessage): void {
  try {
    if (player.isValid) player.onScreenDisplay.setActionBar(message);
  } catch {
    // The player left; nothing to show.
  }
}

export function chat(player: Player, message: RawMessage): void {
  try {
    if (player.isValid) player.sendMessage(message);
  } catch {
    // The player left; nothing to show.
  }
}

export function warn(where: string, error: unknown): void {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.warn(`[Vein Miner & Ore Smelter] ${where}: ${text}`);
}
