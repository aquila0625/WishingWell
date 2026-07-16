import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getSupportedLocales } from '../public/js/i18n.mjs';

test('language switcher exposes the four launch locales', () => {
  const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

  assert.deepEqual(getSupportedLocales(), ['zh-CN', 'zh-TW', 'en', 'es']);
  assert.match(html, /data-locale="zh-CN"/);
  assert.match(html, /data-locale="zh-TW"/);
  assert.match(html, /data-locale="en"/);
  assert.match(html, /data-locale="es"/);
  assert.doesNotMatch(html, /data-locale="pt"/);
  assert.doesNotMatch(html, /data-locale="fr"/);
});

test('HTML includes concise administrator console tabs', () => {
  const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

  assert.match(html, /data-admin-tab="requirements"/);
  assert.match(html, /data-admin-tab="users"/);
  assert.match(html, /data-admin-tab="homepage"/);
  assert.match(html, /data-admin-tab="emails"/);
  assert.doesNotMatch(html, /data-admin-tab="prototypes"/);
});

test('home acknowledgement section omits personal examples and poster previews', () => {
  const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

  assert.doesNotMatch(html, /Aquila Wang/);
  assert.doesNotMatch(html, /share-poster-preview/);
  assert.doesNotMatch(html, /co_creation_share_poster/);
});

test('live page no longer references obsolete monolithic assets', () => {
  const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

  assert.doesNotMatch(html, /(?:src|href)="\/?(?:app\.js|style\.css)"/);
});

test('home page presents the revised co-creation invitation', () => {
  const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

  assert.match(html, /ChurchOS 教会通 APP · 早期需求共创计划/);
  assert.match(html, /<h1[^>]*data-i18n="hero\.title"[^>]*>ChurchOS 教会通 APP<\/h1>/);
  assert.match(html, /一款正在筹备中的教会数字化管理与服侍协作 APP/);
  assert.match(html, /ChurchOS 第一版做什么，由您和一线同工共同决定/);
  assert.match(html, /为其他同工的建议点赞、评论并补充实际场景，让需求获得更完整的依据。/);
  assert.doesNotMatch(html, /为其他堂会的建议点赞/);
  assert.match(html, /<span[^>]*data-i18n="stats\.participants"[^>]*>参与调研<\/span>/);
  assert.match(html, /<span[^>]*data-i18n="stats\.needs"[^>]*>真实需求<\/span>/);
  assert.match(html, /<span[^>]*data-i18n="stats\.planned"[^>]*>进入规划<\/span>/);
  assert.match(html, /id="pain-points"/);
  assert.match(html, /id="co-creation-path"/);
  assert.match(html, /id="home-final-cta"/);
});

test('home final share action uses the shared dialog binding', () => {
  const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const sharing = fs.readFileSync(new URL('../public/js/sharing.mjs', import.meta.url), 'utf8');

  assert.match(html, /id="home-final-share-button"[^>]+data-open-share/);
  assert.match(sharing, /querySelectorAll\('\[data-open-share\]'\)/);
});

test('hero removes duplicate actions without breaking optional shell bindings', () => {
  const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const app = fs.readFileSync(new URL('../public/js/app.mjs', import.meta.url), 'utf8');

  assert.doesNotMatch(html, /id="hero-join-button"/);
  assert.doesNotMatch(html, /id="hero-wall-button"/);
  assert.match(app, /getElementById\('hero-wall-button'\)\?\.addEventListener/);
  assert.match(app, /getElementById\(id\)\?\.addEventListener/);
});

test('ministry and co-creation items align icons with their headings', () => {
  const css = fs.readFileSync(new URL('../public/styles/pages.css', import.meta.url), 'utf8');

  assert.match(css, /\.ministry-grid article \{[^}]*grid-template-columns: auto minmax\(0, 1fr\)/s);
  assert.match(css, /\.co-creation-steps article \{[^}]*grid-template-columns: auto minmax\(0, 1fr\)/s);
});
