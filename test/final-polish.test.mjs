import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getSupportedLocales } from '../public/js/i18n.mjs';

test('language switcher exposes the ten documented locales', () => {
  assert.deepEqual(getSupportedLocales(), [
    'zh-CN', 'zh-TW', 'en', 'es', 'pt', 'fr', 'de', 'ja', 'ko', 'tl'
  ]);
});

test('HTML includes prototype validation and a real visual asset', () => {
  const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

  assert.match(html, /data-admin-tab="prototypes"/);
  assert.match(html, /data-admin-panel="prototypes"/);
  assert.match(html, /<img[^>]+co_creation_share_poster/i);
});

test('live page no longer references obsolete monolithic assets', () => {
  const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

  assert.doesNotMatch(html, /(?:src|href)="\/?(?:app\.js|style\.css)"/);
});
