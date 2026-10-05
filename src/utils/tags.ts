export const tags = {
  type: ['@smoke', '@regression'],
  scope: ['@wallpapers', '@ringtones', '@notification-sounds'],
  bug: [/^@BUG:[A-Z]+-\d+$/],
  // A test under flaky investigation; the Jira key is mandatory and the fix PR removes the tag.
  flaky: [/^@FLAKY:[A-Z]+-\d+$/],
  misc: ['@guest', '@download'],
} as const;

export type Tag = (typeof tags)[keyof typeof tags][number];
