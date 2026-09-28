export const tags = {
  type: ['@smoke', '@regression'],
  scope: ['@wallpapers', '@ringtones', '@notification-sounds'],
  bug: ['@bug'],
  misc: ['@guest', '@download'],
} as const;

export type Tag = (typeof tags)[keyof typeof tags][number];
