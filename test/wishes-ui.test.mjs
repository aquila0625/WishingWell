import test from 'node:test';
import assert from 'node:assert/strict';
import { filterAndSortWishes, wishStatusLabel, updateVoteState } from '../public/js/wishes.mjs';

test('filterAndSortWishes filters category and sorts votes descending', () => {
  const wishes = [
    { id: 1, category: '排班事工', votes: 2, created_at: 1 },
    { id: 2, category: '奉献财务', votes: 9, created_at: 2 },
    { id: 3, category: '排班事工', votes: 7, created_at: 3 }
  ];

  assert.deepEqual(
    filterAndSortWishes(wishes, { category: '排班事工', sort: 'votes' }).map((wish) => wish.id),
    [3, 1]
  );
  assert.deepEqual(
    filterAndSortWishes(wishes, { category: 'all', sort: 'date' }).map((wish) => wish.id),
    [3, 2, 1]
  );
});

test('wishStatusLabel maps product states to readable Chinese labels', () => {
  assert.equal(wishStatusLabel('voting'), '共创中');
  assert.equal(wishStatusLabel('accepted'), '已采纳');
  assert.equal(wishStatusLabel('merged'), '已合并');
  assert.equal(wishStatusLabel('unknown'), '处理中');
});

test('updateVoteState adds and removes the current user without mutation', () => {
  const wish = { votes: 1, voted_users: [2] };
  const added = updateVoteState(wish, 3);
  const removed = updateVoteState(added, 3);

  assert.deepEqual(added, { votes: 2, voted_users: [2, 3] });
  assert.deepEqual(removed, { votes: 1, voted_users: [2] });
  assert.deepEqual(wish, { votes: 1, voted_users: [2] });
});
