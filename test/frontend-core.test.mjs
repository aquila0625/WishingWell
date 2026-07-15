import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createStore } from '../public/js/store.mjs';
import { formatApiError } from '../public/js/api-client.mjs';

test('store notifies subscribers with immutable state snapshots', () => {
  const store = createStore({ view: 'home' });
  let observed;
  store.subscribe((state) => { observed = state; });

  store.set({ view: 'wall' });

  assert.equal(observed.view, 'wall');
  assert.notEqual(observed, store.initialState);
  assert.equal(Object.isFrozen(observed), true);
});

test('API errors prefer server messages', () => {
  assert.equal(formatApiError({ error: '需要登录' }, 401), '需要登录');
  assert.equal(formatApiError({}, 500), '请求失败 (500)');
});

test('HTML provides the semantic app shell without inline styles', () => {
  const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

  for (const id of ['app-header', 'home-view', 'wall-view', 'quick-drawer', 'toast-root', 'admin-view']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.doesNotMatch(html, /\sstyle=/i);
  assert.match(html, /type="module" src="\/js\/app\.mjs"/);
});
