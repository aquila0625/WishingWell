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

test('share dialog and poster use the refined invitation copy', () => {
  const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const sharing = fs.readFileSync(new URL('../public/js/sharing.mjs', import.meta.url), 'utf8');

  assert.match(html, /data-i18n="share\.eyebrow">邀请更多人参与<\/span>/);
  assert.match(html, /id="share-title" data-i18n="share\.title">分享 ChurchOS（教会通）调研<\/h2>/);
  assert.match(html, /data-i18n="share\.copy">复制文案和链接/);
  assert.match(html, /下载邀请海报/);
  assert.match(sharing, /share\.poster\.title/);
  assert.match(sharing, /share\.poster\.prompt1/);
  assert.match(sharing, /share\.poster\.qrTitle/);
  assert.doesNotMatch(sharing, /全球教会管理 App 需求共创计划/);
  assert.doesNotMatch(sharing, /教牧排班与日历/);
});

test('wish wall invites broad participation around real needs', () => {
  const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

  assert.match(html, /ChurchOS 第一版需求共创/);
  assert.match(html, /<h1[^>]*data-i18n="wall\.title"[^>]*>真实需求共创墙<\/h1>/);
  assert.match(html, /这里收集来自教会生活、服侍协作和管理流程中的真实问题/);
  assert.match(html, /提出一个新需求，还是为别人的建议表达同感、补充经历/);
  assert.doesNotMatch(html, /<h1>需求许愿墙<\/h1>/);
});

test('wish wall sort menu is anchored below its trigger', () => {
  const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../public/styles/pages.css', import.meta.url), 'utf8');
  const wishes = fs.readFileSync(new URL('../public/js/wishes.mjs', import.meta.url), 'utf8');

  assert.match(html, /id="wish-sort-button"[^>]+aria-controls="wish-sort-menu"/);
  assert.match(html, /id="wish-sort-menu"[^>]+hidden/);
  assert.doesNotMatch(html, /id="wish-sort"[^>]*<option/);
  assert.match(css, /\.sort-menu\s*\{[^}]*position:\s*relative/s);
  assert.match(css, /\.sort-options\s*\{[^}]*position:\s*absolute[^}]*top:\s*calc\(100% \+ 8px\)/s);
  assert.match(wishes, /wishSortButton\.setAttribute\('aria-expanded'/);
});

test('wish creation form guides real-problem submissions with recording controls', () => {
  const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const wishes = fs.readFileSync(new URL('../public/js/wishes.mjs', import.meta.url), 'utf8');

  assert.match(html, /data-i18n="wishForm\.eyebrow">分享一个真实问题<\/span>/);
  assert.match(html, /id="wish-form-title" data-i18n="wishForm\.title">提交需求与场景<\/h2>/);
  assert.match(html, /data-i18n="wishForm\.description">不需要写成完整方案/);
  assert.match(html, /data-i18n="wishForm\.categoryLabel">问题分类/);
  assert.match(html, /data-i18n="wishForm\.titleLabel">简短标题/);
  assert.match(html, /data-i18n="wishForm\.contentLabel">问题描述/);
  assert.match(html, /id="wish-category-hint"[^>]*data-i18n="wishForm\.categoryHint"/);
  assert.match(html, /data-i18n-placeholder="wishForm\.titlePlaceholder"/);
  assert.match(html, /id="wish-content-hint"[^>]*data-i18n="wishForm\.contentHint"/);
  assert.match(html, /id="audio-record-start"/);
  assert.match(html, /id="audio-record-stop"/);
  assert.match(html, /data-i18n="wishForm\.audioHint"/);
  assert.doesNotMatch(html, /id="audio-input"/);
  assert.match(wishes, /new MediaRecorder/);
  assert.match(wishes, /audioBlob/);
  assert.match(wishes, /audioRecordStart/);
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

test('admin homepage tools expose campaign deadline settings', () => {
  const admin = fs.readFileSync(new URL('../public/js/admin.mjs', import.meta.url), 'utf8');

  assert.match(admin, /需求征集截止时间/);
  assert.match(admin, /datetime-local/);
  assert.match(admin, /\/api\/admin\/campaign/);
  assert.match(admin, /重新设置未来时间后，普通用户可再次提交、助力和评论/);
  assert.match(admin, /立即截止，进入只读/);
  assert.match(admin, /重新开放征集/);
  assert.doesNotMatch(admin, /关闭截止限制/);
});

test('admin requirements list exposes moderation visibility controls', () => {
  const admin = fs.readFileSync(new URL('../public/js/admin.mjs', import.meta.url), 'utf8');

  assert.match(admin, /屏蔽展示/);
  assert.match(admin, /恢复展示/);
  assert.match(admin, /已屏蔽展示，前台不再显示该需求/);
  assert.match(admin, /status:\s*hidden \? 'voting' : 'hidden'/);
});

test('wish wall presents read-only mode after campaign deadline', () => {
  const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const wishes = fs.readFileSync(new URL('../public/js/wishes.mjs', import.meta.url), 'utf8');

  assert.match(html, /id="readonly-campaign-notice"/);
  assert.match(wishes, /function campaignIsClosed/);
  assert.match(wishes, /readonly-campaign-notice/);
  assert.match(wishes, /本阶段需求征集已截止，您仍可查看已有需求/);
  assert.match(wishes, /aria-disabled/);
  assert.doesNotMatch(wishes, /button\.disabled = closed/);
  assert.doesNotMatch(wishes, /vote\.disabled = campaignIsClosed\(\)/);
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
