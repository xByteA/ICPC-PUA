import test from 'node:test';
import assert from 'node:assert/strict';
import { rankLeaderboard } from '../src/utils/leaderboard.js';

test('leaderboard assigns dense ranks for tied points with stable display ordering', () => {
  const ranked = rankLeaderboard([
    { name: 'Ari', points: 40, eventsAttended: 4, userId: 'user-a' },
    { name: 'Bea', points: 40, eventsAttended: 2, userId: 'user-b' },
    { name: 'Cy', points: 25, eventsAttended: 3, userId: 'user-c' },
    { name: 'Dee', points: 10, eventsAttended: 1, userId: 'user-d' },
  ]);

  assert.deepEqual(ranked.map(({ rank }) => rank), [1, 1, 2, 3]);
  assert.deepEqual(ranked.map(({ name }) => name), ['Ari', 'Bea', 'Cy', 'Dee']);
});

test('leaderboard returns no entries when no attendance points have been awarded', () => {
  assert.deepEqual(rankLeaderboard([]), []);
});
