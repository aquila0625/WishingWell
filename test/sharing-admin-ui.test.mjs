import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPosterModel } from '../public/js/sharing.mjs';
import { notificationSummary } from '../public/js/notifications.mjs';

test('poster model uses the current URL and campaign title', () => {
  assert.deepEqual(
    buildPosterModel({ url: 'https://example.test/well' }),
    {
      url: 'https://example.test/well',
      brand: 'ChurchOS',
      product: '教会通 APP',
      title: '一起决定 ChurchOS 第一版先做什么',
      subtitle: '在正式开发前，我们正在收集教会现场的真实问题与需要。',
      prompts: ['不需要技术背景', '不需要完整方案', '只要说出您真实遇到的问题'],
      audience: '教会领袖 · 服侍同工 · 弟兄姊妹 · 慕道朋友',
      qrTitle: '扫码参与调研',
      qrSubtitle: '提交真实问题，帮助 ChurchOS 更贴近教会现场'
    }
  );
});

test('notification summary counts unread items only', () => {
  assert.deepEqual(
    notificationSummary([{ read: false }, { read: true }, { read: false }]),
    { total: 3, unread: 2 }
  );
});
