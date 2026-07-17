import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getSupportedLocales } from '../public/js/i18n.mjs';

test('language switcher exposes the built-in homepage locales', () => {
  const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

  assert.deepEqual(getSupportedLocales(), ['zh-CN', 'zh-TW', 'en', 'es', 'ko', 'fr']);
  assert.match(html, /data-locale="zh-CN"/);
  assert.match(html, /data-locale="zh-TW"/);
  assert.match(html, /data-locale="en"/);
  assert.match(html, /data-locale="es"/);
  assert.match(html, /data-locale="ko"/);
  assert.match(html, /data-locale="fr"/);
  assert.doesNotMatch(html, /data-locale="pt"/);
  assert.doesNotMatch(html, /data-locale="de"/);
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
  const i18n = fs.readFileSync(new URL('../public/js/i18n.mjs', import.meta.url), 'utf8');

  assert.match(html, /ChurchOS（教会通）APP · 第一版产品需求调研/);
  assert.match(html, /<h1[^>]*data-i18n="hero\.title"[^>]*>ChurchOS（教会通）APP<\/h1>/);
  assert.match(html, /不是凭想象设计，而是从教会现场的问题中长出来/);
  assert.match(html, /第一版 ChurchOS 做什么，由真实需要共同决定/);
  assert.match(html, /其他用户可以点赞、评论、补充类似场景，让一个需求背后有更完整的真实依据。/);
  assert.match(html, /被采纳的建议，将被永久记录与致谢/);
  assert.match(html, /邀请朋友参与/);
  assert.doesNotMatch(html, /为其他堂会的建议点赞/);
  assert.match(html, /<span[^>]*data-i18n="stats\.participants"[^>]*>参与调研<\/span>/);
  assert.match(html, /<span[^>]*data-i18n="stats\.needs"[^>]*>真实需求<\/span>/);
  assert.match(html, /<span[^>]*data-i18n="stats\.planned"[^>]*>进入规划<\/span>/);
  assert.match(html, /id="survey-participant-callout"/);
  assert.match(html, /data-stat="participants"/);
  assert.match(html, /data-stat="requirements"/);
  assert.match(html, /data-stat="planned"/);
  assert.match(html, /id="pain-points"/);
  assert.match(html, /id="co-creation-path"/);
  assert.match(html, /id="home-final-cta"/);
  assert.doesNotMatch(html, /亲爱的教牧同工/);
  assert.doesNotMatch(html, /data-i18n="pain\.greeting"/);
  assert.doesNotMatch(i18n, /'pain\.greeting'/);
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

test('notification badge is anchored to the bell button', () => {
  const css = fs.readFileSync(new URL('../public/styles/components.css', import.meta.url), 'utf8');

  assert.match(css, /#notification-button\s*\{[^}]*position:\s*relative/s);
  assert.match(css, /\.notification-badge\s*\{[^}]*position:\s*absolute/s);
});

test('admin homepage tools expose draft publish and one-time cleanup actions', () => {
  const admin = fs.readFileSync(new URL('../public/js/admin.mjs', import.meta.url), 'utf8');

  assert.match(admin, /保存草稿/);
  assert.match(admin, /预览草稿/);
  assert.match(admin, /草稿预览中/);
  assert.match(admin, /返回后台继续编辑/);
  assert.match(admin, /退出预览/);
  assert.match(admin, /发布到正式首页/);
  assert.match(admin, /首次上线清空测试数据/);
  assert.match(admin, /确认首次上线清空/);
});

test('staging environment badge is rendered only from environment metadata', () => {
  const app = fs.readFileSync(new URL('../public/js/app.mjs', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../public/styles/components.css', import.meta.url), 'utf8');

  assert.match(app, /\/api\/environment/);
  assert.match(app, /environment-badge/);
  assert.match(app, /测试环境/);
  assert.doesNotMatch(app, /STAGING/);
  assert.match(app, /querySelector\('\.header-actions'\)/);
  assert.doesNotMatch(app, /document\.body\.append\(badge\)/);
  assert.match(css, /\.environment-badge\s*\{[^}]*position:\s*absolute/);
  assert.match(css, /opacity:\s*0\.5/);
  assert.match(css, /\.environment-badge::before/);
  assert.match(css, /\.environment-badge::after/);
  assert.match(css, /clip-path:\s*polygon\(/);
  assert.match(css, /top:\s*0/);
  assert.match(css, /right:\s*0/);
});
